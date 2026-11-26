/* Read visible learning material on demand. No recording, network or account changes. */
(() => {
  const root = document.querySelector('main') || document.body;
  const panel = document.createElement('details');
  panel.className = 'fobur-audio'; panel.dataset.noNarration = 'true';
  panel.innerHTML = '<summary>🔊 Listen to this page</summary><p>Play the recorded narration. The four roofing home pages use the approved British George introduction. Nothing plays until you press a control.</p><div class="fobur-audio-controls"><button type="button" data-audio="test">Test sound</button><button type="button" data-audio="pause">Pause</button><button type="button" data-audio="stop">Stop</button><label>Speed <select><option value="0.8">Slow</option><option value="1" selected>Normal</option><option value="1.2">Fast</option></select></label></div><p role="status" aria-live="polite">Ready</p>';
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
  const label=document.createElement('p');label.textContent='Recorded audio overview';
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
    label.textContent=official?'George — official British voice (website introduction)':key==='generic'?'Recorded audio overview':'Recorded audio overview';
    player.setAttribute('aria-label',label.textContent);
    recordButton.textContent=official?'▶ Play George introduction':'▶ Recorded overview';
    if(player.dataset.recording!==key){player.pause();player.dataset.recording=key;player.src=url;}
  }
  const recordButton=document.createElement('button');recordButton.type='button';recordButton.textContent='▶ Recorded overview';recordButton.dataset.audio='recorded';
  controls.insertBefore(recordButton,controls.querySelector('[data-audio=test]'));
  selectRecording();addEventListener('hashchange',selectRecording);
  recordButton.addEventListener('click',()=>{selectRecording();player.play().catch(()=>{status.textContent='Recording could not start. Check the media volume and try again.';});});
  player.addEventListener('playing',()=>{status.textContent='Recorded audio playing';});
  player.addEventListener('ended',()=>{status.textContent='Recording finished';});
  player.addEventListener('error',()=>{status.textContent=georgeKeys.has(player.dataset.recording)?'George’s introduction could not load. Refresh and retry.':'Recording could not load. Refresh the page and try again.';});
  addEventListener('pagehide',()=>player.pause());document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();});
  panel.querySelector('[data-audio=stop]').addEventListener('click',()=>{player.pause();player.currentTime=0;});
  panel.querySelector('[data-audio=pause]').addEventListener('click',()=>{if(!player.paused)player.pause();});
  panel.querySelector('select').addEventListener('change',e=>{player.playbackRate=Number(e.target.value);});

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
  panel.addEventListener('click',e=>{
    const action=e.target.closest('button')?.dataset.audio;
    if(action==='test')testSound();
    if(action==='stop'){player.pause();player.currentTime=0;status.textContent='Stopped';}
    if(action==='pause'){if(player.paused){player.play().catch(()=>{});}else player.pause();}
  });
  player.addEventListener('pause',()=>{if(!player.ended)status.textContent='Paused';});
  addEventListener('pagehide',()=>player.pause());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();});
})();
