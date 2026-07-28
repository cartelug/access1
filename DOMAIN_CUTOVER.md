# 97.world custom-domain cutover

## Current status and hard gate

At the project audit on 28 July 2026, `97.world` was parked/listed for sale and was not serving this repository. It is not an approved production origin.

Until ownership and control are proven:

- do not purchase or transfer the domain;
- do not create, delete, or edit DNS records;
- do not add a `CNAME` file;
- do not set a GitHub Pages custom domain;
- do not enable or disable GitHub Pages HTTPS settings;
- do not change canonical, Open Graph, Twitter, sitemap, robots, or manifest URLs from `https://cartelug.github.io/access1/`;
- do not redirect the GitHub Pages URL.

Domain acquisition, DNS, repository changes, and GitHub settings are external state changes. They require explicit authorization from the verified owner after the exact target records and account are reviewed.

## Preconditions for a future cutover

Do not begin until all of the following are documented:

1. The owner has proven control of `97.world` in the intended registrar account.
2. The operator has access to the correct DNS zone and has exported the existing zone as a recoverable backup.
3. The GitHub account or organization controlling `cartelug/access1` is verified and protected with appropriate access controls.
4. The chosen primary hostname is explicit: normally the apex `97.world`, with `www.97.world` redirected consistently, or the reverse.
5. The exact maintenance window, operator, approver, rollback owner, and communication path are recorded.
6. Business, legal, privacy, and platform-policy review is complete.
7. CI is green and `https://cartelug.github.io/access1/` passes desktop, mobile, not-found, metadata, and WhatsApp smoke tests.
8. A release branch or pull request contains the proposed URL changes and a tested rollback commit.

Always use the current values from [GitHub's official custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages). Do not copy stale DNS IP addresses or certificate instructions from this file.

## Planned cutover

### 1. Inventory and protect the current state

- Record the current GitHub Pages source, public URL, successful deployment commit, and Pages settings.
- Export all existing DNS records, including names, types, values, priorities, proxy state, and TTLs.
- Confirm whether mail, verification, or other services already depend on the zone.
- Capture working screenshots and run the full automated suite.
- If the DNS provider permits it, lower only the relevant TTLs ahead of the approved window. Do not disturb unrelated records.

### 2. Verify the domain with GitHub

- Add GitHub's domain-verification TXT record exactly as shown for the controlling user or organization.
- Wait for public DNS propagation and verify it from more than one resolver.
- Complete GitHub's verification flow before configuring the Pages hostname.
- Retain the verification record unless current GitHub documentation explicitly instructs otherwise.

Verification reduces takeover risk; it does not authorize the later DNS or repository changes by itself.

### 3. Prepare application URLs

In a reviewable pull request, change the temporary origin to the approved primary HTTPS hostname in:

- every canonical tag;
- Open Graph and Twitter URL/image metadata;
- structured data;
- `sitemap.xml`;
- the `Sitemap` line in `robots.txt`;
- manifest `start_url` and `scope`;
- README deployment guidance;
- automated canonical expectations.

Ensure all internal links and assets work at the domain root as well as in the preview environment. Do not merge these changes before the DNS/Pages window is approved.

### 4. Configure DNS and GitHub Pages

- Use GitHub's current official records for the selected apex and/or `www` arrangement.
- For a `www` subdomain, point only the approved CNAME at the exact GitHub Pages hostname documented for the repository owner.
- For an apex, use only GitHub's current supported apex records from the official documentation.
- Never use a wildcard DNS record for this cutover.
- Do not remove unrelated mail, TXT, verification, or service records.
- Set the approved custom domain in the repository's Pages settings, or use the repository `CNAME` mechanism if and only if it matches the configured publishing method.
- Confirm GitHub recognizes the DNS records and starts certificate provisioning.

Avoid configuring both the Pages setting and repository file inconsistently. The final publishing source must retain the same hostname on every deployment.

### 5. Validate before enforcing HTTPS

Check from multiple networks and devices:

- the chosen primary hostname resolves to GitHub Pages;
- the alternate apex/`www` hostname redirects once to the primary;
- no redirect loop or cross-domain redirect exists;
- the certificate is valid for every configured hostname;
- the GitHub Pages URL and custom hostname do not serve conflicting releases;
- all pages, assets, deep links, nested 404 routes, form fallbacks, social previews, sitemap, robots, and manifest resolve correctly;
- no browser console, mixed-content, certificate, or CORS errors appear;
- canonical and social metadata use only the approved HTTPS hostname.

Enable **Enforce HTTPS** only after GitHub has provisioned a valid certificate and the HTTPS checks pass.

### 6. Release and observe

- Merge the reviewed URL-migration pull request.
- Confirm the exact deployed commit in GitHub Pages.
- Run the full automated suite against the custom hostname by setting `PLAYWRIGHT_BASE_URL`.
- Perform manual Android, iPhone, keyboard, reduced-motion, and social-sharing checks.
- Monitor DNS, certificate, redirects, 404s, and customer handoff behavior through the agreed observation window.
- Record the final DNS state, deployment commit, validation results, and approver.

## Rollback

Rollback is required if the certificate fails, DNS points elsewhere, unrelated services break, redirects loop, the wrong repository is served, or material functionality regresses.

1. Stop further DNS and repository changes; notify the recorded owner and operator.
2. Revert the URL-migration pull request so canonical metadata again uses `https://cartelug.github.io/access1/`.
3. Remove the Pages custom-domain setting and repository `CNAME` only if those exact changes were part of the failed cutover.
4. Restore the affected DNS records from the exported pre-cutover zone. Do not modify unrelated records.
5. Disable any new redirect or proxy rule introduced by the cutover.
6. Verify `https://cartelug.github.io/access1/` serves the known-good commit and repeat the smoke tests.
7. Allow DNS caches to expire, document the cause, and require a fresh approval before retrying.

Rollback should preserve evidence and use an ordinary reviewed revert; do not rewrite branch history or destroy audit records.
