'use strict';
(() => {
  const menu = document.getElementById('menu');
  const panel = document.getElementById('onlinePanel');
  const card = document.getElementById('lobbyCard');
  if (!menu || !panel || !card) return;
  let wasVisible = false;
  let revealFrame = 0;
  function sync() {
    const visible = !menu.hidden && !panel.hidden && !card.hidden;
    panel.classList.toggle('has-room', !card.hidden);
    if (visible && !wasVisible) {
      cancelAnimationFrame(revealFrame);
      revealFrame = requestAnimationFrame(() => {
        if (menu.hidden || panel.hidden || card.hidden) return;
        // Close the mobile keyboard before revealing the new room card.
        card.focus({preventScroll: true});
        const details = card.closest('.lobby-details');
        if (details) details.scrollTop = 0;
      });
    }
    wasVisible = visible;
  }
  const observer = new MutationObserver(sync);
  for (const element of [menu, panel, card]) {
    observer.observe(element, {attributes: true, attributeFilter: ['hidden']});
  }
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    const details = menu.querySelector('.lobby-details');
    if (details) details.scrollTop = 0;
  }));
  sync();
})();
