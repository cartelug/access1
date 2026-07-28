import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures.mjs';
import { publicPages } from './helpers.mjs';

for (const route of publicPages) {
  test(`${route || 'home'} has no serious or critical WCAG violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const blocking = results.violations.filter(violation =>
      violation.impact === 'serious' || violation.impact === 'critical'
    );
    const details = blocking.map(violation => {
      const targets = violation.nodes.flatMap(node => node.target).join(', ');
      return `${violation.id} (${violation.impact}): ${violation.help}\n  ${targets}`;
    });
    expect(blocking, details.join('\n')).toEqual([]);
  });
}

test('mobile navigation state remains accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('');
  await page.locator('[data-menu-button]').click();
  const results = await new AxeBuilder({ page })
    .include('header')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const blocking = results.violations.filter(violation =>
    violation.impact === 'serious' || violation.impact === 'critical'
  );
  expect(blocking, blocking.map(violation => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
});
