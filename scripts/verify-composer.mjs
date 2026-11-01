/**
 * Real-GUI verification for composer live formatting.
 *
 * Types a multi-line Markdown draft, checks hidden markers/styled runs, then
 * clicks into a formatted run and checks the source is revealed.
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

const state = () => page.evaluate(() => {
  const root = document.querySelector('[data-composer-input]')
  const spans = [...root.querySelectorAll('span[data-lexical-text]')]
  return {
    text: root.textContent,
    hidden: spans.filter(span => span.style.display === 'none').map(span => span.textContent),
    codeBodies: spans.filter(span => span.style.fontFamily.includes('monospace')).map(span => span.textContent),
    bullets: spans.filter(span => span.style.background.includes('currentcolor') || span.style.background.includes('currentColor')).map(span => span.textContent),
    heading: spans.filter(span => span.style.fontSize !== '').map(span => ({ text: span.textContent, size: span.style.fontSize })),
    strong: spans.filter(span => span.style.fontWeight === '600' || span.style.fontWeight === 'bold').map(span => span.textContent),
    em: spans.filter(span => span.style.fontStyle === 'italic').map(span => span.textContent),
    del: spans.filter(span => span.style.textDecoration.includes('line-through')).map(span => span.textContent),
    htmlLength: root.innerHTML.length,
  }
})

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForSelector('[data-composer-input]', { timeout: 45000 })
  await page.waitForTimeout(500)
  const cont = page.getByRole('button', { name: '继续' })
  if (await cont.count() > 0) await cont.first().click()
  await page.locator('[data-composer-input]').click()
  const lines = ['**bold** and `code` and *em* and ~~gone~~', '- bullet item', '1. ordered item', '## heading', 'last line']
  for (const [index, line] of lines.entries()) {
    if (index > 0) await page.keyboard.press('Shift+Enter')
    await page.keyboard.type(line)
  }
  await page.waitForTimeout(700)
  report.afterTyping = await state()
  await page.screenshot({ path: `${OUT}/composer.png`, fullPage: false })

  await page.locator('[data-composer-input] span', { hasText: 'code' }).first().click()
  await page.waitForTimeout(500)
  report.revealed = await state()
  await page.screenshot({ path: `${OUT}/composer-revealed.png`, fullPage: false })

  await page.keyboard.type('!')
  await page.waitForTimeout(400)
  report.afterType = await state()

  await page.locator('[data-composer-input]').blur()
  await page.waitForTimeout(500)
  report.afterBlur = await state()
} catch (error) {
  report.failure = String(error)
  try {
    await page.screenshot({ path: `${OUT}/composer-failure.png`, fullPage: false })
  } catch {
    // Diagnostic only.
  }
} finally {
  await writeFile(`${OUT}/composer-report.json`, JSON.stringify(report, null, 2), 'utf8')
  await browser.close()
  console.log(JSON.stringify(report, null, 2))
}

