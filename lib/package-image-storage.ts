import { savePackageImageToBlob } from "@/lib/storage/vercel-blob-package-image-storage"
import { savePackageImageToGcs } from "@/lib/storage/gcs-package-image-storage"
import { savePackageImageLocally } from "@/lib/storage/local-package-image-storage"
import type {
  SavePackageImageParams,
  SavePackageImageResult
} from "@/lib/storage/package-image-storage-types"

export type { SavePackageImageParams, SavePackageImageResult }

function getImageStoreMode() {
  const value = process.env.IMAGE_STORE?.trim().toLowerCase()

  if (value === "blob") return "blob"
  if (value === "gcs") return "gcs"
  return "local"
}

export async function savePackageImage(
  params: SavePackageImageParams
): Promise<SavePackageImageResult> {
  switch (getImageStoreMode()) {
    case "blob":
      return savePackageImageToBlob(params)
    case "gcs":
      return savePackageImageToGcs(params)
    default:
      return savePackageImageLocally(params)
  }
}
