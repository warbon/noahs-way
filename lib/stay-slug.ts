import { findBySlug, resolveSlugCollisions as resolveGeneric, slugifyTitle } from "@/lib/slug"
import type { SluggableRecord } from "@/lib/slug"

export function slugifyStayTitle(title: string) {
  return slugifyTitle(title, "stay")
}

export function resolveStaySlugs<T extends SluggableRecord>(records: T[]) {
  return resolveGeneric(records, "stay")
}

export function findStayBySlug<T extends SluggableRecord>(records: T[], slug: string) {
  return findBySlug(records, slug, "stay")
}

export function buildStayHref(slug: string) {
  return `/stays/${slug}`
}
