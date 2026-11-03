/**
 * Bounded workspace facts for the rewrite prompt.
 *
 * The rewrite route already knows the session; this module turns that session
 * into a small brief (project, branch, conventions) without touching the
 * conversation or the rest of the workspace. Every field is optional: an
 * unavailable fact is omitted, never rendered as "unknown".
 */
import { readFile as readFileDefault, stat as statDefault } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'

/** Whole brief ceiling, in characters. */
export const MAX_BRIEF_CHARS = 6000
/** AGENTS.md excerpt ceiling, in characters. */
export const MAX_AGENTS_CHARS = 3500
/** README excerpt ceiling, in characters. */
export const MAX_README_CHARS = 1500

/**
 * Resolve the effective working directory for one session.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context carrying `agents`, `sessions`, and optionally `workingDirectory`.
 * @param {string | undefined} sessionId - session the draft belongs to.
 * @returns {string | undefined} absolute directory, or undefined when the session is unknown.
 */
export function resolveSessionDirectory(ctx, sessionId) {
  if (typeof sessionId !== 'string' || sessionId === '') return undefined
  let agent
  try {
    agent = ctx?.get?.('agents')?.get?.(sessionId)
  } catch {
    // An unavailable agent registry is the same as an unknown session.
    agent = undefined
  }
  let session = agent?.session
  if (session === undefined) {
    try {
      session = ctx?.get?.('sessions')?.get?.(sessionId)
    } catch {
      session = undefined
    }
  }
  if (session === undefined || session === null) return undefined
  if (agent !== undefined) {
    try {
      const directory = ctx?.get?.('workingDirectory')?.get?.(session)
      if (typeof directory === 'string' && directory !== '') return directory
    } catch {
      // Fall back to the session header below.
    }
  }
  return typeof session.header?.cwd === 'string' && session.header.cwd !== ''
    ? session.header.cwd
    : undefined
}

/**
 * Walk up from the working directory until a `.git` entry is found.
 * @param {string} cwd - starting directory.
 * @param {(path: string) => Promise<unknown>} stat - stat implementation.
 * @returns {Promise<string>} repository root, or the starting directory.
 */
async function findRepoRoot(cwd, stat) {
  let directory = resolve(cwd)
  for (;;) {
    try {
      await stat(join(directory, '.git'))
      return directory
    } catch {
      const parent = dirname(directory)
      if (parent === directory) return resolve(cwd)
      directory = parent
    }
  }
}

/**
 * Read the git directory for one root, following a worktree's `.git` file.
 * @param {string} root - repository root.
 * @param {(path: string, encoding: string) => Promise<string>} readFile - file reader.
 * @param {(path: string) => Promise<{ isDirectory: () => boolean }>} stat - stat implementation.
 * @returns {Promise<string | undefined>} git directory.
 */
async function readGitDir(root, readFile, stat) {
  const dotGit = join(root, '.git')
  const info = await stat(dotGit)
  if (info.isDirectory()) return dotGit
  const text = await readFile(dotGit, 'utf8')
  const match = /^gitdir:\s*(.+)$/mu.exec(text)
  if (match === null) return undefined
  const target = match[1].trim()
  return isAbsolute(target) ? target : resolve(root, target)
}

/**
 * Read the branch name from `.git/HEAD`, or a short detached marker.
 * @param {string} root - repository root.
 * @param {(path: string, encoding: string) => Promise<string>} readFile - file reader.
 * @param {(path: string) => Promise<{ isDirectory: () => boolean }>} stat - stat implementation.
 * @returns {Promise<string | undefined>} branch, detached marker, or undefined.
 */
async function readBranch(root, readFile, stat) {
  try {
    const gitDir = await readGitDir(root, readFile, stat)
    if (gitDir === undefined) return undefined
    const head = (await readFile(join(gitDir, 'HEAD'), 'utf8')).trim()
    const ref = /^ref:\s*refs\/heads\/(.+)$/u.exec(head)
    if (ref !== null) return ref[1]
    if (/^[0-9a-f]{7,64}$/iu.test(head)) return `detached at ${head.slice(0, 7)}`
    return undefined
  } catch {
    // A missing or unreadable git directory means "no branch fact".
    return undefined
  }
}

/**
 * Read the project name from the root package.json, falling back to the directory name.
 * @param {string} root - repository root.
 * @param {(path: string, encoding: string) => Promise<string>} readFile - file reader.
 * @returns {Promise<string>} project name.
 */
async function readProjectName(root, readFile) {
  try {
    const name = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))?.name
    if (typeof name === 'string' && name.trim() !== '') return name.trim()
  } catch {
    // Fall through to the directory name.
  }
  return basename(root) || root
}

/**
 * Read a bounded excerpt from one file.
 * @param {string} path - file to read.
 * @param {number} maxChars - excerpt ceiling.
 * @param {(path: string, encoding: string) => Promise<string>} readFile - file reader.
 * @returns {Promise<string | undefined>} excerpt, or undefined when the file is missing or empty.
 */
async function readExcerpt(path, maxChars, readFile) {
  try {
    const text = (await readFile(path, 'utf8')).trim()
    if (text === '') return undefined
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n… (truncated)` : text
  } catch {
    // Missing or unreadable files simply contribute nothing.
    return undefined
  }
}

/**
 * Read the first available README variant.
 * @param {string[]} paths - candidate paths in priority order.
 * @param {number} maxChars - excerpt ceiling.
 * @param {(path: string, encoding: string) => Promise<string>} readFile - file reader.
 * @returns {Promise<string | undefined>} excerpt.
 */
async function readFirstExcerpt(paths, maxChars, readFile) {
  for (const path of paths) {
    const text = await readExcerpt(path, maxChars, readFile)
    if (text !== undefined) return text
  }
  return undefined
}

/**
 * Collect workspace facts for one directory.
 * @param {string} cwd - effective working directory.
 * @param {{ readFile?: (path: string, encoding: string) => Promise<string>, stat?: (path: string) => Promise<{ isDirectory: () => boolean }> }} [io] - injectable filesystem for tests.
 * @returns {Promise<{ project?: string, root?: string, branch?: string, cwd?: string, agents?: string, readme?: string } | undefined>} facts, or undefined without a directory.
 */
export async function collectWorkspaceBrief(cwd, io = {}) {
  if (typeof cwd !== 'string' || cwd === '') return undefined
  const readFile = io.readFile ?? readFileDefault
  const stat = io.stat ?? statDefault
  const root = await findRepoRoot(cwd, stat)
  const [project, branch, agents, readme] = await Promise.all([
    readProjectName(root, readFile),
    readBranch(root, readFile, stat),
    readExcerpt(join(root, 'AGENTS.md'), MAX_AGENTS_CHARS, readFile),
    readFirstExcerpt([join(root, 'README.md'), join(root, 'README.zh.md')], MAX_README_CHARS, readFile),
  ])
  return { project, root, branch, cwd, agents, readme }
}

/**
 * Indent an excerpt so it stays one Markdown list item.
 * @param {string} text - excerpt.
 * @returns {string} indented text.
 */
function indent(text) {
  return text.split('\n').map(line => `  ${line}`).join('\n')
}

/**
 * Render facts as the brief block, or undefined when there is nothing to say.
 * @param {{ project?: string, root?: string, branch?: string, cwd?: string, agents?: string, readme?: string }} facts - collected facts.
 * @returns {string | undefined} brief block.
 */
function renderBrief(facts) {
  if (facts === undefined || facts === null) return undefined
  const lines = ['WORKSPACE FACTS (reference only; may be partial):']
  if (facts.project) lines.push(`- project: ${facts.project}`)
  if (facts.root) lines.push(`- repository root: ${facts.root}`)
  if (facts.branch) lines.push(`- current branch: ${facts.branch}`)
  if (facts.cwd) lines.push(`- working directory: ${facts.cwd}`)
  if (facts.agents) lines.push('- project conventions (AGENTS.md excerpt):', indent(facts.agents))
  if (facts.readme) lines.push('- README excerpt:', indent(facts.readme))
  if (lines.length === 1) return undefined
  lines.push('END WORKSPACE FACTS')
  return lines.join('\n')
}

/**
 * Format facts under a hard ceiling, dropping the README first and truncating AGENTS.md second.
 * @param {{ project?: string, root?: string, branch?: string, cwd?: string, agents?: string, readme?: string }} facts - collected facts.
 * @returns {string | undefined} brief block, or undefined when no fact is available.
 */
export function formatWorkspaceBrief(facts) {
  const full = renderBrief(facts)
  if (full === undefined || full.length <= MAX_BRIEF_CHARS) return full
  const withoutReadme = renderBrief({ ...facts, readme: undefined })
  if (withoutReadme === undefined || withoutReadme.length <= MAX_BRIEF_CHARS) return withoutReadme
  if (facts.agents) {
    const base = renderBrief({ ...facts, readme: undefined, agents: undefined })
    if (base !== undefined) {
      const room = MAX_BRIEF_CHARS - base.length - 20
      if (room <= 0) return base
      const cut = facts.agents.slice(0, room)
      return renderBrief({ ...facts, readme: undefined, agents: `${cut}\n… (truncated)` })
    }
  }
  return full.slice(0, MAX_BRIEF_CHARS)
}

/**
 * Build the brief for one session, swallowing every filesystem or registry failure.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
 * @param {string | undefined} sessionId - session the draft belongs to.
 * @returns {Promise<string | undefined>} brief block, or undefined when unavailable.
 */
export async function buildWorkspaceBrief(ctx, sessionId) {
  try {
    const cwd = resolveSessionDirectory(ctx, sessionId)
    if (cwd === undefined) return undefined
    return formatWorkspaceBrief(await collectWorkspaceBrief(cwd))
  } catch {
    // Context is an enhancement; a failure must never fail the rewrite.
    return undefined
  }
}
