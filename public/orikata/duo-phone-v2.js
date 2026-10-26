// Presentation only: visitors unfold the mockup; no native app state changes.
const phone = document.querySelector('.duo-toggle');
const label = document.querySelector('[data-duo-label]');
if (phone && label) {
  phone.disabled = false;
  label.hidden = false;
  phone.addEventListener('click', () => {
    const folded = phone.getAttribute('aria-pressed') !== 'true';
    phone.dataset.touched = 'true';
    phone.setAttribute('aria-pressed', String(folded));
    phone.setAttribute('aria-label', folded ? 'Unfold iPhone Duo' : 'Fold iPhone Duo');
    label.textContent = folded ? 'Tap to unfold ↗' : 'Tap to fold ↙';
  });
  // Invite once when the phone enters view; never move it without a tap.
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      phone.classList.add('duo-inviting');
      observer.disconnect();
    }
  }, { threshold: 0.55 });
  observer.observe(phone);
}
