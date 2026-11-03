import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  MAX_AGENTS_CHARS, MAX_BRIEF_CHARS, MAX_README_CHARS,
  buildWorkspaceBrief, collectWorkspaceBrief, formatWorkspaceBrief, resolveSessionDirectory,
} from '../src/host/context.js'

const directories = []

/** Create a temporary directory removed after the test. */
async function tempDir() {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-improve-context-'))
  directories.push(directory)
  return directory
}

afterEach(async () => {
  const pending = directories.splice(0)
  await Promise.all(pending.map(directory => rm(directory, { recursive: true, force: true })))
})

/** Create a minimal git repository. */
async function makeRepo({ head = 'ref: refs/heads/main\n', packageName = 'demo' } = {}) {
  const root = await tempDir()
  await mkdir(join(root, '.git'), { recursive: true })
  await writeFile(join(root, '.git', 'HEAD'), head)
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: packageName }))
  return root
}

/** Context stand-in for session-directory resolution. */
function fakeContext({ agent, session, directory, workingError } = {}) {
  return {
    get(name) {
      if (name === 'agents') return { get: () => agent }
      if (name === 'sessions') return { get: () => session }
      if (name === 'workingDirectory') {
        return {
          get() {
            if (workingError) throw new Error('working directory unavailable')
            return directory
          },
        }
      }
      return undefined
    },
  }
}

describe('resolveSessionDirectory', () => {
  const session = { header: { cwd: '/fallback/project' } }

  it('prefers the live agent working directory', () => {
    const ctx = fakeContext({ agent: { session }, session, directory: '/live/project' })
    expect(resolveSessionDirectory(ctx, 'session-1')).toBe('/live/project')
  })

  it('falls back to the session header when no live agent exists', () => {
    expect(resolveSessionDirectory(fakeContext({ session }), 'session-1')).toBe('/fallback/project')
  })

  it('falls back to the header when the working directory service throws', () => {
    const ctx = fakeContext({ agent: { session }, session, workingError: true })
    expect(resolveSessionDirectory(ctx, 'session-1')).toBe('/fallback/project')
  })

  it('returns undefined for a missing session id or session', () => {
    expect(resolveSessionDirectory(fakeContext({ session }), '')).toBeUndefined()
    expect(resolveSessionDirectory(fakeContext({}), 'session-1')).toBeUndefined()
  })

  it('does not throw when the agent registry throws', () => {
    const ctx = { get: name => (name === 'agents' ? { get: () => { throw new Error('boom') } } : undefined) }
    expect(resolveSessionDirectory(ctx, 'session-1')).toBeUndefined()
  })
})

describe('collectWorkspaceBrief', () => {
  it('reads project, root, branch, and excerpts', async () => {
    const root = await makeRepo()
    await writeFile(join(root, 'AGENTS.md'), '# Rules\nUse pnpm.\n')
    await writeFile(join(root, 'README.md'), '# Demo\n\nA demo project.\n')
    const facts = await collectWorkspaceBrief(root)
    expect(facts).toMatchObject({
      project: 'demo',
      root,
      branch: 'main',
      cwd: root,
      agents: '# Rules\nUse pnpm.',
      readme: '# Demo\n\nA demo project.',
    })
  })

  it('uses the directory name when package.json is absent', async () => {
    const root = await tempDir()
    await mkdir(join(root, '.git'))
    await writeFile(join(root, '.git', 'HEAD'), 'ref: refs/heads/main\n')
    const facts = await collectWorkspaceBrief(root)
    expect(facts.project).toBe(root.split('/').at(-1))
    expect(facts.branch).toBe('main')
  })

  it('omits the branch outside a git repository', async () => {
    const root = await tempDir()
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'plain' }))
    const facts = await collectWorkspaceBrief(root)
    expect(facts.branch).toBeUndefined()
    expect(formatWorkspaceBrief(facts)).not.toContain('unknown')
    expect(formatWorkspaceBrief(facts)).not.toContain('current branch:')
  })

  it('reports a detached HEAD as a short commit marker', async () => {
    const root = await makeRepo({ head: '0123456789abcdef0123456789abcdef01234567\n' })
    const facts = await collectWorkspaceBrief(root)
    expect(facts.branch).toBe('detached at 0123456')
  })

  it('follows a worktree .git file', async () => {
    const root = await tempDir()
    const gitDir = await tempDir()
    await writeFile(join(gitDir, 'HEAD'), 'ref: refs/heads/feature/worktree\n')
    await writeFile(join(root, '.git'), `gitdir: ${gitDir}\n`)
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'worktree-demo' }))
    const facts = await collectWorkspaceBrief(root)
    expect(facts.project).toBe('worktree-demo')
    expect(facts.branch).toBe('feature/worktree')
  })

  it('finds the repository root from a subdirectory', async () => {
    const root = await makeRepo()
    const nested = join(root, 'src', 'deep')
    await mkdir(nested, { recursive: true })
    const facts = await collectWorkspaceBrief(nested)
    expect(facts.root).toBe(root)
    expect(facts.branch).toBe('main')
    expect(facts.cwd).toBe(nested)
  })

  it('omits missing and unreadable files', async () => {
    const root = await makeRepo()
    const facts = await collectWorkspaceBrief(root, {
      readFile: async () => { throw new Error('denied') },
      stat: async () => { throw new Error('denied') },
    })
    expect(facts.project).toBe(root.split('/').at(-1))
    expect(facts.branch).toBeUndefined()
    expect(facts.agents).toBeUndefined()
    expect(facts.readme).toBeUndefined()
    expect(formatWorkspaceBrief(facts)).not.toContain('unknown')
  })

  it('caps the AGENTS and README excerpts', async () => {
    const root = await makeRepo()
    await writeFile(join(root, 'AGENTS.md'), 'a'.repeat(MAX_AGENTS_CHARS + 100))
    await writeFile(join(root, 'README.md'), 'b'.repeat(MAX_README_CHARS + 100))
    const facts = await collectWorkspaceBrief(root)
    expect(facts.agents.length).toBeLessThanOrEqual(MAX_AGENTS_CHARS + 20)
    expect(facts.readme.length).toBeLessThanOrEqual(MAX_README_CHARS + 20)
    expect(facts.agents).toContain('(truncated)')
    expect(facts.readme).toContain('(truncated)')
  })
})

describe('formatWorkspaceBrief', () => {
  it('returns undefined when there is no fact to render', () => {
    expect(formatWorkspaceBrief(undefined)).toBeUndefined()
    expect(formatWorkspaceBrief({})).toBeUndefined()
  })

  it('never renders an unknown marker', () => {
    const text = formatWorkspaceBrief({ project: 'demo', branch: undefined })
    expect(text).toContain('- project: demo')
    expect(text).not.toContain('unknown')
    expect(text).not.toContain('待确认')
    expect(text).not.toContain('current branch:')
  })

  it('stays under the whole-brief ceiling', () => {
    const text = formatWorkspaceBrief({
      project: 'demo',
      root: '/tmp/demo',
      branch: 'main',
      cwd: '/tmp/demo',
      agents: `head\n${'a'.repeat(5000)}`,
      readme: `head\n${'b'.repeat(3000)}`,
    })
    expect(text.length).toBeLessThanOrEqual(MAX_BRIEF_CHARS)
    expect(text).toContain('END WORKSPACE FACTS')
  })
})

describe('buildWorkspaceBrief', () => {
  it('returns a brief for a live session', async () => {
    const root = await makeRepo()
    const session = { header: { cwd: root } }
    const ctx = fakeContext({ agent: { session }, session, directory: root })
    const brief = await buildWorkspaceBrief(ctx, 'session-1')
    expect(brief).toContain('- project: demo')
    expect(brief).toContain('- current branch: main')
  })

  it('returns undefined without a session or on failure', async () => {
    expect(await buildWorkspaceBrief(fakeContext({}), undefined)).toBeUndefined()
    const ctx = { get: name => (name === 'agents' ? { get: () => { throw new Error('boom') } } : undefined) }
    expect(await buildWorkspaceBrief(ctx, 'session-1')).toBeUndefined()
  })
})
