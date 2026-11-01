/**
 * Composer safety checks: undo after formatting, send integrity, and an '@'
 * trigger line that must stay unformatted.
 */
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const URL = process.env.DSH_VERIFY_URL
const CHROME = process.env.DSH_VERIFY_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = process.env.DSH_VERIFY_OUT ?? '.research/verify'
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const errors = []
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('pageerror', error => errors.push(String(error)))
const report = { errors }

const composer = () => page.evaluate(() => {
  const root = document.querySelector('[data-composer-input]')
  return {
    text: root.textContent,
    hidden: [...root.querySelectorAll('span[data-lexical-text]')].filter(span => span.style.display === 'none').length,
    code: [...root.querySelectorAll('span[data-lexical-text]')].filter(span => span.style.fontFamily.includes('monospace')).length,
  }
})

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForSelector('[data-composer-input]', { timeout: 45000 })
  await page.waitForTimeout(500)
  const cont = page.getByRole('button', { name: '继续' })
  if (await cont.count() > 0) await cont.first().click()
  await page.locator('[data-composer-input]').click()
  await page.keyboard.type('**bold** and `code`')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('second')
  await page.waitForTimeout(500)
  report.formatted = await composer()

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(400)
  report.undo1 = await composer()
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(400)
  report.undo2 = await composer()

  // Clear whatever remains and send a fresh formatted line.
  await page.locator('[data-composer-input]').click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.keyboard.type('`send test`')
  await page.waitForTimeout(400)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1500)
  report.afterSend = {
    composer: await composer(),
    sent: await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('[data-slot="conversation.chat.node"]')]
      return nodes.map(node => node.innerText).filter(text => text.includes('send test'))
    }),
  }
  await page.screenshot({ path: `${OUT}/composer-send.png`, fullPage: false })

  // An '@' line is intentionally skipped by the formatter.
  await page.locator('[data-composer-input]').click()
  await page.keyboard.type('@file')
  await page.waitForTimeout(400)
  report.atLine = await composer()
  await page.keyboard.press('Escape')
} catch (error) {
  report.failure = String(error)
  try {
    await page.screenshot({ path: `${OUT}/composer-safety-failure.png`, fullPage: false })
  } catch {
    // Diagnostic only.
  }
} finally {
  await writeFile(`${OUT}/composer-safety-report.json`, JSON.stringify(report, null, 2), 'utf8')
  await browser.close()
  console.log(JSON.stringify(report, null, 2))
}

