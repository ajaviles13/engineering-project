import type { RuleSetContent } from '../types'

export function normalizePattern(pattern: string): string {
  return pattern.trim().toLowerCase()
}

export function buildPatternIndex(content: RuleSetContent): Map<string, string> {
  const index = new Map<string, string>()

  for (const [parent, children] of Object.entries(content.categories)) {
    for (const [child, data] of Object.entries(children)) {
      const category = `${parent} > ${child}`
      for (const pattern of [...data.keywords, ...data.merchants]) {
        const key = normalizePattern(pattern)
        if (key) index.set(key, category)
      }
    }
  }

  return index
}

export function findPatternConflict(
  content: RuleSetContent,
  pattern: string,
  currentCategory: string
): string | null {
  const key = normalizePattern(pattern)
  if (!key) return null

  const existing = buildPatternIndex(content).get(key)
  if (!existing || existing === currentCategory) return null
  return existing
}
