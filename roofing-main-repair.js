/* Four-page navigation and hero playback repair, 22 November 2026. */
(() => {
  'use strict';
  const filenames = [
    'built-up-roofing.html',
    'tile-slate-roofing.html',
    'metal-sheet-roofing.html',
    'liquid-applied-roofing.html'
  ];
  const panels = [...document.querySelectorAll('.page-panel')];
  const tabs = [...document.querySelectorAll('.roof-tab')];
  if (panels.length !== 4 || tabs.length !== 4) return;
  const names = [
    'Built-Up Roofing','Tile & Slate Roofing',
    'Metal & Sheet Roofing','Liquid Applied Roofing Systems'
  ];
  const readSelection = () => {
    const match = location.hash.match(/^#roof-panel-([1-4])$/);
    if (match) return Number(match[1]) - 1;
    const path = decodeURIComponent(location.pathname.split('/').pop() || '');
    return Math.max(0, filenames.indexOf(path));
  };
  function select() {
    const index = readSelection();
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
      panel.setAttribute('aria-hidden', String(i !== index));
    });
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      if (i === index) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    const title = document.getElementById('selected');
    if (title) title.textContent = 'Main Page ' + (index + 1) + ' · ' + names[index];
    const prev = document.getElementById('previous');
    const next = document.getElementById('next');
    const linkFor = n => filenames[n] + '#roof-panel-' + (n + 1);
    if (prev) prev.href = linkFor((index + 3) % 4);
    if (next) next.href = linkFor((index + 1) % 4);
    panels.forEach((panel, i) => {
      if (i !== index) panel.querySelectorAll('video').forEach(v => v.pause());
      else if (!document.hidden) panel.querySelectorAll('video').forEach(v => {
        v.muted = true;
        v.playsInline = true;
        if (!v.classList.contains('video-unavailable') && v.paused) {
          const attempt = v.play();
          if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {
            const button = panel.querySelector('.motion-toggle,.hero-pause');
            if (button) button.textContent = '▶';
          });
        }
      });
    });
  }
  // Tabs are real links to the four dedicated category URLs, not unconnected artwork.
  tabs.forEach((tab, i) => {
    tab.href = filenames[i] + '#roof-panel-' + (i + 1);
    tab.setAttribute('aria-label', 'Open ' + names[i] + ' main page');
  });
  document.querySelectorAll('.page-panel video').forEach(video => {
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    const panel = video.closest('.page-panel');
    const button = panel && panel.querySelector('.motion-toggle,.hero-pause');
    const syncButton = () => {
      if (button && !video.classList.contains('video-unavailable'))
        button.textContent = video.paused ? '▶' : '❚❚';
    };
    video.addEventListener('play', syncButton);
    video.addEventListener('pause', syncButton);
    video.addEventListener('playing', syncButton);
    video.addEventListener('error', () => {
      // Reveal the exact original page artwork underneath instead of a black video box.
      video.classList.add('video-unavailable');
      if (button) {
        button.hidden = true;
        button.setAttribute('aria-label', 'Video currently unavailable');
      }
    });
    video.addEventListener('loadeddata', () => {
      video.classList.remove('video-unavailable');
      if (button) button.hidden = false;
      syncButton();
    });
    syncButton();
  });
  window.addEventListener('hashchange', select);
  window.addEventListener('pageshow', select);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) select(); });
  select();
})();
