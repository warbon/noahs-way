import type { MetadataRoute } from "next"

import type { PackageCategory } from "@/lib/package-data"
import { getPackagesByCategory } from "@/lib/package-repository"
import { buildPackageHref, resolveSlugCollisions } from "@/lib/package-slug"
import { siteConfig } from "@/lib/site-config"

const categories: PackageCategory[] = ["local", "international"]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${siteConfig.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/packages`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteConfig.url}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/policies`, changeFrequency: "monthly", priority: 0.5 }
  ]

  for (const category of categories) {
    entries.push({
      url: `${siteConfig.url}/packages/${category}`,
      changeFrequency: "weekly",
      priority: 0.8
    })

    // Drafts are excluded by the repository, so unpublished packages never leak
    // into the sitemap.
    const packages = resolveSlugCollisions(await getPackagesByCategory(category))
    for (const pkg of packages) {
      entries.push({
        url: `${siteConfig.url}${buildPackageHref(category, pkg.slug)}`,
        lastModified: pkg.updatedAt ? new Date(pkg.updatedAt) : undefined,
        changeFrequency: "monthly",
        priority: 0.7
      })
    }
  }

  return entries
}
