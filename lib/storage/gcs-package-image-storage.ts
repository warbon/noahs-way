import type {
  SavePackageImageParams,
  SavePackageImageResult
} from "@/lib/storage/package-image-storage-types"

type StorageLike = {
  bucket(name: string): {
    file(path: string): {
      save(data: Buffer, options?: { resumable?: boolean; metadata?: { contentType?: string } }): Promise<void>
    }
  }
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "package"
}

function getBucketName() {
  const bucket = process.env.GCS_BUCKET_NAME?.trim()
  if (!bucket) {
    throw new Error("Missing GCS_BUCKET_NAME environment variable")
  }

  return bucket
}

function getPublicAssetBaseUrl(bucket: string) {
  return (
    process.env.PUBLIC_ASSET_BASE_URL?.trim().replace(/\/+$/, "") ||
    `https://storage.googleapis.com/${bucket}`
  )
}

function getGcsPrefix() {
  return process.env.GCS_PACKAGE_IMAGE_PREFIX?.trim().replace(/^\/+|\/+$/g, "") || "packages"
}

let storageInstancePromise: Promise<StorageLike> | null = null

async function getStorage(): Promise<StorageLike> {
  if (!storageInstancePromise) {
    storageInstancePromise = (async () => {
      const req = eval("require") as NodeRequire
      const storageModule = req("@google-cloud/storage") as {
        Storage: new () => StorageLike
      }
      return new storageModule.Storage()
    })()
  }

  return storageInstancePromise
}

export async function savePackageImageToGcs({
  category,
  title,
  file,
  extension
}: SavePackageImageParams): Promise<SavePackageImageResult> {
  const bucketName = getBucketName()
  const objectPrefix = getGcsPrefix()
  const filename = `${slugify(title)}-${Date.now()}${extension}`
  const objectPath = `${objectPrefix}/${category}/${filename}`

  const storage = await getStorage()
  const bucket = storage.bucket(bucketName)
  const object = bucket.file(objectPath)

  const arrayBuffer = await file.arrayBuffer()
  await object.save(Buffer.from(arrayBuffer), {
    resumable: false,
    metadata: {
      contentType: file.type || undefined
    }
  })

  const publicBase = getPublicAssetBaseUrl(bucketName)
  return {
    publicImagePath: `${publicBase}/${objectPath}`
  }
}

