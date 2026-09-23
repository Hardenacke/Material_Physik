
'use strict';

const LP = (() => {
  const key = 'druck-lernpfad-v2';
  const state = {
    done: [false,false,false,false,false],
    teacher: false,
    pattern: '',
    rows: [],
    rule: false
  };

  function load(){
    try{
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if(Array.isArray(saved.done)) state.done = saved.done.slice(0,5);
      if(typeof saved.teacher === 'boolean') state.teacher = saved.teacher;
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
    if(state.teacher) return true;
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
    const ok = state.teacher || !!condition;
    btn.disabled = !ok;
    btn.classList.toggle('disabled', !ok);
    if(note) note.textContent = ok ? (state.teacher ? '✓ Durch Lehrerzugang freigeschaltet.' : '✓ Dieser Schritt ist bereit.') : text;
  }

  function parseDE(v){
    const n = Number(String(v ?? '').trim().replace(',','.'));
    return Number.isFinite(n) ? n : NaN;
  }
  function fmt(n){
    return Number(n).toLocaleString('de-DE',{maximumFractionDigits:3});
  }
  function texNumber(n, digits=3){
    const value = Number(n).toLocaleString('de-DE', {
      maximumFractionDigits:digits,
      useGrouping:false
    });
    return value.replace(',', '{,}');
  }

  function loadKatex(){
    if(window.katex) return Promise.resolve(window.katex);

    if(!document.querySelector('link[data-katex-css]')){
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
      link.dataset.katexCss = 'true';
      document.head.appendChild(link);
    }

    const existing = document.querySelector('script[data-katex-js]');
    if(existing){
      return new Promise(resolve => {
        existing.addEventListener('load', () => resolve(window.katex), { once:true });
        existing.addEventListener('error', () => resolve(null), { once:true });
      });
    }

    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
      script.defer = true;
      script.dataset.katexJs = 'true';
      script.onload = () => resolve(window.katex);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  function renderKatex(){
    loadKatex().then(katex => {
      if(!katex) return;
      document.querySelectorAll('[data-katex]').forEach(el => {
        if(el.dataset.katexReady) return;
        try{
          katex.render(el.dataset.katex, el, {
            throwOnError:false,
            displayMode: el.dataset.katexMode === 'display',
            output:'html'
          });
          el.dataset.katexReady = 'true';
        }catch(e){}
      });
    });
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
    if(state.teacher) return true;
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

  function unlockAll(){
    state.teacher = true;
    state.done = [true,true,true,true,true];
    save();
    updateNav();
    document.dispatchEvent(new CustomEvent('lp:changed'));
    document.querySelectorAll('#next,#finish').forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('disabled');
    });
    document.querySelectorAll('.unlock-note').forEach(note => {
      note.textContent = '✓ Durch Lehrerzugang freigeschaltet.';
    });
  }

  function initTeacherAccess(){
    const box = document.createElement('aside');
    box.className = 'teacher-access';
    box.setAttribute('aria-label', 'Lehrerzugang');
    box.innerHTML = `
      <button class="teacher-toggle" type="button" aria-expanded="false">Lehrerzugang</button>
      <form class="teacher-panel" hidden>
        <label for="teacher-code">Passwort</label>
        <div class="teacher-row">
          <input id="teacher-code" type="password" inputmode="numeric" autocomplete="off">
          <button type="submit">OK</button>
        </div>
        <p class="teacher-feedback" aria-live="polite"></p>
      </form>`;
    document.body.appendChild(box);

    const toggle = box.querySelector('.teacher-toggle');
    const panel = box.querySelector('.teacher-panel');
    const input = box.querySelector('#teacher-code');
    const feedback = box.querySelector('.teacher-feedback');

    toggle.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if(open) input.focus();
    });

    panel.addEventListener('submit', event => {
      event.preventDefault();
      if(input.value === '1607'){
        unlockAll();
        feedback.textContent = 'Alle Schritte sind freigeschaltet.';
        feedback.className = 'teacher-feedback ok';
        input.value = '';
      }else{
        feedback.textContent = 'Passwort nicht korrekt.';
        feedback.className = 'teacher-feedback no';
        input.select();
      }
    });
  }

  load();
  document.addEventListener('DOMContentLoaded',()=>{
    updateNav();
    initChoices();
    initHyperFrames();
    renderKatex();
    initTeacherAccess();
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
    parseDE,fmt,texNumber,initChoices,allQuestionsCorrect,resetAll,unlockAll,renderKatex
  };
})();
