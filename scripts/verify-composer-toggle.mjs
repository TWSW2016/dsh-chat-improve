/**
 * Composer setting toggle: off restores raw source, on re-renders it.
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
  await page.keyboard.type('second')
  await page.locator('[data-composer-input]').blur()
  await page.waitForTimeout(500)
  report.on = await state()

  await page.locator('button[aria-label="账号菜单"]').first().click()
  await page.getByText('设置', { exact: true }).first().click()
  await page.getByText('聊天增强', { exact: true }).first().click()
  await page.waitForTimeout(300)
  await page.locator('input[type="checkbox"]').nth(0).click()
  await page.waitForTimeout(300)
  const close = page.locator('button[aria-label*="关闭"]').first()
  if (await close.count() > 0) await close.click()
  else await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  report.off = await state()

  await page.locator('button[aria-label="账号菜单"]').first().click()
  await page.getByText('设置', { exact: true }).first().click()
  await page.getByText('聊天增强', { exact: true }).first().click()
  await page.waitForTimeout(300)
  await page.locator('input[type="checkbox"]').nth(0).click()
  await page.waitForTimeout(300)
  const close2 = page.locator('button[aria-label*="关闭"]').first()
  if (await close2.count() > 0) await close2.click()
  else await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  report.onAgain = await state()
} catch (error) {
  report.failure = String(error)
} finally {
  await browser.close()
  console.log(JSON.stringify(report, null, 2))
}
