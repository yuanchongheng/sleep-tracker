(()=>{
  const KEY='sleepTracker.v1';
  const PAGE_KEY='sleepTracker.historyPageSize';
  const $=id=>document.getElementById(id);
  let page=1;
  let pageSize=parseInt(localStorage.getItem(PAGE_KEY)||'10',10);
  let rendering=false;
  let obs=null;

  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function mins(t){const[h,m]=String(t).split(':').map(Number);return h*60+m}
  function shiftDate(s,n){const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
  function derive(r){
    if(r.bedDateTime&&r.wakeDateTime)return{bed:r.bedDateTime.replace('T',' '),wake:r.wakeDateTime.replace('T',' ')};
    const bd=mins(r.bed)>mins(r.wake)?shiftDate(r.date,-1):r.date;
    return{bed:`${bd} ${r.bed}:00`,wake:`${r.date} ${r.wake}:00`};
  }

  function render(){
    const host=$('historyBody');
    if(!host||rendering)return;
    rendering=true;
    if(obs)obs.disconnect();

    try{
      const records=load().sort((a,b)=>b.date.localeCompare(a.date));
      if(!records.length){
        host.innerHTML='<div class="empty">还没有记录。先登记今天的睡眠，图表会自动生成。</div>';
        return;
      }

      pageSize=[10,20,50].includes(pageSize)?pageSize:10;
      const total=records.length,totalPages=Math.max(1,Math.ceil(total/pageSize));
      if(page>totalPages)page=totalPages;
      if(page<1)page=1;
      const start=(page-1)*pageSize,end=Math.min(start+pageSize,total),slice=records.slice(start,end);
      const rows=slice.map(r=>{
        const d=derive(r);
        return `<tr>
          <td>${r.date}</td>
          <td>${d.bed}</td>
          <td>${d.wake}</td>
          <td><b>${(r.duration/60).toFixed(1)}h</b></td>
          <td class="muted">${esc(r.note||'—')}</td>
          <td><div class="row-actions">
            <button class="mini history-edit" type="button" data-id="${esc(r.id)}">编辑</button>
            <button class="mini history-delete" type="button" data-id="${esc(r.id)}">删除</button>
          </div></td>
        </tr>`;
      }).join('');

      host.innerHTML=`
        <div class="table-wrap"><table><thead><tr><th>归属日</th><th>实际入睡日期时间</th><th>实际起床日期时间</th><th>时长</th><th>备注</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="history-toolbar">
          <div class="history-count">共 <b>${total}</b> 条记录 <span class="history-range">· 当前显示 ${start+1}–${end}</span></div>
          <div class="history-pagination">
            <button class="history-page-btn" id="historyPrev" type="button" ${page===1?'disabled':''}>上一页</button>
            <span class="history-page-info">${page} / ${totalPages}</span>
            <button class="history-page-btn" id="historyNext" type="button" ${page===totalPages?'disabled':''}>下一页</button>
            <label>每页
              <select id="historyPageSize">
                <option value="10" ${pageSize===10?'selected':''}>10</option>
                <option value="20" ${pageSize===20?'selected':''}>20</option>
                <option value="50" ${pageSize===50?'selected':''}>50</option>
              </select>
              条
            </label>
          </div>
        </div>`;

      $('historyPrev')?.addEventListener('click',()=>{page--;render();scrollHistoryIntoView()});
      $('historyNext')?.addEventListener('click',()=>{page++;render();scrollHistoryIntoView()});
      $('historyPageSize')?.addEventListener('change',e=>{pageSize=parseInt(e.target.value,10);localStorage.setItem(PAGE_KEY,String(pageSize));page=1;render()});
    }finally{
      rendering=false;
      if(obs)obs.observe(host,{childList:true});
    }
  }

  function scrollHistoryIntoView(){document.querySelector('.history')?.scrollIntoView({behavior:'smooth',block:'start'})}

  const host=$('historyBody');
  if(host){
    host.addEventListener('click',e=>{
      const edit=e.target.closest('.history-edit');
      if(edit&&typeof window.__edit==='function'){
        window.__edit(edit.dataset.id);
        return;
      }
      const del=e.target.closest('.history-delete');
      if(del&&typeof window.__remove==='function')window.__remove(del.dataset.id);
    });

    obs=new MutationObserver(()=>{
      if(!rendering)setTimeout(render,0);
    });
    obs.observe(host,{childList:true});
  }

  window.addEventListener('storage',e=>{if(e.key===KEY)render()});
  setTimeout(render,30);
})();