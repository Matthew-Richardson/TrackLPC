/* Shared display preference only. No operational data is stored here. */
(() => {
  'use strict';
  const key='eztag_color_theme',root=document.documentElement;
  let theme='light';
  try{if(localStorage.getItem(key)==='dark')theme='dark'}catch(e){}
  function apply(value){
    theme=value==='dark'?'dark':'light';
    root.dataset.theme=theme;
    const toggle=document.getElementById('themeToggle');
    if(toggle){toggle.setAttribute('aria-checked',String(theme==='dark'));toggle.title=theme==='dark'?'Switch to light mode':'Switch to dark mode';}
  }
  apply(theme);
  function bind(){
    const toggle=document.getElementById('themeToggle');if(!toggle)return;
    apply(theme);
    toggle.addEventListener('click',()=>{
      apply(theme==='dark'?'light':'dark');
      try{localStorage.setItem(key,theme)}catch(e){}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null)apply(event.key===null?'light':event.newValue)});
})();
