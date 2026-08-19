import fs from "node:fs/promises"
import path from "node:path"

function getJsonPath() {
  return process.env.PACKAGE_JSON_PATH || path.join(process.cwd(), "data", "packages.json")
}

function getProjectId() {
  return process.env.FIRESTORE_PROJECT_ID || undefined
}

function getCollectionName() {
  return process.env.FIRESTORE_PACKAGES_COLLECTION || "packages"
}

function isCategory(value) {
  return value === "local" || value === "international"
}

function normalizePackage(value, category, index) {
  if (!value || typeof value !== "object") return null

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : `${category}-${Date.now()}-${index}`

  if (!isCategory(value.category) && value.category !== undefined) return null
  if (typeof value.title !== "string") return null
  if (typeof value.details !== "string") return null
  if (typeof value.imagePath !== "string") return null
  if (typeof value.previewImage !== "string") return null
  if (typeof value.price !== "string") return null

  return {
    id,
    category,
    title: value.title,
    details: value.details,
    imagePath: value.imagePath,
    previewImage: value.previewImage,
    price: value.price,
    createdAtMs: Date.now(),
    updatedAtMs: Date.now()
  }
}

async function main() {
  const raw = await fs.readFile(getJsonPath(), "utf8")
  const parsed = JSON.parse(raw)

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid JSON root")
  }

  const local = Array.isArray(parsed.local) ? parsed.local : []
  const international = Array.isArray(parsed.international) ? parsed.international : []

  const { Firestore } = await import("@google-cloud/firestore")
  const firestore = new Firestore({ projectId: getProjectId() })
  const collection = firestore.collection(getCollectionName())

  const docs = [
    ...local.map((pkg, index) => normalizePackage(pkg, "local", index)),
    ...international.map((pkg, index) => normalizePackage(pkg, "international", index))
  ].filter(Boolean)

  for (const doc of docs) {
    await collection.doc(doc.id).set(doc)
  }

  console.log(`Seeded ${docs.length} package records into Firestore collection "${getCollectionName()}".`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

