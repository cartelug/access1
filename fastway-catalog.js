(() => {
  'use strict';
  const root = document.querySelector('[data-supplier-catalog]');
  if (!root) return;

  // No supplier API calls until the secure backend is configured.
  const endpoint = root.getAttribute('data-endpoint')?.trim();
  if (!endpoint) return;
  const status = root.querySelector('[data-supplier-status]');
  const list = root.querySelector('[data-supplier-list]');
  if (!status || !list) return;

  let url;
  try {
    url = new URL(endpoint);
    if (url.protocol !== 'https:') return;
  } catch { return; }
  status.textContent = 'Checking service options…';

  fetch(url.toString(), {
    method: 'GET', mode: 'cors', credentials: 'omit',
    headers: { Accept: 'application/json' }
  }).then(response => {
    if (!response.ok) throw new Error('Catalogue unavailable');
    return response.json();
  }).then(data => {
    if (!data?.live || !Array.isArray(data.services)) throw new Error('Invalid catalogue');
    const services = data.services.filter(service =>
      Number.isSafeInteger(service.id) && typeof service.name === 'string'
      && Number.isSafeInteger(service.min) && Number.isSafeInteger(service.max)
      && service.min > 0 && service.max >= service.min
      && /followers?|comments?/i.test(service.name)
    ).slice(0, 8);

    list.replaceChildren();
    services.forEach(service => {
      const item = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = service.name.slice(0, 100);
      const details = document.createElement('span');
      details.textContent = 'Quantity: ' +
        service.min.toLocaleString() + '–' + service.max.toLocaleString() +
        (service.refill === true ? ' · Refill option' : '') +
        (service.cancel === true ? ' · Cancellation option' : '');
      item.append(name, details);
      list.append(item);
    });
    list.hidden = services.length === 0;
    status.textContent = services.length
      ? 'Supplier-listed options are for reference. Our team confirms final eligibility, availability and price.'
      : 'No matching services are currently listed. Ask our team for options.';
  }).catch(() => {
    list.hidden = true;
    status.textContent = 'Live service options could not be checked. Our team can confirm availability on WhatsApp.';
  });
})();
