# ISO CRM — Step-by-Step Deployment (Docker + AWS EC2 + CI/CD)

A zero-to-live, in-order guide for deploying this CRM. Beginner-friendly: every step says
**what to do**, the **exact command/file**, and **why** it matters. Follow top to bottom.

## Your project facts (already known)
- **Frontend:** React (CRA) → static files, served by nginx
- **Backend:** Node/Express, listens on port **5000**
- **Database:** **MongoDB Atlas** (managed, external) → *no RDS, no DB container needed*
- **File storage:** **AWS S3** (`iso-crm-qcc`, region `ap-south-1`)
- **GitHub repo:** `qccwebdeveloper-maker/iso-crm-new`
- **Live branch:** `master`  ← (repo has no `main`; the pipeline must trigger on `master`)
- **AWS account:** `459742123022` · **Region:** `ap-south-1` (Mumbai)

## Key concepts (read once)
- **ECR (Elastic Container Registry):** AWS's private Docker image storage — "a private Docker Hub
  inside your account." You **push** images here; EC2 **pulls** them.
- **EC2 vs ECS:** EC2 = one VM you run containers on (simplest, cheapest — our choice). ECS = managed
  orchestration (overkill for 2 containers). Both pull from ECR.
- Flow: `build image → push to ECR → EC2 pulls → docker compose runs it`.

---

## PHASE 0 — Fix AWS permissions first
The IAM user `frontend_user` was made for S3 only, so the EC2 console shows "API Error" everywhere.

1. Sign in as **root** or an **admin** IAM user (not `frontend_user`).
2. Do the one-time infra setup (Phases 2–3) as root/admin.
3. **Why:** `frontend_user` lacks EC2 permissions → every EC2 API call is denied.
4. **Security:** rotate `frontend_user`'s access key (it was exposed) — IAM → Users → `frontend_user`
   → Security credentials → deactivate & delete old key → create new.

---

## PHASE 1 — Dockerize & test locally

Create these 5 files.

### `backend/Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

### `backend/.dockerignore`
```
node_modules
.env
uploads
npm-debug.log
```

### `frontend/Dockerfile` (multi-stage: build with Node, serve with nginx)
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

### `frontend/nginx.conf`
Serves the React app **and** proxies `/api` to the backend (replaces the dev-only `setupProxy.js`;
keeps everything same-origin → no CORS).
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri /index.html; }
  location /api/     { proxy_pass http://backend:5000; proxy_set_header Host $host; }
  location /uploads/ { proxy_pass http://backend:5000; }
}
```

### `docker-compose.yml` (repo root) — no DB service (Atlas is external)
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

### Test locally
Temporarily replace the two `image:` lines with `build: ./backend` / `build: ./frontend`, then:
```bash
docker compose up --build
# open http://localhost  → the whole app should work end-to-end
```
**Why:** prove the containers talk to each other before involving AWS.

**Pitfall:** never commit `backend/.env` — it holds secrets (`.gitignore` already excludes it).

---

## PHASE 2 — Create ECR repositories
In CloudShell (the `>_` icon, top of AWS console) or your terminal with AWS CLI:
```bash
aws ecr create-repository --repository-name iso-crm-backend  --region ap-south-1
aws ecr create-repository --repository-name iso-crm-frontend --region ap-south-1
```
Each repo gets a URL like:
`459742123022.dkr.ecr.ap-south-1.amazonaws.com/iso-crm-backend`

**Why:** this is where your built images live so EC2 can download them.

---

## PHASE 3 — Launch & prepare the EC2 server

### 3.1 Launch instance
- EC2 → **Launch instance**
- AMI: **Ubuntu Server 22.04 LTS**
- Type: **t3.small** (t3.micro is too small for `npm run build`)
- **Key pair:** create one, download the `.pem` (keep it safe — needed for SSH & CI/CD)
- **Why t3.small:** the frontend build needs RAM; t3.micro can OOM.

### 3.2 Security group (firewall) — inbound rules
| Port | Source | Purpose |
|------|--------|---------|
| 22   | **My IP** | SSH (you only) |
| 80   | Anywhere | HTTP |
| 443  | Anywhere | HTTPS |

**Pitfall:** opening 22 to `0.0.0.0/0` invites brute-force — restrict to your IP.

### 3.3 Elastic IP (fixed public IP)
- EC2 → **Elastic IPs** → Allocate → Associate to the instance.
- **Why:** a normal EC2 IP changes on stop/start and would break your DNS every reboot.

### 3.4 IAM role for the instance (pull from ECR + use S3)
- IAM → Roles → Create role → trusted entity **EC2**
- Attach: **`AmazonEC2ContainerRegistryReadOnly`** + an S3 policy
  (`s3:PutObject/GetObject/DeleteObject` on `arn:aws:s3:::iso-crm-qcc/*`)
- EC2 → instance → Actions → Security → **Modify IAM role** → attach it.
- **Why:** the box can pull images from ECR, and your backend uses S3 with **no stored keys**
  (the SDK reads the role automatically — `utils/s3.js` already supports this).

### 3.5 Install Docker on EC2 (SSH in first)
```bash
ssh -i your-key.pem ubuntu@<ELASTIC_IP>

sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu          # then log out & back in
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```
**Pitfall:** skipping the re-login after `usermod` → "permission denied" on docker commands.

### 3.6 Put config on the server
```bash
mkdir -p ~/app/backend
# copy docker-compose.yml to ~/app/  and create ~/app/backend/.env
```
`~/app/backend/.env` (real values; omit AWS keys if using the IAM role):
```
PORT=5000
NODE_ENV=production
MONGODB_URI=...
JWT_SECRET=...
AWS_REGION=ap-south-1
S3_BUCKET=iso-crm-qcc
BREVO_USER=...                # preferred email provider (delivers to any recipient)
BREVO_PASS=...
GMAIL_USER=...                # optional fallback
GMAIL_PASS=...
CLIENT_URL=https://yourdomain.com
```

### 3.7 Allow EC2 in MongoDB Atlas
Atlas → Network Access → Add IP → the **Elastic IP**.
**Pitfall:** forgetting this → backend can't reach the DB and hangs.

---

## PHASE 4 — First manual deploy (verify before automating)

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
**Why first manually:** isolates infrastructure problems from pipeline problems.

---

## PHASE 5 — CI/CD pipeline (auto-deploy on push)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to AWS
on:
  push:
    branches: [ master ]      # YOUR live branch (repo has no "main")
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

### GitHub Secrets (repo → Settings → Secrets and variables → Actions)
| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | a deploy IAM user's key (ECR push perms) |
| `AWS_SECRET_ACCESS_KEY` | that user's secret |
| `AWS_REGION` | `ap-south-1` |
| `EC2_HOST` | the Elastic IP |
| `EC2_SSH_KEY` | full contents of your `.pem` file |

**Why secrets:** anything in the repo can leak; secrets are encrypted and injected only at run time.
**Pitfall:** using `branches: [main]` → the workflow never runs (your branch is `master`).

After this: **merge to `master` → site updates automatically in ~2–3 min.**

---

## PHASE 6 — Domain + HTTPS

### 6.1 DNS records (in your registrar's DNS panel)
| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| A | `@` (root) | Elastic IP | 3600 |
| A | `www` | Elastic IP | 3600 |

**Why:** an A record maps your domain → server IP. Propagation takes 5 min–48 h
(check with `nslookup yourdomain.com`).

### 6.2 SSL — easiest path: Caddy (auto Let's Encrypt)
Replace the frontend's plain nginx edge with a Caddy container (it fetches & auto-renews certs).
`Caddyfile`:
```
yourdomain.com, www.yourdomain.com {
    root * /usr/share/nginx/html
    file_server
    try_files {path} /index.html
    reverse_proxy /api/* backend:5000
    reverse_proxy /uploads/* backend:5000
}
```
Run Caddy on ports 80+443. Then set `CLIENT_URL=https://yourdomain.com` in the EC2 `.env`.

**Alternative (explicit Certbot):** host-level nginx + `sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com` (installs an auto-renew timer). More moving parts than Caddy.

---

## PHASE 7 — Final checklist (in order)
- [ ] Sign in as root/admin (not `frontend_user`); rotate the leaked key
- [ ] Add the 5 Docker files; `docker compose up --build` works locally
- [ ] Create 2 ECR repos
- [ ] Launch EC2 (Ubuntu, t3.small) + security group (22/80/443) + Elastic IP
- [ ] Attach IAM role (ECR read + S3) to the instance
- [ ] Install Docker + compose on EC2 (re-login after `usermod`)
- [ ] Put `docker-compose.yml` + `backend/.env` on EC2
- [ ] Allowlist the Elastic IP in MongoDB Atlas
- [ ] Manual first deploy → verify at `http://<IP>`
- [ ] Add GitHub Actions workflow (`branches: [master]`) + 5 secrets
- [ ] Merge to `master` → confirm auto-deploy in the Actions tab
- [ ] Add DNS A records (`@`, `www`) → Elastic IP
- [ ] Enable HTTPS (Caddy or Certbot); set `CLIENT_URL`

## Common pitfalls recap
- Wrong branch in the workflow (`main` vs `master`) → nothing deploys.
- Forgetting the Atlas IP allowlist → backend hangs on DB.
- Missing S3 perms on the EC2 role → uploads silently fall back to local disk.
- Committing `.env` → leaked secrets.
- Using `frontend_user` for everything → "API Error" / least-privilege violations.
- Not re-logging in after `usermod -aG docker` → docker permission denied.
