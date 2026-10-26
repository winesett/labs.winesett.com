// Presentation only: the browser toggles a hinged mockup, not the native app.
const phone = document.querySelector('.duo-toggle');
const label = document.querySelector('[data-duo-label]');
if (phone && label) {
  phone.disabled = false;
  label.hidden = false;
  phone.addEventListener('click', () => {
    const folded = phone.getAttribute('aria-pressed') !== 'true';
    phone.setAttribute('aria-pressed', String(folded));
    phone.setAttribute('aria-label', folded ? 'Open iPhone Duo' : 'Fold iPhone Duo');
    label.textContent = folded ? 'Tap to open' : 'Tap to fold';
  });
}
