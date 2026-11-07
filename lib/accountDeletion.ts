import { supabaseAdmin } from './supabaseAdmin'

// Deletes an account and everything it posted, for the in-app "Delete
// account" (Apple guideline 5.1.1(v): an app you can sign up in must let you
// delete the account in it too) and for /admin removing a reported profile.
// Server-only: it needs the service role.
//
// What goes: the auth user, which cascades through profiles to logs,
// ratings, comments, likes, reactions, follows, tags, saved shows, battle
// records, blocks and reports about them (see supabase-schema.sql), plus
// every file in their folder of the show-photos bucket. Shows they added to
// search stay, with submitted_by set to null, since nothing else could
// bring them back. Reports they filed stay too, without their name.

const BUCKET = 'show-photos'
const PAGE = 1000

// Every file under `folder`, including any subfolders. Storage lists one
// level at a time, and a folder comes back as an entry with no id.
async function listFiles(folder: string, depth = 0): Promise<string[]> {
  const storage = supabaseAdmin().storage.from(BUCKET)
  const paths: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await storage.list(folder, { limit: PAGE, offset })
    if (error) throw new Error(`listing ${folder} failed: ${error.message}`)
    for (const entry of data) {
      const path = `${folder}/${entry.name}`
      if (entry.id) paths.push(path)
      else if (depth < 3) paths.push(...await listFiles(path, depth + 1))
    }
    if (data.length < PAGE) return paths
  }
}

export async function deleteAccount(userId: string): Promise<void> {
  const admin = supabaseAdmin()

  // Files first: if this fails the account is still whole and they can try
  // again, whereas deleting the account first could strand public photos
  // nobody can find to remove. Only their own folder is touched. Log
  // media_urls aren't followed, because a log's owner can point those at
  // any file, including someone else's.
  const files = await listFiles(userId)
  for (let i = 0; i < files.length; i += PAGE) {
    const { error } = await admin.storage.from(BUCKET).remove(files.slice(i, i + PAGE))
    if (error) throw new Error(`removing their photos failed: ${error.message}`)
  }

  // Battle matchups point at logs without a cascade (see
  // app/api/admin/logs/[id]/route.ts), so they'd stop the logs going.
  const { error: matchupError } = await admin.from('matchups').delete().eq('user_id', userId)
  if (matchupError) throw new Error(`removing their matchups failed: ${matchupError.message}`)

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(`deleting the account failed: ${error.message}`)
}
