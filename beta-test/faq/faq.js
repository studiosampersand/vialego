(function(){
  const host=document.getElementById('faqContent');
  function lang(){
    try{
      const candidates=Object.keys(localStorage).filter(k=>k.startsWith('mobud-')&&k.includes('data'));
      for(const key of candidates){const data=JSON.parse(localStorage.getItem(key)||'null');if(data?.settings?.language)return String(data.settings.language).slice(0,2)}
    }catch(e){}
    return (navigator.language||'nl').slice(0,2);
  }
  const locale=lang();
  fetch('../content/faq.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json()}).then(items=>{
    host.innerHTML=items.map((item,i)=>{
      const q=item.question?.[locale]||item.question?.nl||item.question?.en||'';
      const a=item.answer?.[locale]||item.answer?.nl||item.answer?.en||'';
      return `<article class="faq-item"><button class="faq-question" aria-expanded="false" aria-controls="answer-${i}"><span>${escapeHtml(q)}</span><span class="faq-chevron" aria-hidden="true"></span></button><div class="faq-answer hidden" id="answer-${i}">${escapeHtml(a)}</div></article>`;
    }).join('');
    host.querySelectorAll('.faq-question').forEach(button=>button.addEventListener('click',()=>{
      const item=button.closest('.faq-item');const answer=item.querySelector('.faq-answer');const open=answer.classList.toggle('hidden')===false;
      item.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));
    }));
  }).catch(()=>{host.innerHTML='<p class="error">De FAQ kon niet worden geladen. Open MoBud opnieuw en probeer nogmaals.</p>'});
  function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
})();
