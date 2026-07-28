import { expect } from '@playwright/test';

export const publicPages = [
  '',
  'followers.html',
  'streaming.html',
  'contact.html',
  'terms.html',
  'privacy.html'
];

export function watchRuntimeErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

export function expectNoRuntimeErrors(errors) {
  expect(errors, errors.join('\n')).toEqual([]);
}

export async function fillFollowerForm(page) {
  const form = page.locator('#follower-order-form');
  await form.locator('input[name="platform"][value="Instagram"]').check();
  await form.locator('input[name="package"][value^="1,000"]').check();
  await form.locator('[name="profileLink"]').fill('https://instagram.com/qa_public_profile');
  await form.locator('[name="country"]').selectOption({ label: 'Uganda' });
  await form.locator('[name="delivery"]').selectOption({ label: 'Gradual delivery' });
  await form.locator('[name="name"]').fill('QA Test Customer');
  await form.locator('[name="phone"]').fill('+256700000000');
  await form.locator('input[type="checkbox"][required]').check();
  return form;
}

export async function fillStreamingForm(page) {
  const form = page.locator('#streaming-order-form');
  await form.locator('input[name="service"][value="Prime Video"]').check();
  await form.locator('[name="duration"]').selectOption({ label: '1 month' });
  await form.locator('[name="devices"]').selectOption({ label: '1 device' });
  await form.locator('[name="country"]').selectOption({ label: 'Uganda' });
  await form.locator('[name="deviceType"]').selectOption({ label: 'Smart TV' });
  await form.locator('[name="name"]').fill('QA Test Customer');
  await form.locator('[name="phone"]').fill('+256700000000');
  await form.locator('input[type="checkbox"][required]').check();
  return form;
}

export async function fillContactForm(page) {
  const form = page.locator('#contact-form');
  await form.locator('[name="name"]').fill('QA Test Customer');
  await form.locator('[name="phone"]').fill('+256700000000');
  await form.locator('[name="topic"]').selectOption({ label: 'General support' });
  await form.locator('[name="message"]').fill('Please help me verify the ordering process.');
  return form;
}

export async function readCapturedWhatsAppUrl(page) {
  await expect.poll(
    () => page.evaluate(() => window.__qaOpenedUrls?.length || 0),
    { message: 'Expected the form to attempt a WhatsApp handoff' }
  ).toBeGreaterThan(0);
  return page.evaluate(() => window.__qaOpenedUrls.at(-1));
}

export function expectWhatsAppUrl(value, expectedText) {
  const url = new URL(value);
  expect(url.protocol).toBe('https:');
  expect(url.hostname).toBe('wa.me');
  expect(url.pathname).toBe('/256762193386');
  expect(url.searchParams.get('text') || '').toContain(expectedText);
  expect(value.length).toBeLessThanOrEqual(4_096);
}
