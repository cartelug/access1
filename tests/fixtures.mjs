import { expect, test as base } from '@playwright/test';

export async function stubExternalFonts(target) {
  await target.route('https://fonts.googleapis.com/**', route => route.fulfill({
    status: 200,
    contentType: 'text/css; charset=utf-8',
    body: '/* External fonts are intentionally stubbed during deterministic tests. */'
  }));
  await target.route('https://fonts.gstatic.com/**', route => route.fulfill({
    status: 204,
    body: ''
  }));
}

const test = base.extend({
  externalFonts: [async ({ context }, use) => {
    await stubExternalFonts(context);
    await use();
  }, { auto: true }]
});

export { expect, test };
