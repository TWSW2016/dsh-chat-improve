/**
 * Real-GUI verification for user-message Markdown.
 *
 * Opens a fresh session in the local Web profile, sends a user message with
 * inline Markdown, and inspects the optimistic transcript echo (independent of
 * the model response).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const URL = process.env.DSH_VERIFY_URL
const CHROME = process.env.DSH_VERIFY_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = process.env.DSH_VERIFY_OUT ?? '.research/verify'
if (URL === undefined) throw new Error('DSH_VERIFY_URL is required')

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const errors = []
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('pageerror', error => errors.push(String(error)))
const report = { errors }

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForSelector('[data-composer-input]', { timeout: 45000 })
  await page.waitForTimeout(600)
  const cont = page.getByRole('button', { name: '继续' })
  if (await cont.count() > 0) {
    await cont.first().click()
    await page.waitForTimeout(300)
  }

  await page.locator('[data-composer-input]').click()
  await page.keyboard.type('**bold** and `code` and *em* and ~~gone~~')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1200)

  report.rendered = await page.evaluate(() => {
    const strong = [...document.querySelectorAll('strong')].filter(element => element.textContent === 'bold')
    const code = [...document.querySelectorAll('code')].filter(element => element.textContent === 'code')
    const em = [...document.querySelectorAll('em')].filter(element => element.textContent === 'em')
    const del = [...document.querySelectorAll('del')].filter(element => element.textContent === 'gone')
    const raw = document.body.innerText
    return {
      strong: strong.length,
      code: code.length,
      em: em.length,
      del: del.length,
      rawMarkersVisible: raw.includes('**bold**') || raw.includes('`code`'),
    }
  })
  await page.screenshot({ path: `${OUT}/user-markdown.png`, fullPage: false })
} catch (error) {
  report.failure = String(error)
  try {
    await page.screenshot({ path: `${OUT}/user-markdown-failure.png`, fullPage: false })
  } catch {
    // Diagnostic only.
  }
} finally {
  await writeFile(`${OUT}/user-markdown-report.json`, JSON.stringify(report, null, 2), 'utf8')
  await browser.close()
  console.log(JSON.stringify(report, null, 2))
}
