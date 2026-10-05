import { statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function isFile(candidate) {
  try {
    return statSync(candidate).isFile()
  } catch {
    return false
  }
}

/** Maps `@/lib/x` to `<root>/lib/x.ts`, the same lookup tsconfig's `paths` gives Next. */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = path.join(root, specifier.slice(2))
    const match = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(isFile)
    if (match) return nextResolve(pathToFileURL(match).href, context)
  }
  return nextResolve(specifier, context)
}
