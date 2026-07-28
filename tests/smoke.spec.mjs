import { expect, stubExternalFonts, test } from './fixtures.mjs';
import { expectNoRuntimeErrors, publicPages, watchRuntimeErrors } from './helpers.mjs';

for (const route of publicPages) {
  test(`${route || 'home'} renders without local resource or runtime errors`, async ({ page }, testInfo) => {
    const runtimeErrors = watchRuntimeErrors(page);
    const localResponseErrors = [];
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.hostname === '127.0.0.1' && response.status() >= 400) {
        localResponseErrors.push(`${response.status()} ${url.pathname}`);
      }
    });

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveTitle(/\S+/);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(150);
    const brokenImages = await page.locator('img').evaluateAll(images =>
      images
        .filter(image => image.complete && image.naturalWidth === 0)
        .map(image => image.currentSrc || image.getAttribute('src'))
    );
    expect(brokenImages, `Broken images at ${route || 'index.html'} (${testInfo.project.name})`).toEqual([]);
    expect(localResponseErrors, localResponseErrors.join('\n')).toEqual([]);
    expectNoRuntimeErrors(runtimeErrors);
  });
}

test.describe('defensive query handling', () => {
  for (const [parameter, expected] of [
    ['instagram', 'Instagram'],
    ['tiktok', 'TikTok'],
    ['facebook', 'Facebook']
  ]) {
    test(`preselects ${expected}`, async ({ page }) => {
      await page.goto(`followers.html?platform=${parameter}`);
      await expect(page.locator(`input[name="platform"][value="${expected}"]`)).toBeChecked();
    });
  }

  test('preselects the documented 10K package', async ({ page }) => {
    await page.goto('followers.html?package=10000');
    await expect(page.locator('input[name="package"][value^="10,000"]')).toBeChecked();
  });

  for (const [parameter, expected] of [
    ['prime', 'Prime Video'],
    ['apple', 'Apple TV+']
  ]) {
    test(`preselects ${expected}`, async ({ page }) => {
      await page.goto(`streaming.html?service=${parameter}`);
      await expect(page.locator(`input[name="service"][value="${expected}"]`)).toBeChecked();
    });
  }

  for (const maliciousValue of [
    `x"] input`,
    `']`,
    '<script>alert(1)</script>',
    '💥%00[]{}',
    'not-supported'
  ]) {
    test(`ignores malformed platform parameter ${JSON.stringify(maliciousValue)}`, async ({ page }) => {
      const runtimeErrors = watchRuntimeErrors(page);
      await page.goto(`followers.html?platform=${encodeURIComponent(maliciousValue)}`);
      await expect(page.locator('input[name="platform"]:checked')).toHaveCount(0);
      expectNoRuntimeErrors(runtimeErrors);
    });
  }
});

test('mobile menu manages focus, Escape, and resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('');

  const button = page.locator('[data-menu-button]');
  const navigation = page.locator('[data-mobile-nav]');
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation).toHaveClass(/\bopen\b/);
  await expect.poll(() => page.evaluate(() => {
    const menuButton = document.querySelector('[data-menu-button]');
    const mobileNavigation = document.querySelector('[data-mobile-nav]');
    return document.activeElement === menuButton || mobileNavigation?.contains(document.activeElement);
  })).toBeTruthy();
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() =>
    document.querySelector('[data-mobile-nav]')?.contains(document.activeElement)
  )).toBeTruthy();

  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();

  await button.click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('scroll reveals complete and reduced motion leaves content readable', async ({ browser }) => {
  const animatedContext = await browser.newContext({ reducedMotion: 'no-preference' });
  await stubExternalFonts(animatedContext);
  const animatedPage = await animatedContext.newPage();
  await animatedPage.goto('');
  const lateReveal = animatedPage.locator('.reveal').last();
  await expect(lateReveal).not.toHaveClass(/\bvisible\b/);
  await lateReveal.scrollIntoViewIfNeeded();
  await expect(lateReveal).toHaveClass(/\bvisible\b/);
  await animatedContext.close();

  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await stubExternalFonts(context);
  const page = await context.newPage();
  await page.goto('');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  const hiddenRevealContent = await page.locator('.reveal').evaluateAll(elements =>
    elements.filter(element => Number.parseFloat(getComputedStyle(element).opacity) < 0.99).length
  );
  expect(hiddenRevealContent).toBe(0);
  await context.close();
});

test('deeply nested missing paths use the styled, subpath-safe 404 page', async ({ page }) => {
  const response = await page.goto('deeply/nested/missing-page', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle(/page not found/i);
  await expect(page.locator('main h1')).toBeVisible();

  const stylesheet = page.locator('link[rel="stylesheet"][href*="styles.css"]').first();
  expect(new URL(await stylesheet.evaluate(link => link.href)).pathname).toBe('/access1/styles.css');
  await expect(page.locator('.brand img')).toHaveJSProperty('complete', true);
  expect(await page.locator('.brand img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);

  const homeHref = await page.getByRole('link', { name: /home/i }).first().evaluate(link => link.href);
  expect(new URL(homeHref).pathname).toMatch(/^\/access1\/(?:index\.html)?$/);
});
