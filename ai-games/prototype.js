/* ---------- game data ---------- */
const GAMES=[
  {id:'g1',name:'Short Stack Panic',emoji:'🥞',desc:'Catch falling pancakes to build the tallest stack',score:75,wins:'1 time',reward:'Free Kids Pancake'},
  {id:'g2',name:'Syrup Drizzle Dash',emoji:'🍯',desc:'Drizzle syrup while dodging spills',score:50,wins:'3 times',reward:'15% off next visit'},
  {id:'g3',name:'Parlour Memory Match',emoji:'🧠',desc:'Flip cards to match menu pairs',score:90,wins:'1 time',reward:'200 Club points'},
];
const EXTRA=[
  {id:'g4',name:'Flip or Miss',emoji:'🥏',desc:'Time the pancake flip perfectly',score:60,wins:'1 time',reward:'Free coffee'},
  {id:'g5',name:'Berry Catch',emoji:'🫐',desc:'Catch berries, avoid the pits',score:40,wins:'3 times',reward:'10% off'},
  {id:'g6',name:'Maple Run',emoji:'🏃',desc:'Endless runner through the diner',score:120,wins:'1 time',reward:'Free topping'},
];
let tableGames=[...GAMES.map(g=>({...g,status:'draft'}))];

/* ---------- screen routing ---------- */
const navBtns=document.querySelectorAll('#nav button[data-s]');
function setNav(s){navBtns.forEach(b=>b.classList.toggle('on',b.dataset.s===s));}
function showScreen(s){
  const member=s.startsWith('m-');
  document.getElementById('hubshell').classList.toggle('hidden',member);
  document.getElementById('memberShell').classList.toggle('hidden',!member);
  document.querySelectorAll('.screen').forEach(el=>el.classList.add('hidden'));
  const el=document.getElementById('s-'+s); if(el) el.classList.remove('hidden');
  setNav(s); window.scrollTo({top:0,behavior:'smooth'});
}
function go(s){ if(s==='config'){startGen();return;} if(s==='table'){renderTable();initPersistentPreview('tbl');} showScreen(s); }
navBtns.forEach(b=>b.addEventListener('click',()=>go(b.dataset.s)));

/* ---------- empty / consent ---------- */
function toggleDrop(){document.getElementById('drop').classList.toggle('hidden');}
function openConsent(){document.getElementById('consent').classList.remove('hidden');}
function closeConsent(){document.getElementById('consent').classList.add('hidden');}
function hide(id){document.getElementById(id).classList.add('hidden');}
function authorize(){closeConsent();showScreen('scan');runScan();}

/* ---------- scrape gallery ---------- */
const TILES=[
  {t:'logo',html:'PANCAKE<br>PARLOUR'},
  {t:'swatch',c:'#e8552f',cap:'Primary #e8552f'},
  {t:'img',e:'🥞'},
  {t:'swatch',c:'#f5b73d',cap:'Accent #f5b73d'},
  {t:'font',big:'Aa',cap:'Heading — Poppins'},
  {t:'img',e:'🍓'},
  {t:'swatch',c:'#3b2a22',cap:'Text #3b2a22'},
  {t:'img',e:'☕'},
  {t:'font',big:'Aa',cap:'Body — Inter'},
  {t:'swatch',c:'#fdeee9',cap:'Surface #fdeee9'},
  {t:'img',e:'🧇'},
  {t:'img',e:'🍯'},
];
function runScan(){
  const m=document.getElementById('masonry');m.innerHTML='';
  document.getElementById('gapPanel').classList.add('hidden');
  const gp0=document.getElementById('gapPill');if(gp0){gp0.className='pill p-amber';gp0.textContent='Missing';}
  const gb0=document.getElementById('gapGenerateBtn');if(gb0){gb0.disabled=true;gb0.style.opacity='.5';gb0.style.cursor='not-allowed';}
  const gu0=document.getElementById('gapUploadBtn');if(gu0){gu0.disabled=false;gu0.textContent='Upload images';}
  document.getElementById('scanSpin').classList.remove('hidden');
  document.getElementById('scanTitle').textContent='Reading your brand…';
  document.getElementById('scanSub').textContent='Scanning pancakeparlour.com.au · this takes about 2 minutes';
  let i=0;
  const iv=setInterval(()=>{
    if(i>=TILES.length){clearInterval(iv);finishScan();return;}
    const t=TILES[i];const d=document.createElement('div');d.className='tile '+t.t;d.style.animationDelay='0s';
    if(t.t==='logo')d.innerHTML=t.html+'<button class="remove-btn" onclick="this.parentElement.remove()">✕</button>';
    else if(t.t==='swatch')d.innerHTML='<div class="swatch" style="background:'+t.c+'"></div><div class="cap">'+t.cap+'</div><button class="remove-btn" onclick="this.parentElement.remove()">✕</button>';
    else if(t.t==='font')d.innerHTML='<div class="big">'+t.big+'</div><div class="cap">'+t.cap+'</div><button class="remove-btn" onclick="this.parentElement.remove()">✕</button>';
    else if(t.t==='img')d.innerHTML='<div class="img">'+t.e+'</div><button class="remove-btn" onclick="this.parentElement.remove()">✕</button>';
    m.appendChild(d);i++;
  },230);
}
function finishScan(){
  document.getElementById('scanSpin').classList.add('hidden');
  document.getElementById('scanTitle').textContent='Found 76 assets · 12 colors · 2 fonts';
  document.getElementById('scanSub').textContent='Couldn\u2019t pull clean product photos — fill the gap below or continue with smart defaults';
  document.getElementById('gapPanel').classList.remove('hidden');
}
function uploadGapImages(){
  const btn=document.getElementById('gapUploadBtn');btn.disabled=true;btn.textContent='Uploading…';
  document.getElementById('scanSpin').classList.remove('hidden');
  document.getElementById('scanTitle').textContent='Adding your uploaded photos…';
  document.getElementById('scanSub').textContent='Continuing the brand scan with your product images';
  const NEW_TILES=[{e:'🍓'},{e:'🥞'},{e:'🧇'}];
  const m=document.getElementById('masonry');
  let i=0;
  const iv=setInterval(()=>{
    if(i>=NEW_TILES.length){clearInterval(iv);finishGapUpload();return;}
    const d=document.createElement('div');d.className='tile img';d.style.animationDelay='0s';
    d.innerHTML='<div class="img">'+NEW_TILES[i].e+'</div><button class="remove-btn" onclick="this.parentElement.remove()">✕</button>';
    m.insertBefore(d,m.firstChild);
    i++;
  },260);
}
function finishGapUpload(){
  document.getElementById('scanSpin').classList.add('hidden');
  document.getElementById('scanTitle').textContent='Found 79 assets · 12 colors · 2 fonts';
  document.getElementById('scanSub').textContent='All set — product images added';
  const gp=document.getElementById('gapPill');gp.className='pill p-green';gp.textContent='✓ Added';
  const gb=document.getElementById('gapGenerateBtn');gb.disabled=false;gb.style.opacity='';gb.style.cursor='';
  const gu=document.getElementById('gapUploadBtn');gu.textContent='✓ Images added';
}

/* ---------- config + table rows ---------- */
function slugify(str){return str.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
function kebabItemsFor(g,ctx){
  if(g.status==='draft'||g.status==='disabled'){
    return '<button onclick="event.stopPropagation();closeKebabs();askActivate(\''+g.id+'\',\''+ctx+'\')">▶ Activate</button>'
         + '<button onclick="event.stopPropagation();closeKebabs();archiveGame(\''+g.id+'\',\''+ctx+'\')">📦 Archive</button>';
  }
  if(g.status==='active'){
    return '<button onclick="event.stopPropagation();closeKebabs();deactivateGame(\''+g.id+'\',\''+ctx+'\')">⏸ Deactivate</button>'
         + '<button onclick="event.stopPropagation();closeKebabs();archiveGame(\''+g.id+'\',\''+ctx+'\')">📦 Archive</button>';
  }
  if(g.status==='archived'){
    return '<button onclick="event.stopPropagation();closeKebabs();unarchiveGame(\''+g.id+'\',\''+ctx+'\')">↩ Move to Draft</button>';
  }
  return '';
}
function toggleKebab(key){
  const menu=document.getElementById('kebab-'+key);
  const wasOpen=menu&&!menu.classList.contains('hidden');
  closeKebabs();
  if(menu&&!wasOpen)menu.classList.remove('hidden');
}
function closeKebabs(){document.querySelectorAll('.kebab-menu').forEach(m=>m.classList.add('hidden'));}
document.addEventListener('click',function(e){ if(!e.target.closest('.kebab-wrap'))closeKebabs(); });

function rowHTML(g,ctx){
  const statusPill = g.status==='active'?'<span class="pill p-green"><span class="dotpulse"></span>Active</span>'
    : g.status==='disabled'?'<span class="pill p-red">Disabled</span>'
    : g.status==='generating'?'<span class="pill p-brand"><span class="dotpulse"></span>Generating…</span>'
    : g.status==='archived'?'<span class="pill p-gray" style="opacity:.6">📦 Archived</span>'
    : '<span class="pill p-gray">Draft</span>';
  const rowOpacity = g.status==='archived'?'opacity:.55;':'';
  const alwaysOpen = ctx==='cfg';
  const mainClick = alwaysOpen ? `selectGame('${ctx}','${g.id}')` : `selectGame('${ctx}','${g.id}');toggleRow('${ctx}','${g.id}')`;
  const key=ctx+'-'+g.id;
  const tag='game_eligible_'+slugify(g.name);
  const headerAction = alwaysOpen
    ? ((g.status==='draft'||g.status==='disabled')?'<button class="btn green sm" onclick="event.stopPropagation();askActivate(\''+g.id+'\',\''+ctx+'\')">▶ Activate</button>':'')
    : `<div class="kebab-wrap">
         <button class="kebab-btn" onclick="event.stopPropagation();toggleKebab('${key}')">⋮</button>
         <div class="kebab-menu hidden" id="kebab-${key}">${kebabItemsFor(g,ctx)}</div>
       </div>`;
  return `
  <div class="grow-row${alwaysOpen?' open':''}" id="row-${ctx}-${g.id}" style="${rowOpacity}">
    <div class="grow-main" onclick="${mainClick}">
      <div class="gthumb" style="background:var(--pp-soft)">${g.emoji}</div>
      <div>
        <div class="gname">${g.name}</div>
        <div class="gmeta">${g.desc}</div>
      </div>
      <div class="right">${statusPill}${headerAction}${alwaysOpen?'':'<span class="chev">▶</span>'}</div>
    </div>
    <div class="expand">
      <div>
        <div class="field-grid">
          <div class="field"><label>Game name</label><input value="${g.name}"/></div>
          <div class="field"><label>Score to win</label><input value="${g.score}"/>
            <div class="hint">Higher = harder, fewer wins.</div></div>
          <div class="field"><label>Wins allowed per member</label>
            <select><option>1 time</option><option>3 times</option><option>5 times</option><option>10 times</option><option>Unlimited</option></select>
            <div class="hint">Game disappears for a member after this many wins.</div></div>
          <div class="field"><label>Total member cap</label>
            <input type="number" value="" placeholder="No limit" />
            <div class="hint">Leave empty for unlimited.</div></div>
          <div class="field"><label>Reward</label>
            <select><option>${g.reward}</option><option>Free coffee</option><option>200 Club points</option><option>+ Create new benefit…</option></select></div>
          <div class="field"><label>Eligible members</label>
            <div class="audience-summary" onclick="event.stopPropagation();openAudience('${ctx}','${g.id}')">
              <span id="audSummary-${ctx}-${g.id}">All registered members</span>
              <span class="aud-edit">Edit →</span>
            </div></div>
        </div>
        <div class="tag-line">🏷️ <code>${tag}</code> <span>applied to eligible members · used for analytics</span></div>
      </div>
    </div>
  </div>`;
}
function renderConfig(){
  document.getElementById('configRows').innerHTML=GAMES.map(g=>rowHTML({...g,status:'draft'},'cfg')).join('');
  GAMES.forEach(g=>updateAudSummary('cfg',g.id));
}
function renderTable(){
  document.getElementById('tableRows').innerHTML=tableGames.map(g=>rowHTML(g,'tbl')).join('');
  tableGames.forEach(g=>updateAudSummary('tbl',g.id));
}
function toggleRow(ctx,id){document.getElementById('row-'+ctx+'-'+id).classList.toggle('open');}

/* ---------- game state mock ---------- */
function gameStateHTML(state,g){
  if(state==='play')return `<div class="gamewrap"><div class="gtop"><span>SCORE 0/${g?g.score:75}</span><span>❤❤❤</span></div>
    <div class="gboard">${Array(8).fill('<div class="gcell">'+(g?g.emoji:'🥞')+'</div>').join('')}</div></div>`;
  if(state==='win')return `<div class="gstate win"><div class="em">🎉</div><h4>You won!</h4>
    <div class="reward-chip">🎁 ${g?g.reward:'Free Kids Pancake'}</div>
    <p>Nice one. You can keep playing to win again.</p>
    <button class="pbtn">Use my reward</button><button class="pbtn sec">Play again</button></div>`;
  if(state==='winfinal')return `<div class="gstate win"><div class="em">🏅</div><h4>You won!</h4>
    <div class="reward-chip">🎁 ${g?g.reward:'Free Kids Pancake'}</div>
    <p>That's your last play for this game. See you next campaign!</p>
    <button class="pbtn">Use my reward</button></div>`;
  if(state==='lose')return `<div class="gstate lose"><div class="em">😅</div><h4>So close!</h4>
    <p>Try again — unlimited tries until you win.</p>
    <button class="pbtn">Play again</button><button class="pbtn sec">Back to home</button></div>`;
  if(state==='out')return `<div class="gstate out"><div class="em">🔒</div><h4>Game over for now</h4>
    <p>You've won this one. Come back when a new game unlocks.</p>
    <button class="pbtn">Back to home</button></div>`;
  if(state==='arena')return `<div class="arena"><div class="ah">🎮 Choose a game</div><div class="alist">
    <div class="acard"><div class="ai">🥞</div><div><div class="an">Short Stack Panic</div><div class="ad">Win: free kids pancake</div></div><div class="ago">›</div></div>
    <div class="acard"><div class="ai">🍯</div><div><div class="an">Syrup Drizzle Dash</div><div class="ad">Win: 15% off next visit</div></div><div class="ago">›</div></div>
    <div class="acard"><div class="ai">🧠</div><div><div class="an">Parlour Memory Match</div><div class="ad">Win: 200 points</div></div><div class="ago">›</div></div>
    </div></div>`;
}
function setPrev(ctx,id,state,btn){
  const g=[...tableGames,...GAMES].find(x=>x.id===id);
  document.getElementById('prev-'+ctx+'-'+id).innerHTML=gameStateHTML(state,g);
  btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
}

/* ---------- eligible-members audience (Campaign Center "Apply to Members" pattern) ---------- */
const AUD_ATTRS=['First Name','Last Name','Gender','Birthday Month','Birthday month and day','Allow Location Services','App User','Generic Wallet 1 Balance','Generic Wallet 2 Balance','Accumulated Credits','Allow Push','Tag','RFM (Auto Segment)','Days Since Last Visit'];
let audienceState={};
let pendingAudience=null;
function openAudience(ctx,id){
  pendingAudience={ctx,id};
  const key=ctx+'_'+id;
  const st=audienceState[key]||{mode:'all',rows:[{attr:'Last Name',op:'is',val:''}]};
  document.getElementById('audAll').checked = st.mode==='all';
  document.getElementById('audSpecific').checked = st.mode==='specific';
  document.getElementById('audFilterBox').classList.toggle('hidden', st.mode!=='specific');
  renderAudRows(st.rows);
  document.getElementById('audienceModal').classList.remove('hidden');
}
function setAudMode(mode){
  document.getElementById('audFilterBox').classList.toggle('hidden', mode!=='specific');
}
function renderAudRows(rows){
  document.getElementById('audRows').innerHTML = rows.map((r,i)=>`
    <div class="aud-row">
      <select data-f="attr">${AUD_ATTRS.map(a=>`<option ${a===r.attr?'selected':''}>${a}</option>`).join('')}</select>
      <select data-f="op">
        <option ${r.op==='is'?'selected':''}>is</option>
        <option ${r.op==='is not'?'selected':''}>is not</option>
        <option ${r.op==='contains'?'selected':''}>contains</option>
      </select>
      <input data-f="val" value="${r.val||''}" placeholder="value"/>
      <button class="aud-remove" onclick="removeAudRow(${i})">✕</button>
    </div>`).join('');
}
function currentAudRows(){
  return [...document.querySelectorAll('#audRows .aud-row')].map(r=>({
    attr:r.querySelector('[data-f="attr"]').value,
    op:r.querySelector('[data-f="op"]').value,
    val:r.querySelector('[data-f="val"]').value
  }));
}
function addAudRowWithAttr(attr){
  const rows=currentAudRows();
  rows.push({attr,op:'is',val:''});
  renderAudRows(rows);
}
function removeAudRow(i){
  const rows=currentAudRows();
  rows.splice(i,1);
  renderAudRows(rows.length?rows:[{attr:'Last Name',op:'is',val:''}]);
}
function saveAudience(){
  const mode=document.getElementById('audSpecific').checked?'specific':'all';
  const rows=currentAudRows();
  const key=pendingAudience.ctx+'_'+pendingAudience.id;
  audienceState[key]={mode,rows};
  updateAudSummary(pendingAudience.ctx,pendingAudience.id);
  hide('audienceModal');
}
function updateAudSummary(ctx,id){
  const key=ctx+'_'+id;
  const st=audienceState[key];
  const el=document.getElementById('audSummary-'+ctx+'-'+id);
  if(!el)return;
  if(!st||st.mode==='all'){el.textContent='All registered members';return;}
  const first=st.rows[0];
  let txt = first? (first.attr+' '+first.op+' '+(first.val||'…')) : 'condition set';
  if(st.rows.length>1) txt += ' +'+(st.rows.length-1)+' more';
  el.textContent='Specific: '+txt;
}

/* ---------- activation flow: loader → success (rule links + member tag) ---------- */
let pending=null;
function askActivate(id,ctx){
  pending={id,ctx};
  const g=[...tableGames,...GAMES].find(x=>x.id===id);
  document.getElementById('activateFlow').classList.remove('hidden');
  renderActivateLoading(g);
  setTimeout(()=>renderActivateSuccess(g),1400);
}
function renderActivateLoading(g){
  document.getElementById('activateFlowBox').innerHTML = `
    <div style="text-align:center;padding:10px 6px 4px">
      <div class="spinner" style="margin:0 auto 16px;width:26px;height:26px"></div>
      <h3 style="margin:0 0 6px">Activating "${g.name}"…</h3>
      <p style="color:var(--soft);font-size:13px;margin:0">Creating the eligibility rule and reward rule in Campaign Center…</p>
    </div>`;
}
function renderActivateSuccess(g){
  if(pending.ctx==='cfg'){
    tableGames=GAMES.map(x=>({...x,status:x.id===pending.id?'active':'draft'}));
  }else{
    const gg=tableGames.find(x=>x.id===pending.id); if(gg)gg.status='active';
  }
  renderTable();
  const key=pending.ctx+'_'+pending.id;
  const st=audienceState[key];
  const audText = (!st||st.mode==='all') ? 'All registered members'
    : ('Specific members · '+(st.rows[0]?st.rows[0].attr+' '+st.rows[0].op+' '+(st.rows[0].val||'…'):'condition set'));
  const tag='game_eligible_'+slugify(g.name);
  document.getElementById('activateFlowBox').innerHTML = `
    <h3>✅ "${g.name}" is live</h3>
    <div class="legal" style="margin-bottom:14px">Two rules were created in Campaign Center, tagged <span class="pill p-brand" style="margin-left:2px">Managed by Games</span>.</div>
    <div class="card act-rule-card">
      <div class="ic">🎯</div>
      <div style="flex:1"><div class="ttl">Eligibility rule</div><div class="sub2">${audText}</div></div>
      <a href="#" onclick="alert('Opens rule in Campaign Center (prototype)');return false;">View rule →</a>
    </div>
    <div class="card act-rule-card">
      <div class="ic">🎁</div>
      <div style="flex:1"><div class="ttl">Reward rule</div><div class="sub2">GAME_WIN → ${g.reward}</div></div>
      <a href="#" onclick="alert('Opens rule in Campaign Center (prototype)');return false;">View rule →</a>
    </div>
    <div class="field" style="margin-top:14px">
      <label>Member tag (for analytics)</label>
      <div style="background:var(--graypill);border-radius:8px;padding:8px 11px;font-family:ui-monospace,monospace;font-size:12.5px">${tag}</div>
      <div class="hint">Applied on eligibility, removed on final win. Use to segment or report in analytics.</div>
    </div>
    <div class="acts"><button class="btn" onclick="hide('activateFlow');finishActivateFlow()">Done</button></div>`;
}
function finishActivateFlow(){
  if(pending && pending.ctx==='cfg'){ go('table'); }
  pending=null;
}
function deactivateGame(id,ctx){const g=tableGames.find(x=>x.id===id);if(g)g.status='disabled';renderTable();}
function archiveGame(id,ctx){const g=tableGames.find(x=>x.id===id);if(g)g.status='archived';renderTable();}
function unarchiveGame(id,ctx){const g=tableGames.find(x=>x.id===id);if(g)g.status='draft';renderTable();}

/* ---------- generate more (lazy rows) ---------- */
let extraIdx=0;
function generateMore(){
  const batch=EXTRA.slice(extraIdx,extraIdx+3).map(g=>({...g,status:'generating'}));
  if(batch.length===0){openFakeDoor();return;}
  tableGames=[...tableGames,...batch];extraIdx+=3;renderTable();
  // simulate streaming completion
  const lines=['Game Designer picking templates…','Skinning game 1…','Skinning game 2…','Finalizing…'];
  batch.forEach((b,k)=>{
    setTimeout(()=>{const g=tableGames.find(x=>x.id===b.id);if(g)g.status='draft';renderTable();
      if(extraIdx>=EXTRA.length && k===batch.length-1){/* near max */}},1800+k*700);
  });
}

/* ---------- gap-fill → generation (combined into config screen) ---------- */
function startGen(){
  showScreen('config');
  // reset config screen to generating state
  document.getElementById('configRows').innerHTML='';
  document.getElementById('cfgTitle').textContent='Generating your games…';
  document.getElementById('cfgSub').textContent='Games appear below as the Game Designer delegates to coders.';
  document.getElementById('agentPanel').classList.remove('hidden');
  document.getElementById('cfgSpinner').style.display='';
  document.getElementById('designerThoughts').innerHTML='';
  initPersistentPreview('cfg');
  runGenerating();
}

/* ---------- generating flow (streams into config screen) ---------- */
const DESIGNER_THOUGHTS=[
  'Analyzing brand personality… Pancake Parlour is warm, family-friendly, Australian.',
  'Menu items detected: pancakes, waffles, berries, syrup, coffee, shakes.',
  'Best mechanics for food brands: catching, stacking, memory matching.',
  'Selecting 3 templates from the bank…',
  '→ Delegating "Short Stack Panic" (catch & stack) to Coder 1…',
  '→ Delegating "Syrup Drizzle Dash" (dodge & drizzle) to Coder 2…',
  '→ Delegating "Parlour Memory Match" (card flip) to Coder 3…',
];
function runGenerating(){
  const dt=document.getElementById('designerThoughts'); dt.innerHTML='';
  let di=0;
  const dIv=setInterval(()=>{
    if(di>=DESIGNER_THOUGHTS.length){clearInterval(dIv);finishGenerating();return;}
    dt.innerHTML+='<div style="margin-bottom:3px">› '+DESIGNER_THOUGHTS[di]+'</div>';
    dt.scrollTop=dt.scrollHeight;
    // When designer delegates a game (lines 4,5,6), add a generating row
    if(di===4) addGenRow(GAMES[0]);
    if(di===5) addGenRow(GAMES[1]);
    if(di===6) addGenRow(GAMES[2]);
    di++;
  },500);
}
function addGenRow(g){
  const rows=document.getElementById('configRows');
  const row=document.createElement('div');row.className='grow-row';row.id='genrow-'+g.id;
  row.innerHTML=`<div class="grow-main" style="opacity:.7">
    <div class="gthumb shimmer" style="background:var(--brand-soft)">${g.emoji}</div>
    <div><div class="gname">${g.name}</div><div class="genline"><div class="dotpulse" style="color:var(--brand)"></div> Coder skinning…</div></div>
    <div class="right"><span class="pill p-brand"><span class="dotpulse"></span>Generating…</span></div>
  </div>`;
  rows.appendChild(row);
}
function finishGenerating(){
  // After a brief pause, replace generating rows with real config rows
  setTimeout(()=>{
    document.getElementById('cfgSpinner').style.display='none';
    document.getElementById('agentTitle').textContent='✅ Game Designer done — 3 games ready';
    document.getElementById('cfgTitle').textContent='Your games are ready 🎉';
    document.getElementById('cfgSub').textContent='Configure each game, preview it on the right, then activate.';
    renderConfig();
    initPersistentPreview('cfg');
  },800);
}

/* ---------- persistent phone preview ---------- */
let selectedGameId='g1';
const ALL_GAMES=[...GAMES,...EXTRA];
function selectGame(ctx,id){
  selectedGameId=id;
  const target=ctx==='cfg'?'cfgPhonePreview':'tblPhonePreview';
  const g=[...tableGames,...GAMES,...EXTRA].find(x=>x.id===id);
  if(g && document.getElementById(target)) document.getElementById(target).innerHTML=gameStateHTML('play',g);
}
function setCfgPrev(state,btn){
  const g=[...GAMES,...EXTRA].find(x=>x.id===selectedGameId)||GAMES[0];
  document.getElementById('cfgPhonePreview').innerHTML=gameStateHTML(state,g);
  btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
}
function setTblPrev(state,btn){
  const g=[...tableGames,...EXTRA].find(x=>x.id===selectedGameId)||tableGames[0];
  document.getElementById('tblPhonePreview').innerHTML=gameStateHTML(state,g);
  btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
}
function initPersistentPreview(ctx){
  const target=ctx==='cfg'?'cfgPhonePreview':'tblPhonePreview';
  const g=GAMES[0];selectedGameId=g.id;
  if(document.getElementById(target)) document.getElementById(target).innerHTML=gameStateHTML('play',g);
}

/* ---------- fake door ---------- */
function openFakeDoor(){document.getElementById('fakedoor').classList.remove('hidden');}

/* ---------- try game (interactive mini-game in phone frame) ---------- */
function tryGame(){
  const g=[...ALL_GAMES].find(x=>x.id===selectedGameId)||GAMES[0];
  const targets=['cfgPhonePreview','tblPhonePreview'];
  const target=targets.find(t=>document.getElementById(t)&&document.getElementById(t).closest('.screen:not(.hidden)'));
  const el=document.getElementById(target||'cfgPhonePreview');
  if(!el)return;
  let score=0;const needed=g.score;
  el.innerHTML=`<div class="gamewrap" id="tryGameWrap">
    <div class="gtop"><span id="tryScore">SCORE ${score}/${needed}</span><span>❤❤❤</span></div>
    <div class="gboard" id="tryBoard" style="cursor:pointer">${Array(8).fill('<div class="gcell" style="transition:transform .1s">'+g.emoji+'</div>').join('')}</div>
  </div>`;
  const board=document.getElementById('tryBoard');
  board.querySelectorAll('.gcell').forEach(cell=>{
    cell.addEventListener('click',function(){
      cell.style.transform='scale(1.3)';
      setTimeout(()=>cell.style.transform='',150);
      score+=Math.floor(needed/6);
      document.getElementById('tryScore').textContent='SCORE '+Math.min(score,needed)+'/'+needed;
      if(score>=needed){
        el.innerHTML=gameStateHTML('win',g);
      }
    });
  });
}

/* ---------- member screens ---------- */
function memberGo(s){showScreen(s);if(s==='m-play')renderMemberGame('play');}
function renderMemberGame(state){document.getElementById('memberGame').innerHTML=gameStateHTML(state,GAMES[0]);}
function setState(state,btn){
  renderMemberGame(state);
  btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  const caps={play:'Unlimited plays until you win.',win:'GAME_WIN → CC reward rule grants the reward · member stays tagged.',
    winfinal:'Final allowed win → member is untagged · game leaves their surfaces.',
    lose:'Play count +1 (analytics only) · no gating.',out:'Member already won max times · untagged.'};
  document.getElementById('stateCap').textContent=caps[state];
}

/* init */
document.getElementById('audAddSelect').innerHTML = '<option value="">Select member attribute…</option>' + AUD_ATTRS.map(a=>`<option>${a}</option>`).join('');
showScreen('empty');
setTimeout(()=>document.getElementById('flag').style.display='none',9000);
