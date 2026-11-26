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
  const sponsorPages = ['sponsors.html', 'sponsors-tile-slate-roofing.html',
    'sponsors-metal-sheet-roofing.html', 'sponsors-liquid-applied-roofing.html'];
  panels.forEach((panel, index) => {
    panel.querySelectorAll('a[href="sponsors.html"]').forEach(link => {
      link.href = sponsorPages[index];
    });
  });
  const liquidFrame = panels[3].querySelector('.page-frame');
  const liquidVideo = document.createElement('video');
  liquidVideo.className = 'liquid-hero-film';
  liquidVideo.muted = true;
  liquidVideo.playsInline = true;
  liquidVideo.loop = true;
  liquidVideo.preload = 'none';
  liquidVideo.setAttribute('aria-label', 'Liquid roofing being applied with a roller');
  liquidVideo.addEventListener('loadeddata', () => liquidVideo.classList.add('ready'));
  const liquidToggle = document.createElement('button');
  liquidToggle.type = 'button';
  liquidToggle.className = 'motion-toggle liquid-film-toggle';
  liquidToggle.setAttribute('aria-label', 'Play liquid roofing video');
  liquidToggle.addEventListener('click', () => {
    if (liquidVideo.paused) liquidVideo.play().catch(() => {});
    else liquidVideo.pause();
  });
  for (const event of ['play','pause']) {
    liquidVideo.addEventListener(event, () => liquidToggle.setAttribute('aria-label',
      liquidVideo.paused ? 'Play liquid roofing video' : 'Pause liquid roofing video'));
  }
  liquidFrame.append(liquidVideo, liquidToggle);
  const readSelection = () => {
    const match = location.hash.match(/^#roof-panel-([1-4])$/);
    if (match) return Number(match[1]) - 1;
    const path = decodeURIComponent(location.pathname.split('/').pop() || '');
    return Math.max(0, filenames.indexOf(path));
  };
  function select() {
    const index = readSelection();
    if (index === 3 && !liquidVideo.hasAttribute('src'))
      liquidVideo.src = 'assets/liquid-applied-hero.mp4';
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
        if (!v.classList.contains('video-unavailable') && v.paused &&
            (v !== liquidVideo || !window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
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

/* Owner-approved Roofing Leads integration, 25 November 2026.
   Reflow only the four training tiles; the original top artwork, hero, footer,
   sponsor QR and live links remain intact. Each page keeps its own artwork. */
(() => {
  'use strict';
  const layouts = [
    {w:780,h:1400,top:802,bottom:1095,tiles:[[14,805,371,135],[390,805,378,135],[14,943,371,149],[390,943,378,149]]},
    {w:780,h:1302,top:730,bottom:1010,tiles:[[17,733,369,130],[391,733,371,130],[17,866,369,140],[391,866,371,140]]},
    {w:780,h:1302,top:736,bottom:998,tiles:[[19,739,367,120],[393,739,368,120],[19,862,367,134],[393,862,368,134]]},
    {w:853,h:1684,top:949,bottom:1290,tiles:[[16,951,407,160],[429,951,412,160],[16,1115,407,173],[429,1115,412,173]]}
  ];
  const mobileOne = {w:710,h:1114,top:676,bottom:922,tiles:[[19,678,326,107],[350,678,341,107],[19,789,326,131],[350,789,341,131]]};
  const keys = ['built-up','tile-slate','metal-sheet','liquid-applied'];
  const labels = ['Start free beginner training','Upcoming £9.99 specialist lessons','£5 monthly membership coming soon, no checkout','Safety and CSCS revision','Project gallery','Sponsorship and brand exposure','Support the site'];
  const set = (el,key,value) => el.style.setProperty('--fl-'+key,String(value));
  const geometry = (el,layout,suffix='') => {
    set(el,'top-ratio'+suffix,layout.w+' / '+layout.top);
    set(el,'bottom-ratio'+suffix,layout.w+' / '+(layout.h-layout.bottom));
  };
  const tileGeometry = (el,layout,i,suffix='') => {
    const [x,y,w,h]=layout.tiles[i];
    set(el,'tile-ratio'+suffix,w+' / '+h);
    set(el,'tile-size'+suffix,(100*layout.w/w)+'% '+(100*layout.h/h)+'%');
    set(el,'tile-pos'+suffix,(100*x/(layout.w-w))+'% '+(100*y/(layout.h-h))+'%');
  };
  const pin = '<svg class="fl-pin" viewBox="0 0 220 72" aria-hidden="true"><ellipse cx="110" cy="56" rx="96" ry="12" fill="none" stroke="#ffd46b" stroke-width="2"/><path fill="#ffce49" d="M110 4c-17 0-28 12-28 27 0 19 28 39 28 39s28-20 28-39c0-15-11-27-28-27zm0 15a11 11 0 1 1 0 22 11 11 0 0 1 0-22z" fill-rule="evenodd"/></svg>';
  const sparkleSpecs = [[7,4,19,0],[87,3,13,1.7],[99,42,23,3],[4,67,14,.7],[92,95,19,2],[13,99,10,3.7],[5,28,7,2.4],[96,18,8,.9],[75,98,6,1.4],[4,88,6,2.8]];
  for (let i=0;i<4;i++) {
    const panel=document.getElementById('roof-panel-'+(i+1));
    const frame=panel?.querySelector('.page-frame');
    const art=frame?.querySelector('.page-art');
    if(!frame||!art||panel.querySelector('.fobur-leads-section'))continue;
    const existing=Array.from(frame.querySelectorAll(':scope > .visual-hit'));
    const links=labels.map(label=>existing.find(a=>a.getAttribute('aria-label')===label));
    // Fail closed: do not crop any artwork if a real original link is missing.
    if(links.some(a=>!a))continue;
    const layout=layouts[i];
    panel.classList.add('fobur-leads-integrated');
    set(panel,'art','url("'+art.getAttribute('src')+'")');
    geometry(panel,layout);
    if(i===0)geometry(panel,mobileOne,'-mobile');
    const clip=document.createElement('div');
    clip.className='fl-top-clip';
    frame.before(clip);
    clip.append(frame);
    const section=document.createElement('div');
    section.className='fobur-leads-section';
    const training=document.createElement('div');
    training.className='fl-training-stack';
    links.slice(0,4).forEach((a,n)=>{
      a.className='fl-training-card';
      a.removeAttribute('style');
      tileGeometry(a,layout,n);
      if(i===0)tileGeometry(a,mobileOne,n,'-mobile');
      if(n===2){
        const price=document.createElement('span');
        price.className='fl-membership-price';
        price.setAttribute('aria-hidden','true');
        price.textContent='£5 MONTHLY';
        a.append(price);
      }
      training.append(a);
    });
    frame.querySelector('.live-price-label')?.remove();
    const card=document.createElement('section');
    card.className='fl-leads-card';
    card.setAttribute('aria-labelledby','fl-leads-title-'+i);
    const glitter=document.createElement('div');
    glitter.className='fl-sparkles';
    glitter.setAttribute('aria-hidden','true');
    sparkleSpecs.forEach(([x,y,size,delay])=>{
      const star=document.createElement('i');
      star.style.cssText='--sx:'+x+'%;--sy:'+y+'%;--ss:'+size+'px;--sd:-'+delay+'s';
      glitter.append(star);
    });
    card.append(glitter);
    const content=document.createElement('div');
    content.className='fl-leads-content';
    content.innerHTML='<div class="fl-leads-top"><h2 class="fl-leads-brand" id="fl-leads-title-'+i+'"><img src="assets/flat-out-built-up-roofing-logo.svg" alt="Flat Out Built-Up Roofing — Roofing Leads" width="640" height="256"></h2><ul><li>Get Roofing Job Leads</li><li>Connect with Customers</li><li>Opportunities for Our Brands</li><li>Grow Your Roofing Business</li></ul></div><div class="fl-leads-divider" aria-hidden="true">'+pin+'</div>';
    const cta=document.createElement('a');
    cta.className='fl-leads-cta';
    cta.href='roofing-connect.html?roof='+keys[i]+'#enquiry';
    cta.setAttribute('aria-label','Access roofing leads');
    cta.innerHTML='ACCESS LEADS <span aria-hidden="true">▶</span>';
    const note=document.createElement('small');
    note.className='fl-leads-note';
    note.textContent='Owner-reviewed enquiries · referrals subject to availability and consent';
    const pause=document.createElement('button');
    pause.type='button';
    pause.className='fl-sparkle-toggle';
    pause.textContent='Pause sparkles';
    pause.setAttribute('aria-pressed','false');
    pause.addEventListener('click',()=>{
      const stopped=card.classList.toggle('fl-paused');
      pause.textContent=stopped?'Play sparkles':'Pause sparkles';
      pause.setAttribute('aria-pressed',String(stopped));
    });
    const footer=document.createElement('div');
    footer.className='fl-leads-footer';
    footer.append(note,pause);
    content.append(cta,footer);
    card.append(content);
    section.append(training,card);
    clip.after(section);
    const tail=document.createElement('div');
    tail.className='fl-bottom-art';
    tail.setAttribute('role','group');
    tail.setAttribute('aria-label','Project gallery, sponsorship, support and original footer');
    const tailRects = i===0?[[14,1097,245,130],[263,1097,207,130],[476,1097,292,130]]:
      i===1?[[17,1012,246,124],[266,1012,203,124],[473,1012,289,124]]:
      i===2?[[19,1000,242,128],[265,1000,198,128],[466,1000,295,128]]:
      [[16,1294,270,150],[292,1294,219,150],[518,1294,322,150]];
    const mobileTail=[[19,925,214,111],[239,925,202,111],[446,925,245,111]];
    const tailGeo=(a,geo,rect,suffix='')=>{
      const [x,y,w,h]=rect;
      set(a,'tail-left'+suffix,100*x/geo.w+'%');
      set(a,'tail-top'+suffix,100*(y-geo.bottom)/(geo.h-geo.bottom)+'%');
      set(a,'tail-width'+suffix,100*w/geo.w+'%');
      set(a,'tail-height'+suffix,100*h/(geo.h-geo.bottom)+'%');
    };
    links.slice(4).forEach((a,n)=>{
      a.className='fl-tail-link';
      a.removeAttribute('style');
      tailGeo(a,layout,tailRects[n]);
      if(i===0)tailGeo(a,mobileOne,mobileTail[n],'-mobile');
      tail.append(a);
    });
    section.after(tail);
  }
})();

/* Owner-approved Tools & Workwear store route, 26 November 2026. */
(() => {
  'use strict';
  // The WORKWEAR topic card previously opened advertising.html. Route that
  // highlighted tile and the photo hotspot to the approved virtual showroom.
  const routeToStore = link => {
    link.href = 'tools-workwear-store.html';
    link.setAttribute('aria-label', 'Open the Tools & Workwear virtual store');
    link.setAttribute('title', 'Tools & Workwear virtual store');
  };
  document.querySelectorAll('.page-panel .visual-hit').forEach(link => {
    const label = (link.getAttribute('aria-label') || '').toLowerCase();
    if (!label.includes('tools') || !label.includes('workwear')) return;
    routeToStore(link);
  });
  document.querySelectorAll('.page-panel a.topic-card').forEach(link => {
    const label = (link.querySelector('strong')?.textContent || link.textContent || '')
      .trim().replace(/\s+/g, ' ').toLowerCase();
    if (label !== 'workwear') return;
    routeToStore(link);
  });
})();
