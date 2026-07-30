// Kept deliberately narrow (matches common handle conventions elsewhere -
// Twitter/Instagram/etc) since the username is embedded directly into
// /u/[username] URLs throughout the app.
export const USERNAME_PATTERN     = /^[a-z0-9_]+$/
export const USERNAME_RULES_TEXT  = 'Usernames can only contain letters, numbers, and underscores.'

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_')
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username)
}
