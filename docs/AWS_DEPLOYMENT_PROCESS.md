# QC Certification CRM — AWS Deployment Process (End to End)

A complete, in-order walkthrough of how this project is deployed to **AWS**: containerize →
push images to **ECR** → run on a single **EC2** VM with **docker-compose** → automate with
**GitHub Actions** → add a domain and **HTTPS**. The app keeps using **MongoDB Atlas**
(managed DB) and **AWS S3** (file storage), so no database server is provisioned.

> Companion runbooks already in the repo: [DEPLOYMENT.md](../DEPLOYMENT.md) and
> [DEPLOY_STEPS.md](../DEPLOY_STEPS.md). This document is the consolidated narrative.

---

## 0. Project facts

| Thing            | Value                                                          |
|------------------|----------------------------------------------------------------|
| Frontend         | React (CRA) → static build, served by **nginx**                |
| Backend          | Node/Express on port **5000**                                  |
| Database         | **MongoDB Atlas** (external, managed) — no RDS, no DB container |
| File storage     | **AWS S3** — bucket `iso-crm-qcc`, region `ap-south-1`          |
| Region           | `ap-south-1` (Mumbai)                                          |
| Live branch      | `master` (the repo has no `main` — CI must trigger on `master`)|
| Container images | **AWS ECR** (private registry)                                 |
| Compute          | **AWS EC2** (Ubuntu) running docker-compose                    |
| CI/CD            | **GitHub Actions**                                            |
| TLS / domain     | **Caddy** (auto Let's Encrypt) — `docker-compose.prod.yml`     |

### Why this topology?

- **EC2 + docker-compose** is the cheapest way to run just two containers; **ECS/EKS** would
  be over-engineering at this scale (revisit when you need auto-scaling — see
  [ARCHITECTURE.md §3](./ARCHITECTURE.md)).
- **ECR** is a private "Docker Hub inside your AWS account": CI **pushes** images, EC2 **pulls** them.
- **nginx reverse-proxies `/api`** to the backend, so frontend + backend are **same-origin** —
  this removes CORS and the CRA build-time API-URL problem.
- The DB and files stay **external and managed**, so the EC2 box is disposable/replaceable.

---

## Phase 0 — Fix AWS permissions & secrets first

1. Sign in as **root** or an **admin IAM user** — *not* a narrowly-scoped user like
   `frontend_user` (an S3-only user will hit "API Error" on every EC2 call).
2. **Rotate any exposed access keys** (IAM → Users → Security credentials → deactivate &
   delete old key → create new).
3. Confirm the S3 bucket `iso-crm-qcc` exists in `ap-south-1` with **Block all public
   access ON** (the app uses presigned URLs, never public objects).

---

## Phase 1 — Containerize and test locally

Five files make the app run as containers. These already exist in the repo
([backend/Dockerfile](../backend/Dockerfile), [frontend/Dockerfile](../frontend/Dockerfile),
[frontend/nginx.conf](../frontend/nginx.conf), [docker-compose.yml](../docker-compose.yml)).

**`backend/Dockerfile`**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

**`frontend/Dockerfile`** (multi-stage: build with Node, serve with nginx)
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
```

**`frontend/nginx.conf`** — serves the SPA and proxies the API (same-origin):
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri /index.html; }      # React Router fallback
  location /api/     { proxy_pass http://backend:5000; proxy_set_header Host $host; }
  location /uploads/ { proxy_pass http://backend:5000; }
}
```

**`docker-compose.yml`** (repo root) — note: **no database service** (Atlas is external):
```yaml
services:
  backend:
    image: ${ECR_REGISTRY}/iso-crm-backend:latest   # local test: build: ./backend
    restart: always
    env_file: ./backend/.env
    expose: ["5000"]
  frontend:
    image: ${ECR_REGISTRY}/iso-crm-frontend:latest  # local test: build: ./frontend
    restart: always
    ports: ["80:80"]
    depends_on: [backend]
```

**Test locally** — temporarily swap the two `image:` lines for `build:` lines, then:
```bash
docker compose up --build
# open http://localhost  → the full app should work end-to-end
```
> Why first locally: prove the containers talk to each other before involving AWS.
> Never commit `backend/.env` — it holds secrets (`.gitignore` already excludes it).

---

## Phase 2 — Create the ECR repositories

In AWS CloudShell (the `>_` icon) or any terminal with the AWS CLI:
```bash
aws ecr create-repository --repository-name iso-crm-backend  --region ap-south-1
aws ecr create-repository --repository-name iso-crm-frontend --region ap-south-1
```
Each repo gets a URL like
`459742123022.dkr.ecr.ap-south-1.amazonaws.com/iso-crm-backend`. This is where built images
live so EC2 can pull them.

---

## Phase 3 — Launch and prepare the EC2 server

### 3.1 Launch the instance
- **AMI:** Ubuntu Server 22.04 LTS
- **Type:** `t3.small` (not `t3.micro` — the frontend `npm run build` can OOM on micro)
- **Key pair:** create and download the `.pem` (needed for SSH and CI/CD)

### 3.2 Security group (firewall) — inbound rules
| Port | Source     | Purpose          |
|------|------------|------------------|
| 22   | **My IP**  | SSH (you only)   |
| 80   | Anywhere   | HTTP             |
| 443  | Anywhere   | HTTPS            |

> Opening 22 to `0.0.0.0/0` invites brute-force — restrict to your IP.

### 3.3 Elastic IP (fixed public IP)
EC2 → **Elastic IPs** → Allocate → Associate to the instance. A normal EC2 IP changes on
stop/start and would break DNS on every reboot.

### 3.4 IAM role for the instance (pull from ECR + use S3)
- IAM → Roles → Create role → trusted entity **EC2**.
- Attach **`AmazonEC2ContainerRegistryReadOnly`** + an S3 policy granting
  `s3:PutObject/GetObject/DeleteObject` on `arn:aws:s3:::iso-crm-qcc/*`.
- EC2 → instance → Actions → Security → **Modify IAM role** → attach it.
- Why: the box pulls images from ECR, and the backend uses S3 with **no stored keys** — the
  AWS SDK reads the role automatically ([utils/s3.js](../backend/utils/s3.js) already supports this).

### 3.5 Install Docker on EC2
```bash
ssh -i your-key.pem ubuntu@<ELASTIC_IP>

sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu          # then log OUT and back in
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```
> Skipping the re-login after `usermod` → "permission denied" on docker commands.

### 3.6 Put config on the server
```bash
mkdir -p ~/app/backend
# copy docker-compose.yml → ~/app/   and create ~/app/backend/.env
```
`~/app/backend/.env` (real values; omit AWS keys if using the IAM role):
```
PORT=5000
NODE_ENV=production
MONGODB_URI=...
JWT_SECRET=...                # set a strong secret — never rely on the code default
AWS_REGION=ap-south-1
S3_BUCKET=iso-crm-qcc
BREVO_USER=...                # preferred email provider (delivers to any recipient)
BREVO_PASS=...
RESEND_API_KEY=...            # optional fallback
RESEND_FROM=...
GMAIL_USER=...                # optional fallback
GMAIL_PASS=...
CLIENT_URL=https://crm.qccertification.com
```

### 3.7 Allow EC2 in MongoDB Atlas
Atlas → Network Access → Add IP → the **Elastic IP**. Forgetting this → the backend can't
reach the DB and hangs on startup.

---

## Phase 4 — First manual deploy (verify before automating)

From your PC (or CloudShell):
```bash
ACCT=459742123022
REG=$ACCT.dkr.ecr.ap-south-1.amazonaws.com
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin $REG

docker build -t $REG/iso-crm-backend:latest  ./backend  && docker push $REG/iso-crm-backend:latest
docker build -t $REG/iso-crm-frontend:latest ./frontend && docker push $REG/iso-crm-frontend:latest
```
On EC2:
```bash
cd ~/app
export ECR_REGISTRY=459742123022.dkr.ecr.ap-south-1.amazonaws.com
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
docker compose pull && docker compose up -d
docker compose logs -f          # watch it start; Ctrl+C to stop watching
```
Visit `http://<ELASTIC_IP>` → the live site. ✅
Doing this manually first isolates infrastructure problems from pipeline problems.

---

## Phase 5 — CI/CD pipeline (auto-deploy on push to `master`)

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to AWS
on:
  push:
    branches: [ master ]      # the live branch (repo has no "main")
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr
      - name: Build & push images
        env:
          REG: ${{ steps.ecr.outputs.registry }}
        run: |
          docker build -t $REG/iso-crm-backend:latest  ./backend
          docker build -t $REG/iso-crm-frontend:latest ./frontend
          docker push $REG/iso-crm-backend:latest
          docker push $REG/iso-crm-frontend:latest
      - name: Deploy on EC2 over SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/app
            export ECR_REGISTRY=${{ steps.ecr.outputs.registry }}
            aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
            docker compose pull && docker compose up -d && docker image prune -f
```

### GitHub repo secrets (Settings → Secrets and variables → Actions)
| Secret                  | Value                                       |
|-------------------------|---------------------------------------------|
| `AWS_ACCESS_KEY_ID`     | a deploy IAM user's key (ECR push perms)    |
| `AWS_SECRET_ACCESS_KEY` | that user's secret                          |
| `AWS_REGION`            | `ap-south-1`                                |
| `EC2_HOST`              | the Elastic IP                              |
| `EC2_SSH_KEY`           | full contents of the `.pem` file            |

> After this: **merge to `master` → site updates automatically in ~2–3 min.**
> Pitfall: using `branches: [main]` → the workflow never runs (the live branch is `master`).

---

## Phase 6 — Domain + HTTPS

### 6.1 DNS records (at your registrar)
| Type | Host | Value      | TTL  |
|------|------|------------|------|
| A    | `@`  | Elastic IP | 3600 |
| A    | `www`| Elastic IP | 3600 |

Propagation takes 5 min–48 h (check with `nslookup crm.qccertification.com`).

### 6.2 TLS with Caddy (auto Let's Encrypt) — the production compose
Use [docker-compose.prod.yml](../docker-compose.prod.yml) on EC2 instead of the plain compose.
It keeps the frontend nginx **internal-only** and puts a **Caddy** container on ports 80/443
that auto-fetches and renews certificates. The [Caddyfile](../Caddyfile):
```
crm.qccertification.com, www.crm.qccertification.com {
    root * /usr/share/nginx/html
    file_server
    try_files {path} /index.html
    reverse_proxy /api/* backend:5000
    reverse_proxy /uploads/* backend:5000
}
```
Select it once on EC2 by adding to `~/app/.env`:
```
COMPOSE_FILE=docker-compose.prod.yml
```
Then the normal `docker compose pull && docker compose up -d` (and the CI/CD pipeline) use it
automatically — no workflow change needed. Set `CLIENT_URL=https://crm.qccertification.com`
in the backend `.env`.

> Caddy persists certs in the `caddy_data` named volume — **do not delete that volume**.
> Alternative: host-level nginx + `certbot --nginx` (more moving parts than Caddy).

---

## Phase 7 — Final checklist (in order)

- [ ] Sign in as root/admin (not a scoped user); rotate any leaked keys
- [ ] `docker compose up --build` works locally with the 5 container files
- [ ] Create 2 ECR repos (`iso-crm-backend`, `iso-crm-frontend`)
- [ ] Launch EC2 (Ubuntu, `t3.small`) + security group (22/80/443) + Elastic IP
- [ ] Attach IAM role (ECR read + S3 read/write) to the instance
- [ ] Install Docker + compose on EC2 (re-login after `usermod`)
- [ ] Put `docker-compose.yml` + `backend/.env` on EC2
- [ ] Allowlist the Elastic IP in MongoDB Atlas
- [ ] Manual first deploy → verify at `http://<IP>`
- [ ] Add the GitHub Actions workflow (`branches: [master]`) + 5 secrets
- [ ] Merge to `master` → confirm auto-deploy in the Actions tab
- [ ] Add DNS A records (`@`, `www`) → Elastic IP
- [ ] Switch to `docker-compose.prod.yml` (Caddy) for HTTPS; set `CLIENT_URL`

---

## Common pitfalls (recap)

- **Wrong branch** in the workflow (`main` vs `master`) → nothing deploys.
- **Forgetting the Atlas IP allowlist** → backend hangs on the DB connection.
- **Missing S3 perms** on the EC2 IAM role → uploads silently fall back to local (ephemeral) disk.
- **Committing `.env`** → leaked secrets.
- **Using a scoped IAM user** for everything → "API Error" / least-privilege violations.
- **Not re-logging in** after `usermod -aG docker` → docker "permission denied".
- **`t3.micro`** → out-of-memory during the React build; use `t3.small`.
- **Relying on the JWT secret default** → set a strong `JWT_SECRET` in production.

---

## Notes on alternatives & future scaling

- **Render / Vercel:** the app previously ran on Render (backend) + Vercel (frontend). Once
  AWS is live you can retire those and any keep-alive workflows. They're simpler than EC2 but
  cost more at scale and split the origin (CORS overhead).
- **ECS Fargate / EKS:** the right next step when one VM is no longer enough — see the
  horizontal-scaling path in [ARCHITECTURE.md §3](./ARCHITECTURE.md). Both still pull images
  from the same ECR repos created here.
- **CloudFront:** front the React build and S3 downloads with a CDN to cut origin load.
