import { expect, test } from './fixtures.mjs';
import { publicPages } from './helpers.mjs';

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 844, height: 390 }
];

for (const viewport of viewports) {
  test(`all pages fit ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(viewport);
    for (const route of publicPages) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const dimensions = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const offenders = [...document.body.querySelectorAll('*')]
          .map(element => {
            const rect = element.getBoundingClientRect();
            return {
              element,
              left: Math.round(rect.left),
              right: Math.round(rect.right)
            };
          })
          .filter(item => item.right > clientWidth + 1 || item.left < -1)
          .slice(0, 8)
          .map(item => ({
            selector: `${item.element.tagName.toLowerCase()}${item.element.id ? `#${item.element.id}` : ''}${[...item.element.classList].slice(0, 3).map(name => `.${name}`).join('')}`,
            left: item.left,
            right: item.right
          }));
        return {
          clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          offenders
        };
      });
      expect(
        dimensions.scrollWidth,
        `${route || 'index.html'} overflows by ${dimensions.scrollWidth - dimensions.clientWidth}px\n${JSON.stringify(dimensions.offenders)}`
      ).toBeLessThanOrEqual(dimensions.clientWidth + 1);

      const clippedControls = await page.locator('a:visible, button:visible, input:visible, select:visible, textarea:visible')
        .evaluateAll((controls, { width, height }) => controls
          .map(control => {
            const rect = control.getBoundingClientRect();
            let ancestor = control.parentElement;
            let insideHorizontalScroller = false;
            while (ancestor && ancestor !== document.body) {
              const overflowX = getComputedStyle(ancestor).overflowX;
              if (['auto', 'scroll'].includes(overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 1) {
                insideHorizontalScroller = true;
                break;
              }
              ancestor = ancestor.parentElement;
            }
            return {
              label: control.getAttribute('aria-label') || control.textContent?.trim().slice(0, 40) || control.tagName,
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              insideHorizontalScroller
            };
          })
          .filter(rect => !rect.insideHorizontalScroller && (rect.right > width + 1 || rect.left < -1)),
        viewport);
      expect(clippedControls, `${route || 'index.html'} has clipped interactive controls`).toEqual([]);
    }
  });
}

test('primary mobile controls meet the 44px target size', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of publicPages) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const undersized = await page.locator([
      'button:visible',
      'a.button:visible',
      '.menu-button:visible',
      '.floating-whatsapp:visible',
      'input:not([type="radio"]):not([type="checkbox"]):visible',
      'select:visible',
      'textarea:visible'
    ].join(', ')).evaluateAll(controls => controls
      .map(control => {
        const rect = control.getBoundingClientRect();
        return {
          label: control.getAttribute('aria-label') || control.textContent?.trim().slice(0, 40) || control.tagName,
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      })
      .filter(control => control.width < 44 || control.height < 44));
    expect(undersized, `${route || 'index.html'} has undersized primary controls`).toEqual([]);
  }
});
