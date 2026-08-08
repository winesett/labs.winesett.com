# labs.winesett.com

Static hosting hub for audited Winesett Labs demos.

## Ownership

This repository owns:

- the landing page and public lab registry;
- the exact deploy tree under `public/`;
- the shared `/.well-known/assetlinks.json`;
- artifact import, provenance, and public-release verification;
- the Cloudflare Workers Static Assets deployment and `labs.winesett.com`
  binding.

Demo repositories own their source, tests, build, signing material, and a
deterministic audited artifact rooted at their assigned slug. They do not write
the landing page or replace the shared Digital Asset Links file.

## Import a demo

```bash
npm run import-demo -- /path/to/demo.tar.gz /path/to/demo.provenance.json
npm run verify
```

The importer validates the archive hash, every file hash, the public URL
contract, the package/certificate statement, and the archive root before it
replaces one exact demo directory.

## Deployment

The site deploys as an asset-only Cloudflare Worker from the audited `public/`
tree. It has no Worker script, server code, analytics, or paid services.

```bash
npm ci
npm run deploy
```

`wrangler.jsonc` owns the Worker name, static asset directory, 404 behavior,
and custom-domain declaration. Wrangler creates and maintains the Cloudflare
DNS/custom-domain association during deployment.
