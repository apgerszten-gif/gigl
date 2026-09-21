// One normalisation for every name the app has to match loosely: artists,
// venues, cities.
//
// "Rüfüs", "RUFUS" and "rufus  " are the same act; "The Fillmore" and "the
// fillmore" are the same room. Comparing on this key rather than on the raw
// string is what stops the catalogue growing four spellings of one thing.
//
// Deliberately conservative - it folds case, accents and whitespace and
// nothing else. Stripping punctuation as well would merge "Godspeed You!
// Black Emperor" with a hypothetical "Godspeed You Black Emperor", which is
// probably right, but it would also merge names that genuinely differ by a
// comma. Left alone until a real collision argues otherwise.
export function nameKey(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // drop accents: "Rüfüs" -> "rufus"
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Levenshtein distance, for "did you mean" prompts on the add-a-show form.
//
// lib/smsMatching.ts has its own copy. That one is part of matching an SMS
// reply against a festival lineup and carries the thresholds that job needs;
// this one is just the distance.
export function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

// Leading articles are noise for matching. Venues carry them constantly -
// "The Fillmore", "The Independent" - and nobody types them, so comparing
// raw strings puts a perfectly good match four edits away.
function withoutArticle(key: string): string {
  return key.replace(/^(the|a|an) /, '')
}

// The closest known spelling to what someone typed, or null when nothing is
// near enough.
//
// Four comparisons per candidate rather than one, because the ways people
// under-type a name are predictable:
//
//   "fillmore"         -> "The Fillmore"                 (dropped article)
//   "brick and morter" -> "Brick and Mortar Music Hall"  (typo + dropped tail)
//
// A raw edit distance misses both - the first by 4, the second by 12. So each
// candidate is also compared without its article, and against just its
// opening characters, and the best of those wins.
//
// The tolerance scales with length so short names don't collect false hits:
// "Muse" and "Mura" are two apart and are not each other.
export function closestMatch(typed: string, candidates: string[]): string | null {
  const key = nameKey(typed)
  if (!key) return null

  const limit = Math.max(1, Math.floor(key.length * 0.34))
  let best: { value: string; distance: number } | null = null

  for (const candidate of candidates) {
    const full = nameKey(candidate)

    // Identical as typed - there is nothing to correct.
    if (full === key) return null

    const bare = withoutArticle(full)
    const distance = Math.min(
      editDistance(key, full),
      editDistance(key, bare),
      // Prefix-aligned, for a name whose tail simply wasn't typed.
      editDistance(key, full.slice(0, key.length)),
      editDistance(key, bare.slice(0, key.length)),
    )

    if (distance <= limit && (!best || distance < best.distance)) {
      best = { value: candidate, distance }
    }
  }

  return best?.value ?? null
}
