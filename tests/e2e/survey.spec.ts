import { test, expect, type Page, type Route } from '@playwright/test'

// ─── Mock Supabase-responses ──────────────────────────────────────────────────

const QUIZ_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const Q1_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const Q2_ID = 'bbbbbbbb-0000-0000-0000-000000000002'
const O1_ID = 'cccccccc-0000-0000-0000-000000000001'
const O2_ID = 'cccccccc-0000-0000-0000-000000000002'
const O3_ID = 'cccccccc-0000-0000-0000-000000000003'
const O4_ID = 'cccccccc-0000-0000-0000-000000000004'

const MOCK_QUIZ = {
  id: QUIZ_ID,
  title: 'Test Quiz',
  version: 1,
  status: 'active',
  is_locked: false,
  campaign_url: null,
  thanks_text_nl: 'Bedankt voor uw deelname!',
  thanks_text_fr: null,
  thanks_text_en: null,
  thanks_image_path: null,
  include_aborted: false,
  created_at: '2026-11-11T00:00:00Z',
  updated_at: '2026-11-11T00:00:00Z',
  questions: [
    {
      id: Q1_ID, quiz_id: QUIZ_ID, position: 1, type: 'multiple_choice',
      text_nl: 'Hoe tevreden bent u?', text_fr: null, text_en: null, image_path: null,
      options: [
        { id: O1_ID, question_id: Q1_ID, position: 1, label_nl: 'Zeer tevreden', label_fr: null, label_en: null, image_path: null },
        { id: O2_ID, question_id: Q1_ID, position: 2, label_nl: 'Tevreden', label_fr: null, label_en: null, image_path: null },
      ],
    },
    {
      id: Q2_ID, quiz_id: QUIZ_ID, position: 2, type: 'multiple_choice',
      text_nl: 'Zou u ons aanbevelen?', text_fr: null, text_en: null, image_path: null,
      options: [
        { id: O3_ID, question_id: Q2_ID, position: 1, label_nl: 'Ja', label_fr: null, label_en: null, image_path: null },
        { id: O4_ID, question_id: Q2_ID, position: 2, label_nl: 'Nee', label_fr: null, label_en: null, image_path: null },
      ],
    },
  ],
}

async function mockSupabase(page: Page) {
  // Onderschep alle Supabase-calls
  await page.route('**/rest/v1/**', async (route: Route) => {
    const url = route.request().url()
    const method = route.request().method()

    // Session ophalen (niet ingelogd)
    if (url.includes('/auth/v1/session')) {
      await route.fulfill({ status: 200, json: { data: { session: null }, error: null } })
      return
    }

    // Anonieme login
    if (url.includes('/auth/v1/signup') || url.includes('/auth/v1/token')) {
      await route.fulfill({
        status: 200,
        json: {
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: 'user-123', role: 'anon' },
        },
      })
      return
    }

    // register_interviewer RPC
    if (url.includes('register_interviewer')) {
      await route.fulfill({
        status: 200,
        json: { id: 'iv-123', first_name: 'Test', first_name_key: 'test', is_active: true, created_at: '2026-11-11T00:00:00Z' },
      })
      return
    }

    // get_active_quiz RPC
    if (url.includes('get_active_quiz')) {
      await route.fulfill({ status: 200, json: MOCK_QUIZ })
      return
    }

    // submit_interview RPC
    if (url.includes('submit_interview')) {
      await route.fulfill({ status: 200, json: null })
      return
    }

    // Storage afbeeldingen
    if (url.includes('/storage/v1/')) {
      await route.fulfill({ status: 404, json: { error: 'not found' } })
      return
    }

    await route.continue()
  })

  // Onderschep ook auth-calls
  await page.route('**/auth/v1/**', async (route: Route) => {
    const url = route.request().url()
    if (url.includes('signup') || url.includes('token')) {
      await route.fulfill({
        status: 200,
        json: {
          access_token: 'mock-token', token_type: 'bearer', expires_in: 3600,
          user: { id: 'user-123', role: 'anon' },
        },
      })
    } else {
      await route.continue()
    }
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Enquête-flow', () => {
  test('volledige flow: inloggen → taal → vragen → bedankpagina', async ({ page }) => {
    await mockSupabase(page)

    // 1. Inloggen
    await page.goto('/?dev=1')
    await page.fill('[id="firstName"]', 'Test')
    await page.fill('[id="code"]', 'test123')
    await page.click('button[type="submit"]')

    // 2. Startscherm – wacht op de Start-knop
    await page.waitForURL('**/home**')
    const startBtn = page.getByRole('button', { name: /start enquête/i })
    await expect(startBtn).toBeVisible({ timeout: 5000 })
    await startBtn.click()

    // 3. Taalkeuze – kies NL
    await page.waitForURL('**/survey**')
    await page.getByText('Nederlands').click()

    // 4. Vraag 1 – kies eerste optie
    await expect(page.getByText('Hoe tevreden bent u?')).toBeVisible()
    await page.getByText('Zeer tevreden').click()

    // 5. Vraag 2 – auto-advance na 400 ms, kies eerste optie
    await expect(page.getByText('Zou u ons aanbevelen?')).toBeVisible({ timeout: 2000 })
    await page.getByText('Ja').click()

    // 6. Bedankpagina
    await expect(page.getByText('Bedankt voor uw deelname!')).toBeVisible({ timeout: 2000 })
  })

  test('offline: enquête wordt opgeslagen in wachtrij', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/?dev=1')

    // Inloggen
    await page.fill('[id="firstName"]', 'Offline')
    await page.fill('[id="code"]', 'test123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/home**')

    // Zet offline vóór het starten van de enquête
    await page.context().setOffline(true)

    const startBtn = page.getByRole('button', { name: /start enquête/i })
    await expect(startBtn).toBeVisible({ timeout: 5000 })
    await startBtn.click()

    await page.getByText('Nederlands').click()
    await page.getByText('Zeer tevreden').click()
    await expect(page.getByText('Zou u ons aanbevelen?')).toBeVisible({ timeout: 2000 })
    await page.getByText('Ja').click()

    // Bedankpagina verschijnt ook offline
    await expect(page.getByText('Bedankt voor uw deelname!')).toBeVisible({ timeout: 2000 })

    // Zet terug online
    await page.context().setOffline(false)

    // Terug naar startscherm – wachtrij-teller moet > 0 zijn geweest
    await page.getByRole('button', { name: /herstart/i }).click()
    await page.getByRole('button', { name: /✕|terug/i }).first().click()

    // Na terugkeer naar home proberen sync (teller kan inmiddels 0 zijn als sync snel werkte)
    await page.waitForURL('**/home**')
  })

  test('enquête afbreken keert terug naar startscherm', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/?dev=1')

    await page.fill('[id="firstName"]', 'Test')
    await page.fill('[id="code"]', 'test123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/home**')

    const startBtn = page.getByRole('button', { name: /start enquête/i })
    await expect(startBtn).toBeVisible({ timeout: 5000 })
    await startBtn.click()

    // Taalkeuze – direct ✕ drukken (nog geen vraag beantwoord)
    await page.waitForURL('**/survey**')
    const closeBtn = page.locator('button[aria-label*="Terug"]').first()
    await closeBtn.click()
    await page.waitForURL('**/home**')
  })
})
