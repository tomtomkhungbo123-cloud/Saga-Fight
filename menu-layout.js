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
        card.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'instant'});
      });
    }
    wasVisible = visible;
  }
  const observer = new MutationObserver(sync);
  for (const element of [menu, panel, card]) {
    observer.observe(element, {attributes: true, attributeFilter: ['hidden']});
  }
  sync();
})();
