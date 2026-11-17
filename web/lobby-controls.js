'use strict';
(() => {
  const select = document.getElementById('difficulty');
  const trigger = document.getElementById('difficultyTrigger');
  const value = document.getElementById('difficultyValue');
  const field = document.getElementById('difficultyLabel');
  if (!select || !trigger || !value || !field) return;
  const menu = document.createElement('div');
  menu.id = 'difficultyMenu';
  menu.className = 'difficulty-menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-labelledby', 'difficultyCaption');
  menu.hidden = true;
  const options = Array.from(select.options, option => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'option');
    button.dataset.value = option.value;
    button.textContent = option.textContent;
    button.tabIndex = -1;
    button.addEventListener('click', () => {
      select.value = option.value;
      select.dispatchEvent(new Event('change', {bubbles: true}));
      close(true);
    });
    menu.append(button);
    return button;
  });
  document.body.append(menu);
  function sync() {
    value.textContent = select.selectedOptions[0].textContent;
    options.forEach(option => option.setAttribute('aria-selected', String(option.dataset.value === select.value)));
  }
  function place() {
    if (menu.hidden) return;
    const rect = trigger.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft || 0;
    const top = viewport?.offsetTop || 0;
    const width = viewport?.width || innerWidth;
    const height = viewport?.height || innerHeight;
    const margin = 12;
    menu.style.width = Math.min(280, width - margin * 2) + 'px';
    const below = top + height - rect.bottom - margin - 6;
    const above = rect.top - top - margin - 6;
    const up = below < 220 && above > below;
    menu.style.maxHeight = Math.max(44, up ? above : below) + 'px';
    menu.style.left = Math.max(left + margin, Math.min(rect.right - menu.offsetWidth, left + width - menu.offsetWidth - margin)) + 'px';
    menu.style.top = (up ? rect.top - menu.offsetHeight - 6 : rect.bottom + 6) + 'px';
  }
  function close(restoreFocus = false) {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger.focus({preventScroll: true});
  }
  function open(index = select.selectedIndex) {
    sync();
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    place();
    options[index].focus({preventScroll: true});
    options[index].scrollIntoView({block: 'nearest'});
  }
  trigger.addEventListener('click', () => menu.hidden ? open() : close(true));
  trigger.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      open(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : select.selectedIndex);
    }
  });
  menu.addEventListener('keydown', event => {
    const index = options.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % options.length;
    if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = options.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      options[next].focus({preventScroll: true});
      options[next].scrollIntoView({block: 'nearest'});
    }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    if (event.key === 'Tab') close(true);
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.hidden && !menu.contains(event.target) && !trigger.contains(event.target)) close();
  });
  document.addEventListener('focusin', event => {
    if (!menu.hidden && !menu.contains(event.target) && !trigger.contains(event.target)) close();
  });
  document.querySelectorAll('[data-mode], #start, #settingsButton, [data-account-open]').forEach(button => button.addEventListener('click', () => close()));
  new MutationObserver(() => { if (field.hidden) close(); }).observe(field, {attributes: true, attributeFilter: ['hidden']});
  window.addEventListener('resize', place);
  window.addEventListener('scroll', event => { if (event.target !== menu) place(); }, true);
  window.visualViewport?.addEventListener('resize', place);
  window.visualViewport?.addEventListener('scroll', place);
  select.addEventListener('change', sync);
  sync();
})();
