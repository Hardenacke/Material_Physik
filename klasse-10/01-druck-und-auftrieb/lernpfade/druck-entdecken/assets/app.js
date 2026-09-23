
'use strict';

const LP = (() => {
  const key = 'druck-lernpfad-v2';
  const state = {
    done: [false,false,false,false,false],
    hyp: '',
    pattern: '',
    rows: [],
    rule: false
  };

  function load(){
    try{
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if(Array.isArray(saved.done)) state.done = saved.done.slice(0,5);
      if(typeof saved.hyp === 'string') state.hyp = saved.hyp;
      if(typeof saved.pattern === 'string') state.pattern = saved.pattern;
      if(Array.isArray(saved.rows)) state.rows = saved.rows;
      if(typeof saved.rule === 'boolean') state.rule = saved.rule;
    }catch(e){}
    return state;
  }

  function save(){
    try{ localStorage.setItem(key, JSON.stringify(state)); }catch(e){}
  }

  function markDone(i, val=true){
    state.done[i] = !!val;
    save();
    updateNav();
  }

  function unlocked(i){
    if(i === 0) return true;
    return !!state.done[i-1];
  }

  function updateNav(){
    document.querySelectorAll('[data-step-link]').forEach(a => {
      const i = Number(a.dataset.stepLink);
      a.classList.toggle('done', !!state.done[i]);
      a.classList.toggle('locked', !unlocked(i));
      if(!unlocked(i)){
        a.setAttribute('aria-disabled','true');
        a.tabIndex = -1;
      }else{
        a.removeAttribute('aria-disabled');
        a.tabIndex = 0;
      }
    });
  }

  function guardPage(step){
    if(!unlocked(step)){
      const previous = ['index.html','index.html','erkundung.html','auswertung.html','regel.html'];
      location.replace(previous[step] || 'index.html');
    }
  }

  function enableWhen(btn, condition, note, text='Bearbeite zuerst die Aufgabe oben.'){
    const ok = !!condition;
    btn.disabled = !ok;
    btn.classList.toggle('disabled', !ok);
    if(note) note.textContent = ok ? '✓ Dieser Schritt ist bereit.' : text;
  }

  function parseDE(v){
    const n = Number(String(v ?? '').trim().replace(',','.'));
    return Number.isFinite(n) ? n : NaN;
  }
  function fmt(n){
    return Number(n).toLocaleString('de-DE',{maximumFractionDigits:3});
  }

  function initChoices(scope=document){
    scope.querySelectorAll('.question').forEach(q => {
      const fb=q.querySelector('.feedback');
      q.querySelectorAll('.choice').forEach(btn => {
        btn.addEventListener('click',()=>{
          q.querySelectorAll('.choice').forEach(b=>b.classList.remove('selected'));
          btn.classList.add('selected');
          const ok=btn.dataset.correct==='true';
          fb.textContent=ok?'✓ Richtig.':'Noch nicht. Prüfe die Bedeutung der Größe.';
          fb.className='feedback '+(ok?'ok':'no');
          document.dispatchEvent(new CustomEvent('lp:changed'));
        });
      });
    });
  }

  function allQuestionsCorrect(scope=document){
    return [...scope.querySelectorAll('.question')].every(q =>
      [...q.querySelectorAll('.choice.selected')].some(b=>b.dataset.correct==='true')
    );
  }

  function initHyperFrames(){
    document.querySelectorAll('.hf-shell[data-hf-src]').forEach(shell=>{
      const src=shell.dataset.hfSrc;
      const useFallback=()=>{
        if(shell.dataset.ready) return;
        shell.dataset.ready='1';
        shell.innerHTML=`<iframe src="${src}" title="Interaktiver HyperFrame" loading="lazy"></iframe>`;
      };
      const usePlayer=()=>{
        if(shell.dataset.ready) return;
        shell.dataset.ready='1';
        shell.innerHTML='';
        const p=document.createElement('hyperframes-player');
        p.setAttribute('src',src);
        p.setAttribute('interactive','');
        p.setAttribute('width','1600');
        p.setAttribute('height','900');
        p.style.width='100%';
        p.style.height='100%';
        shell.appendChild(p);
      };
      if(customElements.get('hyperframes-player')) usePlayer();
      else{
        customElements.whenDefined('hyperframes-player').then(usePlayer).catch(useFallback);
        setTimeout(()=>{if(!customElements.get('hyperframes-player')) useFallback();},1800);
      }
    });
  }

  function resetAll(){
    localStorage.removeItem(key);
    location.href='index.html';
  }

  load();
  document.addEventListener('DOMContentLoaded',()=>{
    updateNav();
    initChoices();
    initHyperFrames();
    document.querySelectorAll('[data-reset]').forEach(b=>b.addEventListener('click',resetAll));
    document.querySelectorAll('a[data-step-link]').forEach(a=>{
      a.addEventListener('click',e=>{
        const i=Number(a.dataset.stepLink);
        if(!unlocked(i)){e.preventDefault();}
      });
    });
  });

  return {
    state,save,markDone,unlocked,updateNav,guardPage,enableWhen,
    parseDE,fmt,initChoices,allQuestionsCorrect,resetAll
  };
})();
