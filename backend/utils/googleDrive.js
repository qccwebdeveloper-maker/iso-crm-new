// Lists a Google Drive folder's direct children without any API key/service
// account — this only works because the old-client folders are shared
// "anyone with the link". Google serves a lightweight, non-JS HTML listing
// at this endpoint (normally used to embed a folder preview on a website);
// we scrape that instead of standing up full OAuth for a read-only browse.
const EMBED_URL = (folderId) => `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;

// Accepts a raw folder ID or a full drive.google.com URL.
const extractFolderId = (input) => {
  if (!input) return null;
  const m = String(input).match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : String(input).trim();
};

const decodeEntities = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Returns [{ id, name, type: 'folder'|'file', kind, viewUrl, downloadUrl, lastModified }]
const listDriveFolder = async (folderId) => {
  const resp = await fetch(EMBED_URL(folderId));
  if (!resp.ok) throw new Error(`Drive folder fetch failed: HTTP ${resp.status}`);
  const html = await resp.text();
  const chunks = html.split('<div class="flip-entry" id="entry-').slice(1);

  return chunks.map((chunk) => {
    const id           = (chunk.match(/^([^"]+)"/) || [])[1] || '';
    const viewUrl       = (chunk.match(/<a href="([^"]+)"/) || [])[1] || '';
    const title         = (chunk.match(/<div class="flip-entry-title">([\s\S]*?)<\/div>/) || [])[1] || '';
    const lastModified  = (chunk.match(/<div class="flip-entry-last-modified"><div>([^<]*)<\/div>/) || [])[1] || '';
    // Files carry their type on the thumbnail image's alt text; folders carry
    // it on an aria-label div instead — check both.
    const kind = (chunk.match(/<div class="flip-entry-thumb"><img[^>]*alt="([^"]*)"/) || [])[1]
              || (chunk.match(/<div aria-label="([^"]*)"/) || [])[1] || '';
    const isFolder = viewUrl.includes('/folders/');
    return {
      id,
      name: decodeEntities(title.trim()),
      type: isFolder ? 'folder' : 'file',
      kind,
      viewUrl,
      downloadUrl: isFolder ? null : `https://drive.google.com/uc?export=download&id=${id}`,
      lastModified: lastModified.trim(),
    };
  }).filter((e) => e.id && e.viewUrl);
};

// Old-client folders aren't flat — each numbered folder (e.g. 5341/) has its
// own admin/ and client/ sub-folders holding the actual scanned files. Walk
// down a few levels and return every file found, tagged with the sub-folder
// path it came from (so "admin/5341.jpeg" and "client/pic.jfif" don't clash).
const listDriveFilesRecursive = async (folderId, maxDepth = 3, pathPrefix = []) => {
  const entries = await listDriveFolder(folderId);
  let files = [];
  for (const entry of entries) {
    if (entry.type === 'file') {
      files.push({ ...entry, folderPath: pathPrefix.join('/') });
    } else if (entry.type === 'folder' && maxDepth > 0) {
      const nested = await listDriveFilesRecursive(entry.id, maxDepth - 1, [...pathPrefix, entry.name]);
      files = files.concat(nested);
    }
  }
  return files;
};

// Best-effort mapping from a scanned file's name to our document type, used
// when auto-importing (no human picks a docType per file during sync).
const guessDocType = (filename = '') => {
  const n = filename.toLowerCase();
  if (/gst/.test(n)) return 'gstCertificate';
  if (/udyam|msme/.test(n)) return 'udyamCertificate';
  if (/invoice|sale/.test(n)) return 'invoice';
  if (/agreement|contract/.test(n)) return 'agreement';
  if (/certificate|cert\b/.test(n)) return 'certificate';
  return 'other';
};

module.exports = { extractFolderId, listDriveFolder, listDriveFilesRecursive, guessDocType };
