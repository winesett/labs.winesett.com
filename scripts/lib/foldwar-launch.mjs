export const placements = { home: 'fw_home', duo: 'fw_duo_guide', press: 'fw_press' };
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installLinks(config) {
  if (config.appStoreId !== '6823773085') throw Error('Expected the verified Fold War App Store ID.');
  if (config.providerToken !== null && !/^\d+$/.test(config.providerToken)) throw Error('Use the real numeric provider token from App Store Connect, or null.');
  return Object.fromEntries(Object.entries(placements).map(([name, token]) => {
    const url = new URL(`https://apps.apple.com/us/app/id${config.appStoreId}`);
    if (config.providerToken !== null) { url.searchParams.set('pt',config.providerToken); url.searchParams.set('ct',token); url.searchParams.set('mt','8'); }
    return [name,url.href];
  }));
}
export function smartBanner(config, placement) {
  installLinks(config);
  if (!Object.hasOwn(placements,placement)) throw Error('Unknown placement.');
  return `<meta name="apple-itunes-app" content="app-id=${config.appStoreId}">`;
}
export function installBlock(url, qrPath) {
  return `<section class="fw-wrap fw-install" aria-labelledby="install-title"><div><h2 id="install-title">Get Fold War</h2><p>Free on the U.S. App Store. Check the listing for current device compatibility.</p><a class="fw-button" href="${escapeHtml(url)}">Download on the App Store</a></div><figure><img src="${escapeHtml(qrPath)}" width="240" height="240" alt="Scan to open Fold War on the U.S. App Store"><figcaption>Scan with your iPhone or iPad</figcaption></figure></section>`;
}
export function videoMarkup(video) {
  if (!video || !['title','description','transcript','uploadDate','duration','mp4','poster','captions'].every(k=>typeof video[k]==='string'&&video[k].trim())) throw Error('Supply the actual video, poster, captions, transcript and metadata.');
  if (!/^PT\d+(?:\.\d+)?S$/.test(video.duration) || !/^\d{4}-\d{2}-\d{2}T/.test(video.uploadDate) || Number.isNaN(Date.parse(video.uploadDate))) throw Error('Use actual ISO uploadDate and duration.');
  for (const [key,ext] of [['mp4','mp4'],['poster','jpg'],['captions','vtt']]) if (!new RegExp(`^/foldwar/assets/[a-z0-9-]+\\.${ext}$`).test(video[key])) throw Error(`Invalid ${key} asset path.`);
  const schema={'@context':'https://schema.org','@type':'VideoObject',name:video.title,description:video.description,thumbnailUrl:'https://labs.winesett.com'+video.poster,contentUrl:'https://labs.winesett.com'+video.mp4,uploadDate:video.uploadDate,duration:video.duration};
  return `<h1>${escapeHtml(video.title)}</h1><video controls playsinline preload="metadata" poster="${escapeHtml(video.poster)}"><source src="${escapeHtml(video.mp4)}" type="video/mp4"><track kind="captions" src="${escapeHtml(video.captions)}" srclang="en" label="English" default>Your browser cannot play this video. <a href="${escapeHtml(video.mp4)}">Download the video</a>.</video><p>${escapeHtml(video.description)}</p><h2>Transcript</h2><p>${escapeHtml(video.transcript)}</p><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`;
}
