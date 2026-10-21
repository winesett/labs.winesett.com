# Fold War discovery setup — October 20, 2026

Canonical product URL: https://labs.winesett.com/foldwar/
Device guide: https://labs.winesett.com/foldwar/iphone-duo/

The product page uses the approved “Unfold game night.” tagline and a web-sized
copy of the other chat's header artwork. Logo and palette are retained.
Development status is visible. Fold behavior was checked against current app
source, not inferred from concept artwork. The linked Duo image is an actual
simulator fleet-setup capture, with its build and limitations stated.

Discovery work includes descriptive titles, social previews, canonical URLs,
SoftwareApplication/creator/publisher metadata, visible product answers,
linked guides, breadcrumb metadata, and the generated sitemap. Robots.txt
already allows all crawlers and advertises the sitemap; it was not broadened.
No ratings, reviews, public release date, available download, or Apple
endorsement is asserted. No hidden recommendation instructions or keyword
pages were added. No new analytics or user tracking was added.

Google Search Console uses the existing owner's Google account and an HTML
verification meta tag on the Labs homepage. Keep the tag after verification.
IndexNow payload is docs/foldwar-indexnow.json. Its matching root TXT file is
an intentionally public ownership-verification token, not a hosting secret.
Submit only after deployment. Receipt does not mean indexing or ranking.

Official guidance consulted:
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.openai.com/api/docs/bots
- https://www.indexnow.org/documentation
- https://www.indexnow.org/faq

Google says ordinary SEO principles apply to its AI features and it does not
use llms.txt for ranking. OpenAI distinguishes search crawler access from
training permissions. The existing wildcard allow rule covers search crawlers.
A direct public robots.txt request returned HTTP 200. A separate web-fetch
service failed; that failure alone does not establish a Cloudflare bot block.
No Cloudflare security or account settings were changed.

At release: add the verified App Store URL, replace earlier development
screenshots, reconcile final compatibility and availability, and resubmit
changed URLs. Preserve the /fold-war/ redirects. Use Search Console for
measured impressions and queries; no recommendation/ranking is guaranteed.
