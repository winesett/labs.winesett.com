# Website launch handoff

## Published now
- `/foldwar/press/`: downloadable asset ZIP, individual original screenshots,
  logo, concept art, fact sheet and public contact. Pre-release status retained.
- Sharing controls on the homepage, Duo guide, nearby guide and press page:
  native share when supported, copy link, and an accessible manual fallback.
- Desktop QR opens the canonical homepage on a phone; it does not promise a download.
- Duo guide includes current build minimum OS versions, fold-specific requirement,
  offline behavior, multiplayer setup and the physical-test limitation.

## Prepared, not public
Run `node scripts/prepare-foldwar-launch.mjs` to regenerate the install blocks,
Smart App Banner meta tags and per-placement App Store QR codes in `prepared/`.
They use the real app ID 6823773085. This command never modifies public files,
releases the app or deploys the site. The current config deliberately has no
provider token and no video. Prepared links are plain links until a real provider
token is supplied; do not claim campaign attribution yet.

### Release activation
1. Confirm the U.S. public App Store page is downloadable, then set
   `publicReleaseVerified` true in config.json. The other chat owns release.
2. Confirm final OS/device compatibility and price. Update development status in
   site copy, JSON-LD, press facts and ZIP consistently. Replace any older screenshots.
3. Add each prepared banner tag to its page head. Put its install block in the
   `foldwar-install-slot` on home, Duo and press pages; copy its QR into assets.
4. Preserve current plain-link functionality until campaign analytics are available.
   Apple says a new app needs analytics data before campaign generation is enabled.
   Obtain the real provider token in App Store Connect Analytics, set providerToken,
   regenerate, and replace the three links and QR codes. Campaigns: fw_home,
   fw_duo_guide, fw_press. Never reuse an invented/example token.
5. Register added public assets in studio-pages.json. Run tests, verify, diff checks
   and desktop/mobile browser checks; publish through the existing Git build.
6. Submit changed URLs through IndexNow. Google already has the sitemap. Compare
   Search Console queries/clicks and App Store campaign downloads after data accrues.
   Apple applies a minimum metric threshold of five, so absent data is not zero.

### 18-second video edit brief
Use actual final-build footage supplied by the game chat. No app testing or
simulator recording is performed by this website task.
- 0–3s: game menu, overlay “Unfold game night.”
- 3–7s: continuous actual fold/layout transition; label simulator footage if used.
- 7–13s: choose and fire a Naval Duel target, show response.
- 13–16s: tic-tac-toe move or result.
- 16–18s: logo and verified release CTA; no download CTA before release.
Export H.264 MP4 under 25 MiB, actual frame JPG poster, English WebVTT captions,
and an accurate transcript. No autoplay or flashing transitions. Do not substitute
animated screenshots for evidence of working fold behavior.

The watch-page template and homepage video markup are ready. Set config.video to
an object with title, description, transcript, actual ISO uploadDate, ISO duration
(e.g. PT18S only for an actual 18-second edit), and mp4/poster/captions public paths
under `/foldwar/assets/` with .mp4/.jpg/.vtt extensions. Supply those real files,
then rerun the generator. It refuses missing media/metadata. Inspect the output,
install the watch page at `/foldwar/watch/`, insert the homepage snippet at
`foldwar-video-slot`, add files to the allowlist, regenerate the sitemap and verify.
No empty watch page or fabricated VideoObject metadata is published now.

Sources checked October 20, 2026:
- https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links
- https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners
- https://developers.google.com/search/docs/appearance/video

Dependency audit: npm reports existing sharp/wrangler/miniflare/undici advisories
in the development toolchain. The newly added QR generator is build-time only;
no browser dependency is loaded. Hosting-tool upgrades are outside this change.
