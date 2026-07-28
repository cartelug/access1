import { expect, stubExternalFonts, test } from './fixtures.mjs';
import {
  expectWhatsAppUrl,
  fillContactForm,
  fillFollowerForm,
  fillStreamingForm,
  readCapturedWhatsAppUrl
} from './helpers.mjs';

const formCases = [
  {
    name: 'follower order',
    route: 'followers.html',
    selector: '#follower-order-form',
    fill: fillFollowerForm,
    expectedText: 'follower growth order'
  },
  {
    name: 'streaming request',
    route: 'streaming.html',
    selector: '#streaming-order-form',
    fill: fillStreamingForm,
    expectedText: 'streaming support'
  },
  {
    name: 'support message',
    route: 'contact.html',
    selector: '#contact-form',
    fill: fillContactForm,
    expectedText: 'need support'
  }
];

for (const formCase of formCases) {
  test(`${formCase.name} validates before attempting a handoff`, async ({ page }) => {
    await page.addInitScript(() => {
      window.__qaOpenedUrls = [];
      window.open = url => {
        window.__qaOpenedUrls.push(String(url));
        return { closed: false, opener: null };
      };
    });
    await page.goto(formCase.route);
    const before = page.url();
    await page.locator(`${formCase.selector} button[type="submit"]`).click();
    expect(page.url()).toBe(before);
    expect(await page.evaluate(() => window.__qaOpenedUrls.length)).toBe(0);
    expect(await page.locator(`${formCase.selector} :invalid`).count()).toBeGreaterThan(0);
  });

  test(`${formCase.name} builds, but does not send, the WhatsApp request`, async ({ page }) => {
    const consoleMessages = [];
    page.on('console', message => consoleMessages.push(message.text()));
    await page.addInitScript(() => {
      window.__qaOpenedUrls = [];
      window.open = url => {
        window.__qaOpenedUrls.push(String(url));
        return { closed: false, opener: null };
      };
    });
    await page.goto(formCase.route);
    const form = await formCase.fill(page);
    await form.locator('button[type="submit"]').click();
    const url = await readCapturedWhatsAppUrl(page);
    expectWhatsAppUrl(url, formCase.expectedText);
    expect(decodeURIComponent(url)).toContain('QA Test Customer');
    expect(page.url()).not.toContain('QA%20Test%20Customer');
    expect(consoleMessages.join('\n')).not.toContain('QA Test Customer');
    expect(await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage)
    }))).toEqual({ local: [], session: [] });
  });

  test(`${formCase.name} exposes an accessible recovery link when popups are blocked`, async ({ page }) => {
    await page.addInitScript(() => {
      window.open = () => null;
    });
    await page.goto(formCase.route);
    const form = await formCase.fill(page);
    await form.locator('button[type="submit"]').click();

    const fallback = form.locator('a[href^="https://wa.me/"]:visible').first();
    await expect(fallback).toBeVisible();
    await expect(form.locator('[role="status"][aria-live="polite"]')).toBeVisible();
    expectWhatsAppUrl(await fallback.getAttribute('href'), formCase.expectedText);
  });
}

test('follower order rejects a non-HTTPS profile URL', async ({ page }) => {
  await page.addInitScript(() => {
    window.__qaOpenedUrls = [];
    window.open = url => {
      window.__qaOpenedUrls.push(String(url));
      return { closed: false, opener: null };
    };
  });
  await page.goto('followers.html');
  const form = await fillFollowerForm(page);
  const profile = form.locator('[name="profileLink"]');
  await profile.fill('http://instagram.com/qa_public_profile');
  await form.locator('button[type="submit"]').click();
  await expect(profile).toBeFocused();
  expect(await profile.evaluate(input => input.validity.valid)).toBeFalsy();
  expect(await page.evaluate(() => window.__qaOpenedUrls.length)).toBe(0);
});

test('emoji-heavy form input is shortened within the safe WhatsApp URL budget', async ({ page }) => {
  await page.addInitScript(() => {
    window.__qaOpenedUrls = [];
    window.open = url => {
      window.__qaOpenedUrls.push(String(url));
      return { closed: false, opener: null };
    };
  });
  await page.goto('contact.html');
  const form = await fillContactForm(page);
  await form.locator('[name="message"]').fill('🚀'.repeat(500));
  await form.locator('button[type="submit"]').click();

  const value = await readCapturedWhatsAppUrl(page);
  expect(value.length).toBeLessThanOrEqual(4_096);
  expect(() => decodeURIComponent(value)).not.toThrow();
  const message = new URL(value).searchParams.get('text');
  expect(message).toContain('🚀');
  expect(message).not.toContain('\uFFFD');
  expect(message).toMatch(/\n\n\[Message shortened\]$/);
});

test('disabled JavaScript cannot serialize customer data into the URL', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await stubExternalFonts(context);
  const page = await context.newPage();
  const sentinel = 'QA_TEST_PII_SENTINEL';

  for (const formCase of formCases) {
    await page.goto(formCase.route);
    const formState = await page.locator(formCase.selector).evaluate(form => {
      const style = getComputedStyle(form);
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && form.getClientRects().length > 0;
      const enabledNamedControls = [...form.elements].filter(control => control.name && !control.disabled).length;
      return { visible, enabledNamedControls };
    });
    expect(
      !formState.visible || formState.enabledNamedControls === 0,
      `${formCase.route}: hide the form or disable all named fields when JavaScript is unavailable`
    ).toBeTruthy();

    const directWhatsApp = page.locator('a[href^="https://wa.me/"]:visible').first();
    await expect(directWhatsApp).toBeVisible();
    expect(await directWhatsApp.getAttribute('href')).not.toContain(sentinel);
    expect(page.url()).not.toContain(sentinel);
    await expect(page.locator('body')).toContainText(/JavaScript|WhatsApp/i);
  }
  await context.close();
});
