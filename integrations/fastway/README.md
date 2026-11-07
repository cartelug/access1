# Fastway SMM-compatible catalogue: deployment guide

This is a **prepared, not-yet-live** integration for the 97.world GitHub Pages
site. The browser never contacts the supplier directly. The Cloudflare Worker
reads live service metadata using server-side secrets, strips wholesale rates,
and displays only approved descriptive metadata on the follower order page.

## Current state

- Fastway's actual SMM endpoint and API key have not been supplied or tested.
- The example records with service IDs 1 and 2 are common SMM API documentation
  examples and are **not verified Fastway inventory**.
- The user-facing order workflow remains WhatsApp enquiry and human review.
- No automated orders, cancellations, refills, payments or account changes exist.
- The optional public catalogue is disabled until a real proxy is deployed and
  its URL is entered into the frontend. The page explains the manual check.

## Deploy the proxy

1. Verify the real **Fastway SMM panel** API URL from your Fastway account.
   This is not the unrelated Fastway parcel-delivery service.
2. Check that the panel supports the common SMM form-encoded POST convention
   with the fields key and action=services. Do not guess its endpoint.
3. Deploy integrations/fastway/worker.mjs as a Cloudflare Worker.
4. In the Worker environment, configure:
   - FASTWAY_API_URL: verified HTTPS SMM API URL.
   - FASTWAY_API_KEY: your account's API key, saved as a hosting **secret**.
   - SITE_ORIGIN: https://cartelug.github.io (no /access1/ path).
5. Configure edge rate limiting and optional short-lived caching to keep public
   traffic from exhausting upstream API limits.
6. Test GET /services with the site's Origin header. The result should include
   validated service metadata only and never raw supplier wholesale rates.
7. Set data-endpoint on the data-supplier-catalog element in followers.html to
   your deployed HTTPS Worker URL ending in /services. Until this step, the
   frontend does **not** call a supplier API.
8. Run the site checks and test the order builder, WhatsApp fallback, mobile
   navigation, and supplier error handling before making changes live.

## Testing

Requires Node.js 20 or newer.

    node --test integrations/fastway/worker.test.mjs

The adapter normalizes supplier records, rejects malformed limits, checks the
allowed browser Origin, supports only catalogue reads, never exposes the key,
and does not return supplier errors to customers.

## Notes

- Never commit a real API key, even in a private GitHub repository.
- Provider service IDs, prices and limits may change. The provided example does
  not verify Fastway service ID 1, 2 or 2208.
- Refill and cancel indicate supplier capability only, not a customer guarantee.
- Checkout, payments, fulfilment, idempotency, authenticated staff order creation,
  customer-status notifications, and pricing markups require a separate reviewed
  implementation. A public unauthenticated order API would be unsafe.
- No supplier endpoint is trusted until the owner confirms the account and
  provider-specific API protocol.
