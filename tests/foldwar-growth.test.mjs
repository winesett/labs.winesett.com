import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {installLinks,smartBanner,videoMarkup} from '../scripts/lib/foldwar-launch.mjs';
const config={appStoreId:'6823773085',providerToken:null};

test('prepared install links remain untracked until a real provider token exists',()=>{
  const links=installLinks(config);
  assert.equal(links.home,'https://apps.apple.com/us/app/id6823773085');
  assert.equal(new URL(links.home).search,'');
  assert.doesNotMatch(smartBanner(config,'home'),/affiliate-data/);
  const tracked=installLinks({...config,providerToken:'123456'});
  assert.equal(new URL(tracked.home).searchParams.get('ct'),'fw_home');
  assert.equal(new URL(tracked.duo).searchParams.get('ct'),'fw_duo_guide');
  assert.equal(new URL(tracked.press).searchParams.get('pt'),'123456');
  assert.throws(()=>installLinks({...config,appStoreId:'wrong'}));
  assert.throws(()=>installLinks({...config,providerToken:'example'}));
});

test('video requires real metadata and restricted public asset paths; escapes transcript',()=>{
  assert.throws(()=>videoMarkup(null));
  const video={title:'Fold War',description:'Demo',transcript:'<script>alert(1)</script>',uploadDate:'2026-10-20T12:00:00-04:00',duration:'PT18S',mp4:'/foldwar/assets/demo.mp4',poster:'/foldwar/assets/demo.jpg',captions:'/foldwar/assets/demo.vtt'};
  const html=videoMarkup(video);
  assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<script>alert/);
  assert.match(html,/kind="captions"/);
  assert.throws(()=>videoMarkup({...video,mp4:'https://example.com/demo.mp4'}));
});

const home=await readFile(new URL('../public/foldwar/index.html',import.meta.url),'utf8');
const shareSource=home.match(/<script type="module" id="foldwar-share-script">([\s\S]*?)<\/script>/)[1];
function shareHarness(navigator={}) {
  const callbacks={}; const input={value:'https://labs.winesett.com/foldwar/',focus(){this.focused=true},select(){this.selected=true}};
  const status={textContent:''}; const details={open:false,querySelector:()=>input};
  const buttons=Object.fromEntries(['share','copy'].map(name=>[name,{hidden:true,disabled:false,addEventListener:(_,fn)=>{callbacks[name]=fn}}]));
  const selectors={'input':input,'[role="status"]':status,'details':details,'[data-copy]':buttons.copy,'[data-share]':buttons.share};
  runInNewContext(shareSource,{navigator,document:{querySelector:()=>({querySelector:s=>selectors[s]})}});
  return {callbacks,input,status,details,buttons};
}
test('copy fallback stays usable when clipboard is unavailable or denied',async()=>{
  for (const navigator of [{},{clipboard:{writeText:async()=>{throw Error('denied')}}}]) {
    const h=shareHarness(navigator); await h.callbacks.copy();
    assert.equal(h.details.open,true); assert.equal(h.input.selected,true); assert.equal(h.buttons.share.hidden,true);
  }
});
test('copy writes only the public canonical link and confirms success',async()=>{
  let copied;const h=shareHarness({clipboard:{writeText:async text=>{copied=text}}});await h.callbacks.copy();
  assert.equal(copied,h.input.value);assert.equal(h.status.textContent,'Link copied.');
});
test('cancelled native sharing does not copy or send a second time',async()=>{
  let copied=false;const h=shareHarness({share:async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'})},clipboard:{writeText:async()=>{copied=true}}});
  await h.callbacks.share();assert.equal(copied,false);assert.equal(h.details.open,false);assert.equal(h.buttons.share.disabled,false);assert.equal(h.status.textContent,'Sharing cancelled.');
});
test('all enhanced pages use the tested share handler and public release remains gated',async()=>{
  for(const path of ['iphone-duo/index.html','nearby-play/index.html','press/index.html']) {
    const html=await readFile(new URL('../public/foldwar/'+path,import.meta.url),'utf8');
    assert.equal(html.match(/<script type="module" id="foldwar-share-script">([\s\S]*?)<\/script>/)[1],shareSource);
    assert.doesNotMatch(html,/name="apple-itunes-app"|href="https:\/\/apps.apple.com/);
  }
});
