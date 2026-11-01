/**
 * Rough composer performance probe: bulk insert a long draft, format it, and
 * type a few characters.
 */
import { chromium } from 'playwright-core'

const URL = process.env.DSH_VERIFY_URL
const CHROME = process.env.DSH_VERIFY_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
const errors = []
page.on('pageerror', error => errors.push(String(error)))
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForSelector('[data-composer-input]', { timeout: 45000 })
await page.waitForTimeout(400)
const cont = page.getByRole('button', { name: '继续' })
if (await cont.count() > 0) await cont.first().click()
await page.locator('[data-composer-input]').click()

const lines = Array.from({ length: 200 }, (_, index) => (index % 12 === 0 ? `**bold ${index}** and \`code ${index}\`` : `word ${index} plain`))
const t0 = Date.now()
for (const [index, line] of lines.entries()) {
  if (index > 0) await page.keyboard.press('Shift+Enter')
  await page.keyboard.insertText(line)
}
const insertMs = Date.now() - t0
await page.waitForTimeout(500)

const t1 = Date.now()
await page.locator('[data-composer-input]').blur()
const blurMs = Date.now() - t1
await page.waitForTimeout(800)

const t2 = Date.now()
await page.locator('[data-composer-input]').click()
await page.keyboard.type('abcdefghij')
const typeMs = Date.now() - t2
await page.waitForTimeout(400)

const state = await page.evaluate(() => {
  const root = document.querySelector('[data-composer-input]')
  const spans = [...root.querySelectorAll('span[data-lexical-text]')]
  return {
    chars: root.textContent.length,
    spans: spans.length,
    hidden: spans.filter(span => span.style.display === 'none').length,
    code: spans.filter(span => span.style.fontFamily.includes('monospace')).length,
  }
})
console.log(JSON.stringify({ errors, insertMs, blurMs, typeMs, state }, null, 2))
await browser.close()

