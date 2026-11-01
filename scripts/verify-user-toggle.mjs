/**
 * Real-GUI check for the user-message Markdown setting: turning it off must
 * restore the literal sent text, turning it back on must re-render it.
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

const readState = () => page.evaluate(() => {
  const text = document.body.innerText
  return {
    strong: [...document.querySelectorAll('strong')].filter(element => element.textContent === 'bold').length,
    rawMarkers: text.includes('**bold**'),
  }
})

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForSelector('[data-composer-input]', { timeout: 45000 })
  wait: {
    await page.getByText('Markdown formatting test', { exact: true }).first().click()
    await page.waitForTimeout(800)
  }
  report.on = await readState()

  await page.locator('button[aria-label="账号菜单"]').first().click()
  await page.getByText('设置', { exact: true }).first().click()
  await page.getByText('聊天增强', { exact: true }).first().click()
  await page.waitForTimeout(400)
  const boxes = page.locator('input[type="checkbox"]')
  // Third checkbox is the user-message Markdown switch.
  await boxes.nth(2).click()
  await page.waitForTimeout(300)
  report.storedOff = await page.evaluate(() => localStorage.getItem('dsh-chat-improve:settings:v1'))

  // Close settings: the panel header exposes a close control.
  const close = page.locator('button[aria-label*="关闭"]').first()
  if (await close.count() > 0) await close.click()
  else await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  report.off = await readState()
  await page.screenshot({ path: `${OUT}/user-markdown-off.png`, fullPage: false })

  // Restore the default.
  await page.locator('button[aria-label="账号菜单"]').first().click()
  await page.getByText('设置', { exact: true }).first().click()
  await page.getByText('聊天增强', { exact: true }).first().click()
  await page.waitForTimeout(300)
  await page.locator('input[type="checkbox"]').nth(2).click()
  await page.waitForTimeout(300)
  report.onAgain = await readState()
} catch (error) {
  report.failure = String(error)
  try {
    await page.screenshot({ path: `${OUT}/user-toggle-failure.png`, fullPage: false })
  } catch {
    // Diagnostic only.
  }
} finally {
  await writeFile(`${OUT}/user-toggle-report.json`, JSON.stringify(report, null, 2), 'utf8')
  await browser.close()
  console.log(JSON.stringify(report, null, 2))
}
