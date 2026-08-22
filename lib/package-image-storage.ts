import {
  deletePackageImageFromBlob,
  savePackageImageToBlob
} from "@/lib/storage/vercel-blob-package-image-storage"
import {
  deletePackageImageLocally,
  savePackageImageLocally
} from "@/lib/storage/local-package-image-storage"
import type {
  SavePackageImageParams,
  SavePackageImageResult
} from "@/lib/storage/package-image-storage-types"

export type { SavePackageImageParams, SavePackageImageResult }

let warnedAboutLocalStore = false

function getImageStoreMode() {
  const value = process.env.IMAGE_STORE?.trim().toLowerCase()

  if (value === "blob") return "blob"

  // Same trap as the package store: local mode writes into public/, which a
  // serverless host will not accept.
  if (process.env.NODE_ENV === "production" && !warnedAboutLocalStore) {
    warnedAboutLocalStore = true
    console.warn(
      "[packages] IMAGE_STORE is not set to \"blob\", so uploads are being written to " +
        "public/images, which is read-only on a serverless host. Set IMAGE_STORE=blob and link a Blob store."
    )
  }

  return "local"
}

export async function savePackageImage(
  params: SavePackageImageParams
): Promise<SavePackageImageResult> {
  return getImageStoreMode() === "blob"
    ? savePackageImageToBlob(params)
    : savePackageImageLocally(params)
}

/**
 * Best-effort deletion of a stored image. Routes by the shape of the stored
 * path rather than the current mode, so it still cleans up assets written by a
 * previously-configured backend. Never throws: a failed cleanup must not fail
 * the package delete/update that triggered it.
 */
export async function deletePackageImage(imagePath: string | undefined): Promise<void> {
  if (!imagePath) return

  try {
    if (imagePath.includes(".blob.vercel-storage.com")) {
      await deletePackageImageFromBlob(imagePath)
    } else if (imagePath.startsWith("/images/packages/")) {
      await deletePackageImageLocally(imagePath)
    }
  } catch (error) {
    console.error(`Failed to delete package image: ${imagePath}`, error)
  }
}
