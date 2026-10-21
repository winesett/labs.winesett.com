// Writes reviewable fragments outside public/. Never releases or deploys the app/site.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import QRCode from 'qrcode';
import {installLinks,smartBanner,installBlock,videoMarkup} from './lib/foldwar-launch.mjs';
const root=resolve(import.meta.dirname,'..');
const config=JSON.parse(await readFile(resolve(root,'docs/foldwar-launch/config.json'),'utf8'));
const out=resolve(root,'docs/foldwar-launch/prepared');
await mkdir(out,{recursive:true});
const links=installLinks(config);
for (const [placement,url] of Object.entries(links)) {
  await QRCode.toFile(resolve(out,`${placement}-app-store.png`),url,{width:240,margin:4,errorCorrectionLevel:'M'});
  const block=installBlock(url,`${placement}-app-store.png`);
  await writeFile(resolve(out,`${placement}-install.html`),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Fold War install preview — not published</title><style>body{font:18px system-ui;max-width:800px;margin:40px auto;padding:20px}a{display:inline-block;padding:15px;background:#142bb8;color:white}img{width:180px;height:180px}</style></head><body><p><strong>LOCAL PREVIEW — not published. Public App Store availability must be verified before activation.</strong></p>${block}</body></html>`);
  await writeFile(resolve(out,`${placement}-snippet.txt`),smartBanner(config,placement)+'\n'+installBlock(url,`/foldwar/assets/${placement}-app-store.png`)+'\n');
}
await writeFile(resolve(out,'links.json'),JSON.stringify({publicReleaseVerified:config.publicReleaseVerified,campaignAttribution:config.providerToken!==null,links},null,2)+'\n');
if (config.video) {
  const markup=videoMarkup(config.video);
  for (const key of ['mp4','poster','captions']) await readFile(resolve(root,'public'+config.video[key]));
  const template=await readFile(resolve(root,'templates/foldwar-launch/watch.html'),'utf8');
  await writeFile(resolve(out,'watch.html'),template.replace('<!-- video-content -->',markup));
  await writeFile(resolve(out,'homepage-video-snippet.txt'),`<section class="fw-wrap fw-launch-video"><h2>See Fold War in action</h2><video controls playsinline preload="metadata" poster="${config.video.poster}"><source src="${config.video.mp4}" type="video/mp4"><track kind="captions" src="${config.video.captions}" srclang="en" label="English" default></video><p><a href="/foldwar/watch/">Watch with transcript</a></p></section>\n`);
}
console.log('Prepared launch fragments in docs/foldwar-launch/prepared. Nothing published.');
console.log('Release verified:',config.publicReleaseVerified,'Campaign token present:',config.providerToken!==null,'Video ready:',Boolean(config.video));
