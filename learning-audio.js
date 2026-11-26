/* Read visible learning material on demand. No recording, network or account changes. */
(() => {
  const root = document.querySelector('main') || document.body;
  const speech = window.speechSynthesis;
  const panel = document.createElement('details');
  panel.className = 'fobur-audio'; panel.dataset.noNarration = 'true';
  panel.innerHTML = '<summary>🔊 Listen to this page</summary><p>Read visible page text aloud using your device’s speech service. No audio plays automatically.</p><div class="fobur-audio-controls"><button type="button" data-audio="start">Play</button><button type="button" data-audio="pause">Pause / resume</button><button type="button" data-audio="stop">Stop</button><label>Speed <select><option value="0.8">Slow</option><option value="1" selected>Normal</option><option value="1.2">Fast</option></select></label></div><p role="status" aria-live="polite">Ready</p>';
  const artwork = root.matches('.viewport') && root.querySelector('.page-panel');
  // The controls sit outside the artwork, never cover its navigation or hero.
  root.prepend(panel);
  if(artwork){
    const fit=document.createElement('button');
    fit.type='button';fit.className='fobur-fit-toggle';fit.textContent='Fit screen';fit.setAttribute('aria-pressed','false');
    const summary=panel.querySelector('summary');
    summary.append(fit);
    const resize=()=>{
      if(fit.getAttribute('aria-pressed')!=='true')return;
      const stack=root.querySelector('.stack'), tabs=root.querySelector('.tabs'), note=root.querySelector('.visually-note');
      if(!stack||!tabs)return;
      root.style.removeProperty('--fobur-fit-width');
      const total=stack.getBoundingClientRect().height+tabs.getBoundingClientRect().height+(note?.getBoundingClientRect().height||0);
      const available=(window.visualViewport?.height||window.innerHeight)-panel.getBoundingClientRect().height-20;
      const width=root.getBoundingClientRect().width;
      if(total>0&&available>0)root.style.setProperty('--fobur-fit-width',Math.max(210,Math.floor(width*Math.min(1,available/total)))+'px');
    };
    fit.addEventListener('click',e=>{
      e.preventDefault();const on=fit.getAttribute('aria-pressed')!=='true';fit.setAttribute('aria-pressed',String(on));
      fit.textContent=on?'Normal size':'Fit screen';
      if(on)resize();else root.style.removeProperty('--fobur-fit-width');
    });
    window.addEventListener('resize',resize);window.addEventListener('hashchange',resize);
    panel.addEventListener('toggle',resize);
  }
  const status=panel.querySelector('[role=status]'), buttons=panel.querySelectorAll('button');
  if(!speech || !window.SpeechSynthesisUtterance){status.textContent='Read-aloud is unavailable in this browser. Use your device accessibility reader.';buttons.forEach(b=>b.disabled=true);return;}
  let generation=0;
  function stop(){generation++;speech.cancel();status.textContent='Stopped';}
  function visible(el){
    if(el.closest('[hidden],[aria-hidden=true],form,nav,script,style,button,input,select,textarea,[data-no-narration],details:not([open])'))return false;
    for(let e=el;e&&e!==document.body;e=e.parentElement){const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}
    return !!el.getClientRects().length;
  }
  function gather(){
    const selected=Array.from(root.querySelectorAll('h1,h2,h3,h4,p,li,figcaption,summary,article td')).filter(visible).filter(e=>!e.querySelector('p,li,h1,h2,h3,h4,figcaption'));
    const source=selected.map(e=>e.innerText.trim()).filter(Boolean);
    if(artwork){
      const active=root.querySelector('.page-panel:not([hidden])');
      const name=root.querySelector('.roof-tab[aria-selected=true]')?.getAttribute('aria-label')||document.title;
      const labels=Array.from(active?.querySelectorAll('a[aria-label]')||[]).filter(visible).map(a=>a.getAttribute('aria-label'));
      source.unshift(name.replace(/^Open /,''),'Real skills. Lasting roofs. Practical training, expert guidance and essential knowledge for roofing.', 'Explore the following learning and website sections:',...new Set(labels));
    }
    if(!source.length)source.push(document.title,...Array.from(root.querySelectorAll('a[aria-label]')).filter(visible).map(a=>a.getAttribute('aria-label')));
    return source.flatMap(s=>s.match(/.{1,180}(?:\s|$)|\S{181,}/g)||[s]).map(s=>s.trim()).filter(Boolean);
  }
  function play(){
    stop();const id=generation, queue=gather();let i=0;
    if(!queue.length){status.textContent='No readable text found.';return;}
    const voices=speech.getVoices();
    const voice=voices.find(v=>v.localService&&v.lang.toLowerCase()==='en-gb')||voices.find(v=>v.localService&&v.lang.toLowerCase().startsWith('en'));
    if(!voice && document.querySelector('#paidContent,#app,[type=password]')){status.textContent='A local English voice is required on this account page. Use your device accessibility reader.';return;}
    function next(){
      if(id!==generation)return;
      if(i===queue.length){status.textContent='Finished';return;}
      const u=new SpeechSynthesisUtterance(queue[i++]);u.lang='en-GB';if(voice)u.voice=voice;u.rate=Number(panel.querySelector('select').value);
      u.onend=next;u.onerror=()=>{if(id===generation)status.textContent='Playback interrupted. Press Play to restart.';};
      status.textContent='Reading aloud';speech.speak(u);
    }next();
  }
  panel.addEventListener('click',e=>{const action=e.target.dataset.audio;if(action==='start')play();if(action==='stop')stop();if(action==='pause'){if(speech.paused){speech.resume();status.textContent='Reading aloud';}else if(speech.speaking){speech.pause();status.textContent='Paused';}}});
  addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  // Stop narration if an account gate hides or removes a currently displayed lesson.
  if(document.querySelector('#paidContent,#app'))new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'&&(r.target.hidden||r.target.getAttribute('aria-hidden')==='true')))stop();}).observe(root,{subtree:true,attributes:true,attributeFilter:['hidden','aria-hidden']});
})();
