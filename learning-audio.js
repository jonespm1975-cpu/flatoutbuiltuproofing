/* Read visible learning material on demand. No recording, network or account changes. */
(() => {
  const root = document.querySelector('main') || document.body;
  const speech = window.speechSynthesis;
  const panel = document.createElement('details');
  panel.className = 'fobur-audio'; panel.dataset.noNarration = 'true';
  panel.innerHTML = '<summary>🔊 Listen to this page</summary><p>Listen to the official George British narration introduction on the four roofing home pages. Full-page reading uses a separate device voice, whose quality may vary. Nothing plays until you press a control.</p><div class="fobur-audio-controls"><button type="button" data-audio="start">Read full page (device voice)</button><button type="button" data-audio="test">Test sound</button><button type="button" data-audio="pause">Pause / resume</button><button type="button" data-audio="stop">Stop</button><label>Speed <select><option value="0.8">Slow</option><option value="1" selected>Normal</option><option value="1.2">Fast</option></select></label></div><p role="status" aria-live="polite">Ready</p>';
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
  // Actual prerecorded MP3s are public page overviews, not protected lesson content.
  const recordings=new Set(["index","built-up-roofing","tile-slate-roofing","metal-sheet-roofing","liquid-applied-roofing","free-hub","courses","health-safety","tool-safety","cscs","gallery","sponsors","sponsors-tile-slate-roofing","sponsors-metal-sheet-roofing","sponsors-liquid-applied-roofing","community","new-to-flat-roofing","introduction","tapered-insulation","tapered-falls-practice","tapered-video-academy","tapered-animated-lessons","roofing-connect","support-qr","access","generic"]);
  const player=document.createElement('audio');
  player.controls=true;player.preload='metadata';player.playsInline=true;player.setAttribute('playsinline','');
  player.style.cssText='display:block;width:100%;max-width:520px;margin:10px 0;';
  const label=document.createElement('p');label.textContent='Recorded audio overview (works without a device voice)';
  const controls=panel.querySelector('.fobur-audio-controls');
  panel.insertBefore(label,controls);panel.insertBefore(player,controls);
  player.setAttribute('aria-label','Recorded audio overview');
  const privateRecording=!!document.querySelector('#paidContent,#app,[type=password]');
  function recordingKey(){
    if(privateRecording)return 'generic';
    let key=location.pathname.split('/').pop().replace(/\.html$/,'')||'index';
    if(key==='index'&&/^#roof-panel-[1-4]$/.test(location.hash))key=['built-up-roofing','tile-slate-roofing','metal-sheet-roofing','liquid-applied-roofing'][Number(location.hash.slice(-1))-1];
    return recordings.has(key)?key:'generic';
  }
  // George is the approved recorded brand voice. The existing introduction is shared until section-specific recordings are available.
  const georgeKeys=new Set(['index','built-up-roofing','tile-slate-roofing','metal-sheet-roofing','liquid-applied-roofing']);
  const georgeIntro='https://assets.vidiq.com/voiceovers/7bfdffe6-9f6d-4c3f-af88-a2a239022c0a/30c664a4-6b72-40b3-b7f7-28cb06529c22.mp3';
  function selectRecording(){
    const key=recordingKey(), official=!privateRecording&&georgeKeys.has(key);
    const url=official?georgeIntro:'/assets/narration/'+key+'.mp3?v=20261126-3';
    label.textContent=official?'George — official British voice (website introduction)':key==='generic'?'Recorded sound check (full page narration uses your device voice)':'Recorded audio overview (works without a device voice)';
    player.setAttribute('aria-label',label.textContent);
    recordButton.textContent=official?'▶ Play George introduction':'▶ Recorded overview';
    if(player.dataset.recording!==key){player.pause();player.dataset.recording=key;player.src=url;}
  }
  const recordButton=document.createElement('button');recordButton.type='button';recordButton.textContent='▶ Recorded overview';recordButton.dataset.audio='recorded';
  controls.insertBefore(recordButton,controls.querySelector('[data-audio=test]'));
  selectRecording();addEventListener('hashchange',selectRecording);
  recordButton.addEventListener('click',()=>{if(speech?.speaking||speech?.pending||speech?.paused)speech.cancel();selectRecording();player.play().catch(e=>{status.textContent='Recording could not start. Use the audio player or check the device media output.';});});
  player.addEventListener('playing',()=>{status.textContent='Recorded audio playing';});
  player.addEventListener('ended',()=>{status.textContent='Recording finished';});
  player.addEventListener('error',()=>{status.textContent=georgeKeys.has(player.dataset.recording)?'George’s introduction could not load. Refresh and retry, or use the separate device reader.':'Recording could not load. Refresh the page and try again.';});
  player.addEventListener('play',()=>{if(speech?.speaking||speech?.pending||speech?.paused)speech.cancel();});
  addEventListener('pagehide',()=>player.pause());document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();});
  panel.querySelector('[data-audio=stop]').addEventListener('click',()=>{player.pause();player.currentTime=0;});
  panel.querySelector('[data-audio=pause]').addEventListener('click',()=>{if(!player.paused)player.pause();});
  panel.querySelector('select').addEventListener('change',e=>{player.playbackRate=Number(e.target.value);});

  if(!speech || !window.SpeechSynthesisUtterance){status.textContent='Device voice is unavailable. Use the recorded audio player above.';buttons.forEach(b=>{if(b.dataset.audio==='start')b.disabled=true;});panel.querySelector('[data-audio=test]').addEventListener('click',testSound);return;}
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
    function speechChunks(text, limit=320){
      const cleaned=text.replace(/\s+/g,' ').trim();
      const sentences=cleaned.match(/[^.!?]+(?:[.!?]+|$)/g)||[cleaned];
      const chunks=[];let current='';
      for(let sentence of sentences){
        sentence=sentence.trim();if(!sentence)continue;
        const combined=current?current+' '+sentence:sentence;
        if(combined.length<=limit){current=combined;continue;}
        if(current){chunks.push(current);current='';}
        while(sentence.length>limit){
          let cut=sentence.lastIndexOf(' ',limit);
          if(cut<1)cut=limit;
          chunks.push(sentence.slice(0,cut).trim());sentence=sentence.slice(cut).trim();
        }
        current=sentence;
      }
      if(current)chunks.push(current);
      return chunks;
    }
    return source.flatMap(speechChunks).filter(Boolean);
  }
  function play(){
    player.pause();stop();const id=generation, queue=gather();let i=0;
    if(!queue.length){status.textContent='No readable text found.';return;}
    refreshVoices();
    const privatePage=!!document.querySelector('#paidContent,#app,[type=password]');
    const voices=availableVoices.filter(v=>(!privatePage||v.localService===true)&&/^en(?:-|$)/i.test(v.lang||''));
    const voiceScore=v=>{
      const identity=((v.name||'')+' '+(v.voiceURI||'')).toLowerCase();
      let score=v.lang?.toLowerCase()==='en-gb'?100:45;
      if(/\b(daniel|george|oliver|arthur|james|alex|david|tom|harry|robert|fred|matthew|ryan|aaron|liam|mark|gordon|lee|nathan|andrew)\b/.test(identity))score+=60;
      if(/\b(enhanced|premium|natural|neural)\b/.test(identity))score+=25;
      if(v.localService)score+=12;
      if(/\b(samantha|victoria|karen|moira|tessa|serena|female|woman)\b/.test(identity))score-=60;
      return score;
    };
    const voice=[...voices].sort((a,b)=>voiceScore(b)-voiceScore(a))[0];
    if(privatePage&&!voice){status.textContent='No local English voice ready. Wait a moment and press Play again, or enable a downloaded device voice.';return;}
    if(speech.paused)speech.resume();
    function next(){
      if(id!==generation)return;
      clearTimeout(timer);
      if(i===queue.length){current=null;status.textContent='Finished';return;}
      const u=new SpeechSynthesisUtterance(queue[i++]);current=u;
      if(voice){u.voice=voice;u.lang=voice.lang;}else u.lang='en-GB';
      u.volume=1;u.rate=Number(panel.querySelector('select').value);
      u.onstart=()=>{if(id!==generation||current!==u)return;clearTimeout(timer);status.textContent='Reading aloud'+(voice?' with '+voice.name:' with the device voice');};
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
