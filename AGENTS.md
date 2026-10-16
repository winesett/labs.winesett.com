# Winesett Labs maintenance

- This repository owns `labs.winesett.com`, its studio pages, Fold War landing page, and audited demo distribution. The sibling `winesett.com` repository owns the portfolio and canonical [domain registry](https://github.com/winesett/winesett.com/blob/main/docs/domain-registry.md).
- Brand: Winesett → Winesett Labs → product. Use **From Winesett Labs**. Keep development status truthful.
- Keep hosting and builds free. No paid plans, add-ons, or paid overages without Cody's explicit decision. Pause if a free limit is reached.
- Read `docs/maintenance.md`. Add landing pages with `npm run new-product -- slug "Name"`; share `public/labs.css`. Register studio pages in `studio-pages.json`, not the audited demo registry.
- Preserve demo directories, `releases/`, `public/labs.json`, launcher scope, and Digital Asset Links. Import changed demos with the existing audited importer; do not weaken provenance checks or classify a demo as a studio page to skip them.
- Only `public/` is deployed. Keep templates, docs, keys, raw app code, and private artifacts outside it. Product directories default to `index.html` only. For assets and support/privacy subpages, list every published file in that product’s `files` allowlist in `studio-pages.json`; the verifier requires an exact match.
- Use `codex/` branches and preserve others' changes. Run `npm test`, `npm run verify`, and `git diff --check` for tooling changes. For content changes, run verification and check the changed pages locally.
- Production is Cloudflare asset-only Worker `labs-winesett-com`. Workers Builds deploys `main` via `npm run deploy`. Preview builds are off. Do not create a duplicate Pages project or rewrite unrelated DNS.
- For new hostnames, follow the parent repository's project runbook and update its registry. Never store tokens in Git. Verify the successful Git build and live HTTPS after publishing.
- If subagents are requested, use `luna_max_fast` unless Cody specifies otherwise.
