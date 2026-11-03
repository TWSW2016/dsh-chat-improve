/**
 * Real-GUI verification for "Improve by AI".
 *
 * Opens the tokenized Web GUI in installed Chrome and drives the composer
 * button through four scenarios: rewrite + restore, failure + retry, settings
 * off, and the reference-confirmation gate. By default the rewrite route is
 * intercepted, so the run is deterministic and costs no model tokens; set
 * DSH_VERIFY_REAL=1 to hit the real route instead.
 *
 * Requires DSH_VERIFY_URL (the URL printed by `dsh web`).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const URL = process.env.DSH_VERIFY_URL
const CHROME = process.env.DSH_VERIFY_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = process.env.DSH_VERIFY_OUT ?? '.research/verify'
const REAL = process.env.DSH_VERIFY_REAL === '1'
const ROUTE = '**/chat-improve/rewrite'
if (URL === undefined) throw new Error('DSH_VERIFY_URL is required')

const BUTTON = '[data-dsh-chat-improve-improve]'
const COMPOSER = '[data-composer-input]'
const NOTICE = '[data-dsh-chat-improve-notice]'
const SETTINGS_KEY = 'dsh-chat-improve:settings:v1'
const REWRITE_PREFIX = 'REWRITTEN: '

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const errors = []
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('pageerror', error => errors.push(String(error)))

const report = {
  url: URL,
  real: REAL,
  errors,
  button: false,
  happy: null,
  restore: null,
  failure: null,
  confirmGate: null,
  settingsOff: null,
  calls: 0,
}

/** Replace the composer draft through the real editor. */
async function setDraft(text) {
  const composer = page.locator(COMPOSER).first()
  await composer.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Delete')
  await page.keyboard.type(text)
  return composer
}

/** Read the composer draft as plain text. */
async function readDraft() {
  return page.locator(COMPOSER).first().innerText()
}

/** Wait for one notice kind and return its text. */
async function waitNotice(kind) {
  const notice = page.locator(`${NOTICE}[data-dsh-chat-improve-notice="${kind}"]`).first()
  await notice.waitFor({ state: 'visible', timeout: 30000 })
  return (await notice.innerText()).trim()
}

try {
  let failNext = false
  if (!REAL) {
    await page.route(ROUTE, async route => {
      report.calls += 1
      const body = JSON.parse(route.request().postData() ?? '{}')
      if (failNext) {
        await route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'llm-error', message: 'verification stub' }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ text: `${REWRITE_PREFIX}${body.draft ?? ''}` }),
      })
    })
  }

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForSelector(COMPOSER, { timeout: 45000 })
  const cont = page.getByRole('button', { name: '继续' })
  if (await cont.count() > 0) {
    await cont.first().click()
    await page.waitForTimeout(400)
  }
  await page.waitForSelector(BUTTON, { timeout: 45000 })
  report.button = true

  // 1. Rewrite replaces the draft and offers a restore.
  const original = '帮我改一下这个插件'
  await setDraft(original)
  await page.locator(BUTTON).click()
  const readyText = await waitNotice('ready')
  await page.waitForTimeout(300)
  const rewritten = await readDraft()
  report.happy = {
    readyText,
    replaced: rewritten.includes(REWRITE_PREFIX) || (REAL && rewritten.trim() !== original),
    buttons: await page.locator(`${NOTICE} button`).allInnerTexts(),
  }
  await page.screenshot({ path: `${OUT}/improve-ready.png`, fullPage: false })

  // 2. Restore puts the original back.
  await page.locator(`${NOTICE} button`).nth(0).click()
  await page.waitForTimeout(400)
  report.restore = { draft: await readDraft(), notice: await waitNotice('restored') }

  // 3. A failed rewrite keeps the draft and offers a retry.
  failNext = true
  await setDraft('另一条草稿')
  await page.locator(BUTTON).click()
  const errorText = await waitNotice('error')
  await page.waitForTimeout(200)
  const afterFailure = await readDraft()
  report.failure = {
    errorText,
    draftKept: afterFailure.trim() === '另一条草稿',
    buttons: await page.locator(`${NOTICE} button`).allInnerTexts(),
  }
  await page.screenshot({ path: `${OUT}/improve-error.png`, fullPage: false })
  failNext = false
  await page.locator(`${NOTICE} button`).nth(1).click()

  // 4. Reference chips gate the rewrite behind a confirmation.
  await setDraft('@')
  await page.waitForTimeout(600)
  await setDraft('@README.md 看看这个')
  await page.keyboard.type(' ')
  await page.waitForTimeout(600)
  const beforeClick = await readDraft()
  await page.locator(BUTTON).click()
  const confirmVisible = await page.locator(`${NOTICE}[data-dsh-chat-improve-notice="confirm"]`).count()
  if (confirmVisible > 0) {
    const callsBefore = report.calls
    await page.locator(`${NOTICE} button`).nth(1).click()
    await page.waitForTimeout(200)
    report.confirmGate = { asked: true, cancelled: true, callsUnchanged: report.calls === callsBefore, draft: await readDraft() }
  } else {
    report.confirmGate = { asked: false, note: 'no reference chip could be created in this composer state', draft: beforeClick }
  }
  await page.screenshot({ path: `${OUT}/improve-confirm.png`, fullPage: false })

  // 5. Turning the setting off removes the button.
  await page.evaluate(key => {
    const raw = localStorage.getItem(key)
    const value = raw === null ? {} : JSON.parse(raw)
    value.improvePrompt = false
    localStorage.setItem(key, JSON.stringify(value))
  }, SETTINGS_KEY)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector(COMPOSER, { timeout: 45000 })
  await page.waitForTimeout(800)
  report.settingsOff = { buttons: await page.locator(BUTTON).count() }
  await page.evaluate(key => { localStorage.removeItem(key) }, SETTINGS_KEY)
} catch (error) {
  report.failureStep = String(error)
  try {
    await page.screenshot({ path: `${OUT}/improve-failure.png`, fullPage: true })
  } catch {
    // Screenshot is diagnostic only.
  }
} finally {
  await writeFile(`${OUT}/improve-report.json`, JSON.stringify(report, null, 2), 'utf8')
  await browser.close()
  console.log(JSON.stringify(report, null, 2))
}
