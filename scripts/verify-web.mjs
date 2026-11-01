/**
 * Real-GUI verification for the local Web profile.
 *
 * Opens the tokenized Web GUI in installed Chrome, dismisses the preview
 * notice, injects a synthetic markdown block to exercise the transcript
 * Mermaid enhancer against the real ui-primitives DOM, opens Settings, and
 * reports the composer/settings surfaces.
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

const report = { url: URL, errors, composer: false, settingsNav: null, settingsToggled: null, mermaid: null, mermaidError: null }

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForSelector('[data-composer-input]', { timeout: 45000 })
  report.composer = true
  await page.waitForTimeout(800)

  // First-run preview notice in the Web profile.
  const cont = page.getByRole('button', { name: '继续' })
  if (await cont.count() > 0) {
    await cont.first().click()
    await page.waitForTimeout(400)
  }

  // Synthetic settled markdown block: the enhancer only needs the DOM shape
  // ui-primitives emits for a fenced block.
  await page.evaluate(() => {
    const flow = document.querySelector('[data-slot="conversation.chat.flow"]')
    const host = document.createElement('div')
    host.className = 'verify_markdown_abc'
    host.setAttribute('data-verify-host', '')
    const block = document.createElement('div')
    block.className = 'md-code-block'
    const banner = document.createElement('div')
    banner.setAttribute('data-code-block-banner', '')
    const content = document.createElement('div')
    content.setAttribute('data-code-block-content', '')
    const pre = document.createElement('pre')
    pre.textContent = 'flowchart TD\n  A[Start] --> B[End]'
    content.append(pre)
    block.append(banner, content)
    host.append(block)
    ;(flow ?? document.body).prepend(host)
  })

  await page.waitForSelector('[data-dsh-chat-improve-mermaid] svg', { timeout: 20000 })
  const host = page.locator('[data-verify-host]').first()
  await host.scrollIntoViewIfNeeded()
  report.mermaid = await page.evaluate(() => {
    const host = document.querySelector('[data-verify-host]')
    const panel = host.querySelector('[data-dsh-chat-improve-mermaid]')
    const svg = panel?.querySelector('svg')
    return {
      panel: panel !== null,
      svgBytes: svg?.outerHTML.length ?? 0,
      svgNodes: svg?.querySelectorAll('*').length ?? 0,
      preDisplay: host.querySelector('pre')?.style.display ?? '',
      toggleText: panel?.querySelector('button')?.textContent ?? '',
    }
  })
  await host.screenshot({ path: `${OUT}/mermaid-ok.png` })

  // Invalid diagram: the source stays, an error panel with retry appears.
  await page.evaluate(() => {
    const original = document.querySelector('[data-verify-host]')
    const host = document.createElement('div')
    host.className = 'verify_markdown_abc'
    host.setAttribute('data-verify-host', 'error')
    const block = document.createElement('div')
    block.className = 'md-code-block'
    const content = document.createElement('div')
    content.setAttribute('data-code-block-content', '')
    const pre = document.createElement('pre')
    pre.textContent = 'flowchart TD\n  A[Start] -->'
    content.append(pre)
    block.append(content)
    host.append(block)
    original.after(host)
  })
  await page.waitForSelector('[data-verify-host="error"] .dsh-ci-mermaid-error', { timeout: 20000 })
  report.mermaidError = await page.evaluate(() => {
    const host = document.querySelector('[data-verify-host="error"]')
    return {
      errorText: host.querySelector('.dsh-ci-mermaid-error')?.textContent ?? '',
      preDisplay: host.querySelector('pre')?.style.display ?? '',
    }
  })
  await page.locator('[data-verify-host="error"]').first().screenshot({ path: `${OUT}/mermaid-error.png` })

  // Settings: the sidebar foot opens an account menu that contains Settings.
  const account = page.locator('button[aria-label="账号菜单"]').first()
  if (await account.count() > 0) {
    await account.click()
    await page.waitForTimeout(400)
  }
  const settingsItem = page.getByText('设置', { exact: true }).first()
  if (await settingsItem.count() > 0) {
    await settingsItem.click()
    await page.waitForTimeout(800)
  }
  const nav = page.getByText('聊天增强', { exact: true }).first()
  report.settingsNav = (await nav.count()) > 0
  if (report.settingsNav) {
    await nav.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/settings.png`, fullPage: false })
    const checkbox = page.locator('input[type="checkbox"]').first()
    if (await checkbox.count() > 0) {
      const before = await checkbox.isChecked()
      await checkbox.click()
      await page.waitForTimeout(300)
      const stored = await page.evaluate(() => localStorage.getItem('dsh-chat-improve:settings:v1'))
      await checkbox.click()
      report.settingsToggled = { before, stored }
    }
  }
  report.buttons = await page.evaluate(() => [...document.querySelectorAll('button[aria-label]')]
    .slice(0, 40).map(button => button.getAttribute('aria-label')))
} catch (error) {
  report.failure = String(error)
  try {
    await page.screenshot({ path: `${OUT}/failure.png`, fullPage: true })
  } catch {
    // Screenshot is diagnostic only.
  }
} finally {
  await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2), 'utf8')
  await browser.close()
  console.log(JSON.stringify(report, null, 2))
}
