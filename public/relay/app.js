'use strict';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('#motion-toggle');
let paused = reducedMotion.matches;
function applyMotionPreference() {
  document.body.classList.toggle('motion-paused', paused);
  document.documentElement.style.scrollBehavior = paused ? 'auto' : '';
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.innerHTML = paused ? '<span aria-hidden="true">▷</span> Resume motion' : '<span aria-hidden="true">Ⅱ</span> Pause motion';
  window.dispatchEvent(new CustomEvent('relay-motion', {detail: {paused}}));
}
motionButton.addEventListener('click', () => { paused = !paused; applyMotionPreference(); });
reducedMotion.addEventListener('change', event => {paused = event.matches; applyMotionPreference();});
applyMotionPreference();

const examples = {
  grok: {
    name: 'Grok',
    phrase: '“Alexa, relay Grok to summarize my new X.com bookmarks.”'
  },
  muse: {
    name: 'Muse',
    phrase: '“Alexa, relay Muse to look up new Echo devices on Marketplace.”'
  },
  dot: {
    name: 'Dot',
    phrase: '“Alexa, relay Dot to pick up my project research.”'
  }
};
let selected = 'grok';
function setText(selector, text) { document.querySelector(selector).textContent = text; }
function selectAgent(agent) {
  const example = examples[agent];
  if (!example) return;
  selected = agent;
  document.querySelectorAll('[data-agent]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.agent === agent)));
  setText('#agent-heading-name', `${example.name}.`);
  setText('#agent-command', example.phrase);
}
window.addEventListener('relay-agent', event => {
  if (event.detail.agent !== selected) selectAgent(event.detail.agent);
});
document.querySelectorAll('[data-agent]').forEach(button => button.addEventListener('click', () => selectAgent(button.dataset.agent)));
