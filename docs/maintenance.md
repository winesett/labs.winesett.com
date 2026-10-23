# Studio maintenance

The cross-project [domain registry](https://github.com/winesett/winesett.com/blob/main/docs/domain-registry.md) and [subdomain runbook](https://github.com/winesett/winesett.com/blob/main/docs/project-runbook.md) live in the parent brand repository. Locally, use the sibling `../winesett.com/docs/` directory.

## New product

```sh
npm ci
npm run new-product -- my-product "My Product"
npm run verify
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
```

The command creates `public/my-product/index.html` from `templates/product.html`, registers its slug/title in `studio-pages.json`, and updates `public/sitemap.xml`. It refuses to overwrite an existing route. It does not create a domain or publish anything.

Edit the copy and status; add the product link to a suitable category in `public/index.html`. Review the page at desktop and mobile sizes. Keep **From Winesett Labs** attribution. Reuse `public/labs.css` and `public/labs-favicon.svg`. For imagery or support/privacy subpages, add a `files` array to the product entry in `studio-pages.json`, including `index.html` and every file to publish. The verifier requires an exact file match and accepts only page, style, image, font, license-text, and explicitly registered ZIP/video/caption/PDF license files. Keep raw source and private material outside `public/`. Product CSS may extend `labs.css` with its own brand. Use versioned filenames for assets because asset URLs are cached as immutable. Regenerate `public/sitemap.xml` with `sitemapFor` from `scripts/lib/studio-pages.mjs`; nested `index.html` files become sitemap routes. See Fold War for an example.

`studio-pages.json` describes simple editorial pages. `public/labs.json` and `releases/` describe audited runnable demos. Do not mix them. A new demo still uses `npm run import-demo -- archive provenance` and the existing release checks.

## Release

Work on a `codex/` branch, inspect the diff, then merge approved work to `main` and push. No hosted preview is needed. Workers Builds automatically runs `npm run deploy`, including `npm run verify`. For changes to tooling, also run `npm test` locally before merging.

Check the GitHub **Workers Builds: labs-winesett-com** result and open the live changed pages. Keep the existing custom-domain binding. Normal deployment does not need a local Cloudflare login or GitHub Actions secrets.

The site is asset-only, with no runtime server or paid add-ons. Keep Free selected. If a free quota is reached, wait or reduce work rather than upgrading.

## Rollback and project moves

Revert the bad commit in Git, run checks, merge and push the revert. If a dashboard rollback is used urgently, reconcile Git before the next deployment. Preserve existing route URLs and audited file hashes.

New ideas start as Labs paths. When a product needs its own subdomain, use the parent runbook: reserve its name, create its separate owner repository and hosting project, verify the new URL, then redirect the old landing page and update the central registry. Do not copy the Labs Android associations or entire demo library into a new product repository.

## Presentation-only enhancements

A product marketing page may declare a `presentation` object with a nonempty `description` and an exact `files` array for reviewed JavaScript/GLB presentation assets. Each file must also occur in the product’s main `files` allowlist. This opt-in is for product illustrations and page controls, not runnable applications: those still require the audited demo importer and provenance registry. Unregistered runtime assets, extra files, traversal, symlinks, and studio/demo route collisions continue to fail verification.

Relay’s `/relay/` marketing page is adapted from `Projects/alexa-universal/marketing/`. Its runtime only renders the Dot, controls scrolling/motion, and selects agent copy. It contains no Alexa service, agent execution, user input dispatch, source archive, live configuration, or credentials. Asset names carry content hashes for the immutable assets cache. The model, poster, brand artwork, fonts, and licenses are explicitly listed; `credits.txt` records attribution. Update the marketing source and carefully re-import reviewed web files when changing Relay. Do not copy its local server, model conversion tools, raw USDZ, screenshots, or source packaging output into `public/`.
