/* Read visible learning material on demand. No recording, network or account changes. */
(() => {
  const root = document.querySelector('main') || document.body;
  const speech = window.speechSynthesis;
  const panel = document.createElement('details');
  panel.className = 'fobur-audio'; panel.dataset.noNarration = 'true';
  panel.innerHTML = '<summary>🔊 Listen to this page</summary><p>Read visible page text aloud using your device’s speech service. No audio plays automatically.</p><div class="fobur-audio-controls"><button type="button" data-audio="start">Play</button><button type="button" data-audio="test">Test sound</button><button type="button" data-audio="pause">Pause / resume</button><button type="button" data-audio="stop">Stop</button><label>Speed <select><option value="0.8">Slow</option><option value="1" selected>Normal</option><option value="1.2">Fast</option></select></label></div><p role="status" aria-live="polite">Ready</p>';
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
  if(!speech || !window.SpeechSynthesisUtterance){status.textContent='Read-aloud is unavailable in this browser. Use your device accessibility reader.';buttons.forEach(b=>{if(b.dataset.audio!=='test'&&b.className!=='fobur-fit-toggle')b.disabled=true;});panel.querySelector('[data-audio=test]').addEventListener('click',testSound);return;}
  let generation=0, current=null, timer=null, availableVoices=[];
  function refreshVoices(){try{availableVoices=speech.getVoices()||[];}catch{availableVoices=[];}}
  refreshVoices();
  speech.addEventListener?.('voiceschanged',refreshVoices);
  function stop(){generation++;clearTimeout(timer);timer=null;current=null;if(speech.speaking||speech.pending||speech.paused)speech.cancel();status.textContent='Stopped';}
  function testSound(){
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)throw Error('Audio unavailable');
      const ctx=new AudioContext(), oscillator=ctx.createOscillator(), gain=ctx.createGain();
      oscillator.frequency.value=660;gain.gain.value=0.12;oscillator.connect(gain);gain.connect(ctx.destination);
      oscillator.onended=()=>ctx.close().catch(()=>{});
      ctx.resume().then(()=>{oscillator.start();oscillator.stop(ctx.currentTime+0.5);status.textContent='Test tone played. If silent, check media volume and audio output.';}).catch(()=>{status.textContent='Sound test could not start. Try Safari or Chrome.';});
    }catch{status.textContent='Sound test unavailable in this browser.';}
  }
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
    refreshVoices();
    const privatePage=!!document.querySelector('#paidContent,#app,[type=password]');
    const voices=availableVoices.filter(v=>!privatePage||v.localService===true);
    const voice=voices.find(v=>v.localService&&v.lang.toLowerCase()==='en-gb')||voices.find(v=>v.localService&&v.lang.toLowerCase().startsWith('en'))||voices.find(v=>v.lang.toLowerCase()==='en-gb')||voices.find(v=>v.lang.toLowerCase().startsWith('en'));
    if(privatePage&&!voice){status.textContent='No local English voice ready. Wait a moment and press Play again, or enable a downloaded device voice.';return;}
    if(speech.paused)speech.resume();
    function next(){
      if(id!==generation)return;
      clearTimeout(timer);
      if(i===queue.length){current=null;status.textContent='Finished';return;}
      const u=new SpeechSynthesisUtterance(queue[i++]);current=u;
      if(voice){u.voice=voice;u.lang=voice.lang;}else u.lang='en-GB';
      u.volume=1;u.rate=Number(panel.querySelector('select').value);
      u.onstart=()=>{if(id!==generation||current!==u)return;clearTimeout(timer);status.textContent='Reading aloud';};
      u.onend=()=>{if(id===generation&&current===u)next();};
      u.onerror=e=>{if(id!==generation||current!==u)return;clearTimeout(timer);current=null;status.textContent='Speech unavailable ('+(e.error||'unknown error')+'). Try Test sound, then Play again.';};
      status.textContent='Starting voice…';
      timer=setTimeout(()=>{if(id===generation&&current===u){status.textContent='No speech start detected. Try Test sound, then Play again in Safari or Chrome.';}},6000);
      try{speech.speak(u);}catch{clearTimeout(timer);current=null;status.textContent='Could not start speech. Try Test sound.';}
    }next();
  }
  panel.addEventListener('click',e=>{const action=e.target.closest('button')?.dataset.audio;if(action==='test')testSound();if(action==='start')play();if(action==='stop')stop();if(action==='pause'){if(speech.paused){speech.resume();status.textContent='Reading aloud';}else if(speech.speaking){speech.pause();status.textContent='Paused';}}});
  addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  // Stop narration if an account gate hides or removes a currently displayed lesson.
  if(document.querySelector('#paidContent,#app'))new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'&&(r.target.hidden||r.target.getAttribute('aria-hidden')==='true')))stop();}).observe(root,{subtree:true,attributes:true,attributeFilter:['hidden','aria-hidden']});
})();
