/**
 * Read-only check for the user-message blank-line regression.
 *
 * It opens one existing session in a running Web GUI, finds a user bubble by
 * text, and asserts that no text newline sits between two block-level spans.
 * It does not send messages or mutate the session.
 *
 * Env:
 *   DSH_VERIFY_URL       required, for example http://127.0.0.1:12686
 *   DSH_VERIFY_COOKIE    optional `name=value` for an authenticated Web GUI
 *   DSH_VERIFY_TITLE     optional session title, default "Mermaid plugin flow diagram"
 *   DSH_VERIFY_NEEDLE    optional bubble text, default "Propose a detailed plan"
 *   DSH_VERIFY_MAX_HEIGHT optional expected maximum bubble height, default 110
 *   DSH_VERIFY_CHROME    optional Chrome executable
 *   DSH_VERIFY_OUT       optional output directory, default .research/verify
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const TARGET_URL = process.env.DSH_VERIFY_URL
const COOKIE = process.env.DSH_VERIFY_COOKIE
const TITLE = process.env.DSH_VERIFY_TITLE ?? 'Mermaid plugin flow diagram'
const NEEDLE = process.env.DSH_VERIFY_NEEDLE ?? 'Propose a detailed plan'
const MAX_HEIGHT = Number(process.env.DSH_VERIFY_MAX_HEIGHT ?? 110)
const CHROME = process.env.DSH_VERIFY_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = process.env.DSH_VERIFY_OUT ?? '.research/verify'
if (TARGET_URL === undefined) throw new Error('DSH_VERIFY_URL is required')

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

if (COOKIE !== undefined) {
  const at = COOKIE.indexOf('=')
  if (at <= 0) throw new Error('DSH_VERIFY_COOKIE must be name=value')
  await context.addCookies([{
    name: COOKIE.slice(0, at),
    value: COOKIE.slice(at + 1),
    domain: new URL(TARGET_URL).hostname,
    path: '/',
    httpOnly: true,
    sameSite: 'Strict',
  }])
}

const page = await context.newPage()
const errors = []
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('pageerror', error => errors.push(String(error)))

const report = { title: TITLE, needle: NEEDLE, errors }

try {
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(2200)
  const notice = page.getByRole('button', { name: '继续' })
  if (await notice.count() > 0) {
    await notice.first().click()
    await page.waitForTimeout(500)
  }

  // Clicking an already-selected workspace collapses its session list, so only
  // switch workspaces when the target session title is not visible.
  if (await page.getByText(TITLE, { exact: true }).count() === 0) {
    const workspace = page.locator('span.wnFoaW_title', { hasText: 'dsh-chat-improve' }).first()
    if (await workspace.count() > 0) {
      await workspace.click()
      await page.waitForTimeout(1800)
    }
  }

  await page.getByText(TITLE, { exact: true }).first().click()
  await page.waitForTimeout(2500)

  const older = page.getByText('加载更早', { exact: true })
  if (await older.count() > 0) {
    await older.first().click()
    await page.waitForTimeout(1500)
  }

  report.rendered = await page.evaluate((needle) => {
    const bubbles = [...document.querySelectorAll('div[class*="bubble"]')]
    const bubble = bubbles.find(element => element.textContent.includes(needle))
    if (bubble === undefined) return { found: false, bubbleCount: bubbles.length }

    const blocks = [...bubble.querySelectorAll('span[style*="display: block"]')]
    let breaksAfterBlock = 0
    for (const block of blocks) {
      const next = block.nextSibling
      if (next !== null && next.nodeType === Node.TEXT_NODE && next.nodeValue === '\n') breaksAfterBlock++
    }

    bubble.scrollIntoView({ block: 'center' })
    return {
      found: true,
      height: bubble.getBoundingClientRect().height,
      blockCount: blocks.length,
      breaksAfterBlock,
      innerText: bubble.innerText,
      html: bubble.innerHTML,
    }
  }, NEEDLE)

  report.pass = report.rendered.found === true
    && report.rendered.breaksAfterBlock === 0
    && report.rendered.height <= MAX_HEIGHT
  await page.screenshot({ path: `${OUT}/user-newline-verify.png` })
} catch (error) {
  report.failure = String(error)
  try {
    await page.screenshot({ path: `${OUT}/user-newline-verify-failure.png` })
  } catch {
    // Diagnostic only.
  }
} finally {
  await writeFile(`${OUT}/user-newline-verify.json`, JSON.stringify(report, null, 2), 'utf8')
  await browser.close()
  console.log(JSON.stringify(report, null, 2))
  if (report.pass !== true) process.exitCode = 1
}

