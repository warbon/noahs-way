import type { PackageCategory } from "@/lib/package-data"
import type {
  CreatePackagePayload,
  PackageCatalogStore,
  PackageRecord,
  PackageRepository,
  UpdatePackagePayload
} from "@/lib/package-repository-types"

type FirestoreLike = {
  collection(name: string): CollectionLike
}

type CollectionLike = {
  get(): Promise<QuerySnapshotLike>
  doc(id?: string): DocumentRefLike
  where(field: string, op: "==", value: unknown): QueryLike
}

type QueryLike = {
  get(): Promise<QuerySnapshotLike>
}

type QuerySnapshotLike = {
  docs: Array<{ id: string; data(): unknown }>
}

type DocumentRefLike = {
  get(): Promise<{ exists: boolean; id: string; data(): unknown }>
  set(data: unknown): Promise<void>
  update(data: unknown): Promise<void>
  delete(): Promise<void>
}

type FirestorePackageDocument = PackageRecord & {
  createdAtMs: number
  updatedAtMs: number
}

let firestoreInstancePromise: Promise<FirestoreLike> | null = null

function createUniqueId() {
  return `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getPackagesCollectionName() {
  return process.env.FIRESTORE_PACKAGES_COLLECTION?.trim() || "packages"
}

function getProjectId() {
  return process.env.FIRESTORE_PROJECT_ID?.trim() || undefined
}

async function getFirestore(): Promise<FirestoreLike> {
  if (!firestoreInstancePromise) {
    firestoreInstancePromise = (async () => {
      const req = eval("require") as NodeRequire
      const firestoreModule = req("@google-cloud/firestore") as {
        Firestore: new (options?: { projectId?: string }) => FirestoreLike
      }

      return new firestoreModule.Firestore({
        projectId: getProjectId()
      })
    })()
  }

  return firestoreInstancePromise
}

async function getCollection() {
  const firestore = await getFirestore()
  return firestore.collection(getPackagesCollectionName())
}

function isPackageCategory(value: unknown): value is PackageCategory {
  return value === "local" || value === "international"
}

function normalizePackageRecord(value: unknown, fallbackId?: string): FirestorePackageDocument | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>

  const id = typeof record.id === "string" && record.id.trim() ? record.id.trim() : fallbackId
  if (!id) return null

  if (!isPackageCategory(record.category)) return null
  if (typeof record.title !== "string") return null
  if (typeof record.details !== "string") return null
  if (typeof record.imagePath !== "string") return null
  if (typeof record.previewImage !== "string") return null
  if (typeof record.price !== "string") return null

  const createdAtMs =
    typeof record.createdAtMs === "number" && Number.isFinite(record.createdAtMs)
      ? record.createdAtMs
      : Date.now()
  const updatedAtMs =
    typeof record.updatedAtMs === "number" && Number.isFinite(record.updatedAtMs)
      ? record.updatedAtMs
      : createdAtMs

  return {
    id,
    category: record.category,
    title: record.title,
    details: record.details,
    imagePath: record.imagePath,
    previewImage: record.previewImage,
    price: record.price,
    createdAtMs,
    updatedAtMs
  }
}

function sortNewestFirst(a: FirestorePackageDocument, b: FirestorePackageDocument) {
  if (b.updatedAtMs !== a.updatedAtMs) return b.updatedAtMs - a.updatedAtMs
  return b.createdAtMs - a.createdAtMs
}

function toPackageRecord(doc: FirestorePackageDocument): PackageRecord {
  return {
    id: doc.id,
    category: doc.category,
    title: doc.title,
    details: doc.details,
    imagePath: doc.imagePath,
    previewImage: doc.previewImage,
    price: doc.price
  }
}

async function getAllDocuments() {
  const collection = await getCollection()
  const snapshot = await collection.get()

  return snapshot.docs
    .map((doc) => normalizePackageRecord(doc.data(), doc.id))
    .filter((doc): doc is FirestorePackageDocument => doc !== null)
    .sort(sortNewestFirst)
}

async function getPackagesByCategory(category: PackageCategory): Promise<PackageRecord[]> {
  const collection = await getCollection()
  const snapshot = await collection.where("category", "==", category).get()

  return snapshot.docs
    .map((doc) => normalizePackageRecord(doc.data(), doc.id))
    .filter((doc): doc is FirestorePackageDocument => doc !== null)
    .sort(sortNewestFirst)
    .map(toPackageRecord)
}

async function getAllPackagesForAdmin(): Promise<PackageCatalogStore> {
  const all = await getAllDocuments()

  return {
    local: all.filter((pkg) => pkg.category === "local").map(toPackageRecord),
    international: all.filter((pkg) => pkg.category === "international").map(toPackageRecord)
  }
}

async function createPackageRecord(payload: CreatePackagePayload): Promise<PackageRecord> {
  const collection = await getCollection()
  const now = Date.now()
  const id = createUniqueId()
  const doc: FirestorePackageDocument = {
    ...payload,
    id,
    previewImage: payload.previewImage ?? payload.imagePath,
    createdAtMs: now,
    updatedAtMs: now
  }

  await collection.doc(id).set(doc)
  return toPackageRecord(doc)
}

async function updatePackageRecord(
  id: string,
  updates: UpdatePackagePayload
): Promise<PackageRecord | null> {
  const collection = await getCollection()
  const docRef = collection.doc(id)
  const snapshot = await docRef.get()
  if (!snapshot.exists) return null

  const existing = normalizePackageRecord(snapshot.data(), snapshot.id)
  if (!existing) return null

  const nextDoc: FirestorePackageDocument = {
    ...existing,
    ...updates,
    id: existing.id,
    category: (updates.category ?? existing.category) as PackageCategory,
    imagePath: updates.imagePath ?? existing.imagePath,
    previewImage: updates.previewImage ?? updates.imagePath ?? existing.previewImage,
    updatedAtMs: Date.now()
  }

  await docRef.set(nextDoc)
  return toPackageRecord(nextDoc)
}

async function deletePackageRecord(id: string): Promise<PackageRecord | null> {
  const collection = await getCollection()
  const docRef = collection.doc(id)
  const snapshot = await docRef.get()
  if (!snapshot.exists) return null

  const existing = normalizePackageRecord(snapshot.data(), snapshot.id)
  if (!existing) return null

  await docRef.delete()
  return toPackageRecord(existing)
}

export const firestorePackageRepository: PackageRepository = {
  getPackagesByCategory,
  getAllPackagesForAdmin,
  createPackageRecord,
  updatePackageRecord,
  deletePackageRecord
}
