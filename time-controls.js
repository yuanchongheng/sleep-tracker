(()=>{
  const $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');

  function build(id,pickerId){
    const hidden=$(id),host=$(pickerId);
    if(!hidden||!host)return null;
    const hours=Array.from({length:24},(_,i)=>`<option value="${pad(i)}">${pad(i)}</option>`).join('');
    const minutes=Array.from({length:60},(_,i)=>`<option value="${pad(i)}">${pad(i)}</option>`).join('');
    host.innerHTML=`<div class="time-select"><select class="time-hour" aria-label="${id==='bed'?'入睡':'起床'}小时">${hours}</select><span class="time-colon">:</span><select class="time-minute" aria-label="${id==='bed'?'入睡':'起床'}分钟">${minutes}</select></div><div class="time-caption"><span>小时</span><span>:</span><span>分钟</span></div>`;
    const h=host.querySelector('.time-hour'),m=host.querySelector('.time-minute');

    function fromHidden(){
      const match=String(hidden.value||'00:00').match(/^(\d{1,2}):(\d{2})$/);
      const hh=match?pad(Math.min(23,Math.max(0,+match[1]))):'00';
      const mm=match?pad(Math.min(59,Math.max(0,+match[2]))):'00';
      h.value=hh;m.value=mm;
    }
    function toHidden(){
      hidden.value=`${h.value}:${m.value}`;
      hidden.dispatchEvent(new Event('input',{bubbles:true}));
      hidden.dispatchEvent(new Event('change',{bubbles:true}));
    }
    h.addEventListener('change',toHidden);m.addEventListener('change',toHidden);
    fromHidden();
    return fromHidden;
  }

  const syncBed=build('bed','bedPicker');
  const syncWake=build('wake','wakePicker');
  function sync(){syncBed?.();syncWake?.()}
  window.__syncTimeControls=sync;

  // Existing edit/reset logic changes hidden values programmatically, so resync afterwards.
  document.addEventListener('click',e=>{
    if(e.target.closest('.history-edit')||e.target.closest('#cancelEdit'))setTimeout(sync,0);
  });
  const form=$('sleepForm');
  if(form)form.addEventListener('submit',()=>setTimeout(sync,0));
  setTimeout(sync,30);
})();