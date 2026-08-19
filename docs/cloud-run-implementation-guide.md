# Cloud Run Production Implementation Guide (Noah's Way)

This guide documents how to deploy the current Next.js app to Google Cloud Run in a production-safe way.

It is tailored to this codebase, which currently stores admin package data in `data/packages.json` and uploaded images in `public/images/...`.

## 1. Current State and Why It Must Change

The current app works locally because it writes to the local filesystem:

- `lib/package-repository.ts` writes package records to `data/packages.json`
- `app/api/admin/packages/route.ts` writes uploaded images to `public/images/packages/...`
- `app/api/admin/packages/[id]/route.ts` also writes updated images to `public/images/packages/...`

This is not production-safe on Cloud Run because:

- Cloud Run containers use ephemeral filesystem storage
- filesystem writes are not durable across restarts/deploys
- multiple instances do not share local files

## 2. Target Architecture (Recommended)

Use this split:

- App runtime: Cloud Run (Next.js server)
- Package metadata: Firestore
- Uploaded images: Google Cloud Storage (GCS)
- Secrets: Secret Manager (or Cloud Run env vars initially)

Local development can continue using JSON + local image files.

## 3. Implementation Strategy (Minimal Rewrite)

Keep `lib/package-repository.ts` as the abstraction layer and introduce pluggable storage implementations.

Recommended structure:

```text
lib/
  package-repository.ts              # facade / selector
  repositories/
    file-package-repository.ts       # current JSON/file behavior (local dev)
    firestore-package-repository.ts  # production metadata store
  storage/
    local-image-storage.ts           # current public/images writes (local dev)
    gcs-image-storage.ts             # production image uploads
```

Use an environment toggle:

- `PACKAGE_STORE=file|firestore`
- `IMAGE_STORE=local|gcs`

Recommended defaults:

- local dev: `file` + `local`
- Cloud Run: `firestore` + `gcs`

## 4. Firestore Data Model

Use a single collection for packages:

- Collection: `packages`
- Document ID: package `id` (string, existing format is fine)

Suggested document shape:

```ts
type PackageDocument = {
  id: string
  category: "local" | "international"
  title: string
  details: string
  price: string
  imagePath: string
  previewImage: string
  createdAt: string
  updatedAt: string
}
```

Notes:

- Keep `imagePath` and `previewImage` as public URLs (or signed URLs if you later lock down bucket access)
- Keep `id` stable so UI/admin routes do not need major changes

## 5. GCS Image Storage Strategy

Store package images in a bucket path by category:

- `packages/local/<filename>`
- `packages/international/<filename>`

Filename strategy (same pattern you already use):

- `<slug>-<timestamp>.<ext>`

Return a URL to persist in Firestore:

- Option A (simple): public bucket object URL
- Option B (more secure): signed URL (more work, rotation/expiry considerations)

For this app, start with Option A using a dedicated public-read bucket for package images.

## 6. Required GCP Resources

Create:

1. Cloud Run service
2. Firestore database (Native mode)
3. GCS bucket for package images
4. Service account for Cloud Run (least privilege)

IAM roles for the Cloud Run service account (minimum practical set):

- Firestore access: `roles/datastore.user`
- GCS object access (bucket-scoped preferred): `roles/storage.objectAdmin`
- Secret access (if using Secret Manager): `roles/secretmanager.secretAccessor`

## 7. Code Changes (Step-by-Step)

### 7.1 Install dependencies

```bash
npm install @google-cloud/firestore @google-cloud/storage
```

### 7.2 Add environment variables

Add to local `.env.local` for development/testing:

```bash
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...

PACKAGE_STORE=file
IMAGE_STORE=local

# Production values for Cloud Run (switch when ready)
FIRESTORE_PROJECT_ID=your-gcp-project-id
GCS_BUCKET_NAME=noahs-way-package-images
PUBLIC_ASSET_BASE_URL=https://storage.googleapis.com/noahs-way-package-images
```

Cloud Run runtime env values (production):

```bash
PACKAGE_STORE=firestore
IMAGE_STORE=gcs
FIRESTORE_PROJECT_ID=your-gcp-project-id
GCS_BUCKET_NAME=noahs-way-package-images
PUBLIC_ASSET_BASE_URL=https://storage.googleapis.com/noahs-way-package-images
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
```

### 7.3 Split package repository implementation

Move current filesystem-based logic from `lib/package-repository.ts` into `lib/repositories/file-package-repository.ts`.

Then make `lib/package-repository.ts` a selector/facade:

- read `PACKAGE_STORE`
- delegate to file or Firestore implementation
- preserve current exported function signatures:
  - `getPackagesByCategory`
  - `getAllPackagesForAdmin`
  - `createPackageRecord`
  - `updatePackageRecord`
  - `deletePackageRecord`

Important: keep the same return types so UI/API routes need minimal changes.

### 7.4 Split image storage implementation

Current image write behavior is embedded in API routes. Extract it into a storage helper.

Suggested interface:

```ts
export type StoredImage = {
  publicImagePath: string
}

export async function savePackageImage(params: {
  category: "local" | "international"
  title: string
  file: File
}): Promise<StoredImage>
```

Implement:

- `local-image-storage.ts`: current `writeFile` to `public/images/packages/...`
- `gcs-image-storage.ts`: upload buffer to GCS and return public URL

Then replace direct `writeFile(...)` calls in:

- `app/api/admin/packages/route.ts`
- `app/api/admin/packages/[id]/route.ts`

with `savePackageImage(...)`.

### 7.5 Firestore repository implementation details

Implement the same CRUD behavior currently in `lib/package-repository.ts`.

Recommended queries:

- List all admin packages:
  - query collection `packages`
  - fetch all docs
  - split in memory into `local` and `international`
- List by category:
  - `where("category", "==", category)`
- Create:
  - `doc(id).set(...)`
- Update:
  - `doc(id).update(...)`
  - if category changes, only update field (Firestore doesn't need "move between lists")
- Delete:
  - `doc(id).delete()`

Preserve existing response contracts so frontend remains unchanged.

### 7.6 Seeding existing JSON data into Firestore (one-time)

You already have `data/packages.json`. Write a one-time seed script that:

1. reads `data/packages.json`
2. validates the shape
3. writes all records into Firestore `packages` collection

Run once before switching `PACKAGE_STORE=firestore`.

## 8. Example GCS Upload Flow (Implementation Notes)

In the GCS image storage implementation:

1. validate MIME type (`jpeg/png/webp`) and file size (you already do this in routes)
2. build filename using existing `slugify(title) + Date.now()`
3. `await file.arrayBuffer()`
4. upload buffer to GCS object path `packages/<category>/<filename>`
5. set content type metadata
6. return persisted URL (`${PUBLIC_ASSET_BASE_URL}/packages/<category>/<filename>`)

Keep validation in the API routes for now to minimize changes.

## 9. Local Development Modes

### Mode A: Current local mode (recommended default)

- `PACKAGE_STORE=file`
- `IMAGE_STORE=local`

Pros:

- no cloud dependencies
- fastest iteration

Cons:

- not production-equivalent persistence

### Mode B: Local app + real GCP services (integration testing)

- run app locally (`npm run dev`)
- set `PACKAGE_STORE=firestore`
- set `IMAGE_STORE=gcs`
- authenticate with GCP locally (Application Default Credentials)

Use this before deploying to Cloud Run.

## 10. Local Cloud Run Simulation (Docker)

Use Docker to simulate Cloud Run production behavior:

### 10.1 Add Dockerfile

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 8080
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-8080}"]
```

### 10.2 Add `.dockerignore`

```dockerignore
node_modules
.next
.git
```

### 10.3 Run locally like Cloud Run

```bash
docker build -t noahs-way-local .

docker run --rm -p 8080:8080 \
  --env-file .env.local \
  -e PORT=8080 \
  -e NODE_ENV=production \
  --cpus=1 \
  --memory=512m \
  noahs-way-local
```

To simulate Cloud Run's non-durable filesystem behavior, restart the container after admin writes and verify whether your production storage mode is durable.

## 11. Cloud Run Deployment Setup (Production)

### 11.1 Build configuration recommendations

Add standalone output in `next.config.mjs` for smaller container/runtime footprint:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone"
}

export default nextConfig
```

Then use a standalone Dockerfile variant (optional optimization).

### 11.2 Deploy command (example)

```bash
gcloud run deploy noahs-way \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars PACKAGE_STORE=firestore,IMAGE_STORE=gcs,FIRESTORE_PROJECT_ID=YOUR_PROJECT,GCS_BUCKET_NAME=YOUR_BUCKET,PUBLIC_ASSET_BASE_URL=https://storage.googleapis.com/YOUR_BUCKET \
  --set-secrets ADMIN_PASSWORD=ADMIN_PASSWORD:latest,ADMIN_SESSION_SECRET=ADMIN_SESSION_SECRET:latest
```

If not using Secret Manager initially, use `--set-env-vars` for both secrets, then migrate later.

### 11.3 Service account

Attach a dedicated service account to the Cloud Run service and grant only required roles.

## 12. Security Notes

- Do not use weak values like `adminsecret` for `ADMIN_SESSION_SECRET`
- Generate a long random secret (at least 32 bytes of entropy)
- Keep `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in Secret Manager for production
- Restrict admin access with strong password and consider adding IP allowlisting or Identity-Aware Proxy later

Generate a strong session secret example:

```bash
openssl rand -base64 32
```

## 13. Migration Plan (Safe Rollout)

Use this order:

1. Extract file repository + local image storage (no behavior change)
2. Add Firestore repository + GCS storage behind env toggles
3. Seed Firestore from `data/packages.json`
4. Test locally in integration mode (`firestore + gcs`)
5. Deploy to Cloud Run staging
6. Verify admin create/update/delete and image uploads
7. Deploy production

## 14. Testing Checklist

Before production deploy:

- `npm run build` succeeds
- admin login works
- package create works
- package update works (with and without image replacement)
- package delete works
- homepage reflects changes after revalidation
- `/packages/local` and `/packages/international` reflect changes
- uploaded image URL is reachable
- container restart does not lose package data (when using Firestore/GCS)

## 15. Troubleshooting

### Admin login fails in production

Check:

- `ADMIN_PASSWORD` is set
- `ADMIN_SESSION_SECRET` is set
- secret values do not include unintended quotes/spaces

Relevant files:

- `lib/admin-auth.ts`
- `lib/admin-auth-server.ts`

### Uploads fail on Cloud Run

Check:

- `IMAGE_STORE=gcs`
- bucket exists
- service account has `storage.objectAdmin` (or bucket-scoped equivalent)
- `GCS_BUCKET_NAME` and `PUBLIC_ASSET_BASE_URL` values are correct

### Package data resets after deploy/restart

Cause:

- app is still using `PACKAGE_STORE=file`

Fix:

- switch to `PACKAGE_STORE=firestore`

## 16. What You Can Keep As-Is

These parts can largely remain unchanged:

- frontend UI components
- admin auth cookie flow (`lib/admin-auth.ts`, `lib/admin-auth-server.ts`)
- API route request validation
- `revalidatePath(...)` cache refresh behavior

The main change is storage implementation, not app architecture.

## 17. Optional Enhancements (After Launch)

- Add image deletion in GCS when package is deleted or image is replaced
- Add audit fields (`createdBy`, `updatedBy`)
- Add pagination in admin package listing
- Add backups/export for package metadata
- Add CDN in front of GCS assets (Cloud CDN or external CDN)

