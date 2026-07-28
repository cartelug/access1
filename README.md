# 97.world

97.world is a static, follower-first service website for social growth enquiries and limited streaming support. Its temporary production origin and canonical URL is:

<https://cartelug.github.io/access1/>

The visible 97.world brand is intentional. The `97.world` domain is not connected to this repository and must not be treated as the production origin until the ownership and cutover gates in [DOMAIN_CUTOVER.md](DOMAIN_CUTOVER.md) are complete.

## Architecture

The production site has no runtime package dependencies, backend, database, account system, analytics, or client-side storage.

- `index.html` is the primary landing page.
- `followers.html` contains the social growth request builder.
- `streaming.html` contains the streaming support request.
- `contact.html` contains the support request.
- `terms.html` and `privacy.html` contain foundational policy notices.
- `404.html` is the GitHub Pages-compatible not-found route.
- `styles.css` contains the shared visual and responsive system.
- `script.js` contains progressive interaction, navigation, animation, query preselection, validation, and WhatsApp handoff behavior.
- `assets/` contains first-party brand, platform, hero, social-preview, icon, and media files.
- `scripts/` and `tests/` contain development-only quality checks.

All deployed links and assets must work from the GitHub Pages `/access1/` project subpath. Avoid root-relative paths that unintentionally point to `https://cartelug.github.io/`.

## Local preview

Node.js 20 or newer is required for development and testing.

```sh
npm ci
npm run preview
```

Open <http://127.0.0.1:4173/access1/>. The preview server deliberately reproduces the GitHub Pages project subpath and serves `404.html` for missing routes.

The site itself can also be viewed through any static HTTP server, but opening HTML directly from the filesystem is not a reliable test of URLs, modules, manifests, or not-found behavior.

## Quality checks

Install Chromium once after `npm ci`:

```sh
npx playwright install chromium
```

If browser downloads are unavailable, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing Chromium or Chrome executable before running the suite. CI leaves this variable unset and uses Playwright's pinned browser.

Then run:

```sh
npm run check:static
npm run check:diff
npm run test:e2e
npm run test:a11y
npm test
```

`npm run check:static` uses only built-in Node APIs. It validates local links, fragments, referenced assets, duplicate IDs, accessible form labels, privacy-safe form methods, external-link safety, canonical and social metadata, the manifest, `robots.txt`, and `sitemap.xml`. `npm run check:diff` runs Git's whitespace diagnostics against local changes.

Playwright covers page smoke tests, allowed and adversarial query parameters, mobile navigation and focus, reduced-motion readability, form validation, WhatsApp URL construction without sending a real message, blocked-popup recovery, JavaScript-disabled behavior, nested-path 404 behavior, responsive overflow, and axe accessibility checks. Serious or critical WCAG violations fail the suite.

GitHub Actions runs the same static, browser, and accessibility gates on pushes and pull requests. The workflow has read-only repository permissions and does not deploy or change GitHub Pages settings.

## Enquiry and privacy model

The forms are WhatsApp handoffs, not submissions to a 97.world server:

1. The browser validates and normalizes the entered values.
2. JavaScript creates a structured `https://wa.me/` URL.
3. The browser attempts to open WhatsApp in a new context.
4. If that attempt is blocked, the page exposes an accessible link containing the prepared request so the customer can continue deliberately.

The site does not persist form values, place them in first-party logs or storage, send them to analytics, or submit them to this GitHub Pages origin. Forms use an explicit non-GET method as a defense against personal data appearing in the current page URL. With JavaScript disabled, named inputs are unavailable and a direct WhatsApp contact path is shown without customer data.

WhatsApp and the customer's device may process the information after the customer chooses to continue. Customers must never be asked for social-platform passwords, one-time codes, or private login credentials.

## Canonical URL and deployment

The temporary canonical origin is `https://cartelug.github.io/access1/`. Canonical tags, Open Graph URLs, Twitter sharing metadata, `sitemap.xml`, `robots.txt`, and the web app manifest must remain aligned with that origin.

GitHub Pages publication is controlled by the repository's existing Pages configuration. Merging deployable files to the configured publishing source updates the public site. The quality workflow in `.github/workflows/ci.yml` is intentionally separate and cannot publish.

Do not add `CNAME`, alter DNS, change the Pages custom-domain field, or replace canonical URLs with `https://97.world/` until domain ownership is verified and a separate release is approved. See [DOMAIN_CUTOVER.md](DOMAIN_CUTOVER.md).

## Performance budget

Keep the static runtime small and predictable:

- combined uncompressed first-party CSS and JavaScript: target at most 150 KiB;
- each responsive hero image variant: target at most 350 KiB;
- critical above-the-fold first-party transfer: target at most 500 KiB;
- social sharing image: approximately 1200×630 and target at most 500 KiB;
- noncritical media: lazy loaded with stable intrinsic dimensions or aspect ratios.

Development dependencies are never shipped to browsers. Any budget exception should be measured, explained in the pull request, and approved before merge.

## Owner release checklist

Engineering can verify behavior, but it cannot invent or approve business and legal facts. Before merging a production release, the owner must confirm:

- reference prices, package names, availability language, delivery wording, and refund expectations are accurate;
- the social-growth and streaming offerings comply with all applicable platform, supplier, payment, and local legal requirements;
- the business identity, office location, service markets, WhatsApp number, and privacy contact details are accurate;
- Terms and Privacy have received appropriate legal review, including retention and third-party processing;
- no testimonial, customer count, live-status claim, guarantee, affiliation, or performance promise is unsupported;
- the site never requests passwords, login codes, or other private credentials;
- WhatsApp handoffs are tested manually on current Android and iPhone devices without exposing real customer information in test evidence;
- every required CI check is green and the draft pull request's before/after evidence has been reviewed;
- the live GitHub Pages site is smoke-tested after merge and the rollback commit is known;
- custom-domain ownership, DNS changes, GitHub Pages settings, and canonical migration remain a separate explicit approval.

Do not add analytics, trackers, advertising pixels, a form processor, or a backend as part of routine maintenance. Each would change the privacy model and requires a separate technical and legal decision.
