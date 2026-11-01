/**
 * Composer IME probe: Chinese composition must not be split or corrupted.
 */
import { chromium } from 'playwright-core'

const URL = process.env.DSH_VERIFY_URL
const CHROME = process.env.DSH_VERIFY_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const errors = []
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('pageerror', error => errors.push(String(error)))
const report = { errors }
const state = () => page.evaluate(() => {
  const root = document.querySelector('[data-composer-input]')
  return {
    text: root.textContent,
    hidden: [...root.querySelectorAll('span[data-lexical-text]')].filter(span => span.style.display === 'none').length,
    code: [...root.querySelectorAll('span[data-lexical-text]')].filter(span => span.style.fontFamily.includes('monospace')).length,
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
  await page.keyboard.type('`code`')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('ime: ')
  await page.waitForTimeout(300)

  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.imeSetComposition', { text: '中文', selectionStart: 2, selectionEnd: 2 })
  await page.waitForTimeout(300)
  report.composing = await state()
  await cdp.send('Input.insertText', { text: '中文' })
  await page.waitForTimeout(500)
  report.committed = await state()

  await page.locator('[data-composer-input]').blur()
  await page.waitForTimeout(500)
  report.blurred = await state()
} catch (error) {
  report.failure = String(error)
} finally {
  await browser.close()
  console.log(JSON.stringify(report, null, 2))
}
