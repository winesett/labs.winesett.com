# Fold War website and launch handoff

Winesett → Winesett Labs → Fold War. Use **From Winesett Labs**. Hosted with the existing free, asset-only Labs Worker; no new hosting project or paid services.

## Permanent links

- Marketing: https://labs.winesett.com/fold-war/
- Support: https://labs.winesett.com/fold-war/support/
- Privacy: https://labs.winesett.com/fold-war/privacy/
- `/foldwar` and its support/privacy paths redirect to the corresponding hyphenated canonical paths. The app's draft marketing URL previously used this alias.
- Contact: support@winesett.com → codywinesett@gmail.com via free Cloudflare Email Routing. Gmail replies use the Gmail address. Domain registration renewals are separate from free hosting/email forwarding.

These URLs are ready to enter in the app distribution metadata after production verification. This website change does not submit the app or modify its store listing.

## Evidence used (October 16, 2026)

App source: `/Users/codywinesett/Documents/Projects/fold-war`.

- `marketing/brand-kit/v1/README.md`: palette, Fredoka and Nunito Sans, flat navigation mark and symbol. Included font licenses are served with the fonts.
- `marketing/brand-kit/v2-direction/ART-DIRECTION.md` and `dimensional-brand-proof.png`: dimensional marketing direction and original concept artwork. Copied without image modification. Folded hardware is a concept, not verified supported hardware.
- `build/verification/brand-naval-tabletop-0.4.png` and `brand-tic-tabletop-0.4.png`: actual development screenshots, labeled as such.
- `App/ConnectionView.swift` and `App/NearbyGameShell.swift`: Naval Duel + Tic-tac-toe, two devices, host/join, manual Phone/Tabletop, background disconnect, per-device layout preference.
- `Sources/FoldWarTransport/PeerSession.swift`, `NWParameters+FoldWar.swift`, `App/Info.plist`, `Package.swift`: nearby network transport, six-digit code, temporary nonpersonal host name, Local Network permission, no account/ads/analytics SDK/developer game server found in current app.
- `marketing/app-store/connect-draft/README.md`: App Store record 6823773085, 1.0 (6) saved draft, not submitted/published. No download CTA until a release is available.

Privacy policy describes app data separately from website request processing and voluntary support email. It is not a substitute for completing the App Store privacy questionnaire against the final shipping binary and its SDKs.

## Before changing to Available

- Verify the actual public download URL, supported platforms and requirements.
- Recheck current shipping binary data practices and complete App Store privacy disclosures.
- Replace development screenshots if the shipping UI differs; keep concept imagery labeled.
- Test nearby connection and gameplay on the claimed supported hardware. Do not infer folding-device compatibility from artwork or simulator screenshots.
- Confirm support email delivery with a real incoming message from a different sender; a saved routing rule is not an end-to-end mail receipt test.
- Update the hero status and CTA only when the public release is reachable.

## Maintenance

Edit the static pages in `public/fold-war/`. The three pages share `fold-war.css` and the Labs base styles. Keep navigation/footer and contact email consistent across all three. There is no JS bundle, contact form backend, tracking, or externally loaded font.

List every new public product file explicitly in `studio-pages.json`; regenerate the sitemap using `sitemapFor`. Asset filenames include versions because `/assets/` is cached as immutable; bump the filename when bytes change. Run `npm test`, `npm run verify`, and `git diff --check`, check mobile/desktop and links, then publish through the existing GitHub main deployment. Eight demo releases remain protected by SHA-256 verification.
