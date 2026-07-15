/* ---------- game data ---------- */
/* g1-g3 are real, playable HTML5 games (see games/<slug>/) rather than mocked boards.
   playUrl is what loads in the live phone preview iframe; themeUrl points at that
   game's own theme.json, which is the single source of truth for in-game copy
   (content.title, meta.pageTitle). Saving the "Game name" field patches that file
   via POST /api/game-theme so the live game reflects the merchant's rename. */
const ARENA_URL='games/index.html';
const GAMES=[
  {id:'g1',name:'Vapiano Loop',emoji:'🐍',desc:'Wrapping snake — slide off any edge and reappear on the other side',score:200,wins:'1 time',reward:'Free Kids Pancake',playUrl:'games/snake/index.html',themeUrl:'games/snake/theme.json',slug:'snake'},
  {id:'g2',name:'Pasta Pairing',emoji:'🍝',desc:'Flip cards to match every menu pair before time runs out',score:600,wins:'3 times',reward:'15% off next visit',playUrl:'games/memory/index.html',themeUrl:'games/memory/theme.json',slug:'memory'},
  {id:'g3',name:'Menu Tower',emoji:'🗼',desc:'Auto-bounce climber — steer the chef over real menu-photo platforms',score:1000,wins:'1 time',reward:'200 Club points',playUrl:'games/tower-jump/index.html',themeUrl:'games/tower-jump/theme.json',slug:'tower-jump'},
];
const EXTRA=[
  {id:'g4',name:'Flip or Miss',emoji:'🥏',desc:'Time the pancake flip perfectly',score:60,wins:'1 time',reward:'Free coffee'},
  {id:'g5',name:'Berry Catch',emoji:'🫐',desc:'Catch berries, avoid the pits',score:40,wins:'3 times',reward:'10% off'},
  {id:'g6',name:'Maple Run',emoji:'🏃',desc:'Endless runner through the diner',score:120,wins:'1 time',reward:'Free topping'},
];
let tableGames=[...GAMES.map(g=>({...g,status:'draft'}))];

/* ---------- gifts (Campaign Center "Send Benefit" pattern) ---------- */
const GIFTS=[
  {id:'gift1',emoji:'🥞',name:'Free Kids Pancake'},
  {id:'gift2',emoji:'🍯',name:'15% off next visit'},
  {id:'gift3',emoji:'⭐',name:'200 Club points'},
  {id:'gift4',emoji:'☕',name:'Free coffee'},
  {id:'gift5',emoji:'🧇',name:'Free topping'},
  {id:'gift6',emoji:'🫐',name:'10% off'},
];
function jsStr(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
function benefitListHTML(ctx,id,filter,current){
  const f=(filter||'').toLowerCase();
  const items=GIFTS.filter(g=>g.name.toLowerCase().includes(f));
  if(items.length===0) return '<div style="padding:10px 4px;font-size:12px;color:var(--soft)">No gifts match "'+escH(filter)+'"</div>';
  return items.map(g=>`<div class="benefit-row${g.name===current?' sel':''}" onclick="selectBenefit('${ctx}','${id}','${jsStr(g.name)}')">
    <div class="benefit-thumb">${g.emoji}</div><div class="benefit-name">${escH(g.name)}</div>
  </div>`).join('');
}
function escH(s){const d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML;}
function toggleBenefitPicker(ctx,id){
  const panel=document.getElementById('benefitPanel-'+ctx+'-'+id);
  if(!panel)return;
  const wasHidden=panel.classList.contains('hidden');
  closeBenefitPickers();
  if(wasHidden){
    panel.classList.remove('hidden');
    const input=panel.querySelector('.benefit-search input');
    if(input){input.value='';filterBenefitList(ctx,id,'');input.focus();}
  }
}
function closeBenefitPickers(){
  document.querySelectorAll('.benefit-panel').forEach(p=>p.classList.add('hidden'));
}
function filterBenefitList(ctx,id,val){
  const list=document.getElementById('benefitList-'+ctx+'-'+id);
  if(list) list.innerHTML=benefitListHTML(ctx,id,val,null);
}
function selectBenefit(ctx,id,name){
  const label=document.getElementById('benefitLabel-'+ctx+'-'+id);
  if(label) label.textContent=name;
  closeBenefitPickers();
  markConfigDirty(ctx,id);
}
function markConfigDirty(ctx,id){
  const btn=document.getElementById('saveFooterBtn-'+ctx+'-'+id);
  if(btn) btn.classList.remove('hidden');
}
function createGiftPlaceholder(){
  alert('This will open the Create Gift page (prototype)');
}
document.addEventListener('click',function(e){ if(!e.target.closest('.benefit-picker'))closeBenefitPickers(); });

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
function go(s){ if(s==='config'){startGen();return;} showScreen(s); }
navBtns.forEach(b=>b.addEventListener('click',()=>go(b.dataset.s)));

/* ---------- empty / consent ---------- */
function toggleDrop(){document.getElementById('drop').classList.toggle('hidden');}
function openConsent(){document.getElementById('consent').classList.remove('hidden');}
function closeConsent(){document.getElementById('consent').classList.add('hidden');}
function hide(id){document.getElementById(id).classList.add('hidden');}
function authorize(){closeConsent();showScreen('scan');runScan();}

/* ---------- drag & drop hover feedback ---------- */
(function(){
  const zone=document.getElementById('drop');
  const icon=document.getElementById('dropIcon');
  const label=document.getElementById('dropLabel');
  const help=document.getElementById('dropHelp');
  let dragDepth=0;
  function setActive(on){
    zone.classList.toggle('drag-active',on);
    icon.textContent=on?'📥':'📁';
    label.textContent=on?'Release to upload…':'Drag & drop files here';
    help.style.visibility=on?'hidden':'visible';
  }
  zone.addEventListener('dragenter',e=>{e.preventDefault();dragDepth++;setActive(true);});
  zone.addEventListener('dragover',e=>{e.preventDefault();});
  zone.addEventListener('dragleave',e=>{e.preventDefault();dragDepth=Math.max(0,dragDepth-1);if(dragDepth===0)setActive(false);});
  zone.addEventListener('drop',e=>{
    e.preventDefault();dragDepth=0;setActive(false);
    const n=e.dataTransfer&&e.dataTransfer.files?e.dataTransfer.files.length:0;
    if(n>0)alert(n+' file'+(n===1?'':'s')+' ready to upload (prototype)');
  });
})();

/* ---------- scrape gallery ---------- */
/* Real assets scraped from vapiano.com.au (loya-play-agent crawl output), symlinked
   into this folder as brand-assets/. Colors/fonts match brand-assets/../DESIGN.md
   (Vapiano Australia design tokens) and the theme.json files the real games use. */
const TILES=[
  {t:'logo',src:'brand-assets/icons/site/logo.svg'},
  {t:'swatch',c:'#ed1b3b',cap:'Primary #ed1b3b'},
  {t:'photo',src:'brand-assets/images/Classic Margherita_Pizza.jpg',cap:'Classic Margherita'},
  {t:'swatch',c:'#1a73e8',cap:'Secondary #1a73e8'},
  {t:'font',big:'Aa',cap:'Headline — Okkult',style:"font-family:Georgia,'Times New Roman',serif"},
  {t:'photo',src:'brand-assets/images/Burrata.jpg',cap:'Burrata'},
  {t:'swatch',c:'#212529',cap:'Ink #212529'},
  {t:'photo',src:'brand-assets/images/Tiramisu.jpg',cap:'Tiramisu'},
  {t:'font',big:'Aa',cap:'Body — Barlow',style:'font-family:Barlow,sans-serif'},
  {t:'swatch',c:'#f25f75',cap:'Primary light #f25f75'},
  {t:'photo',src:'brand-assets/images/Rocket and Parmesan Salad.jpg',cap:'Rocket & Parmesan'},
  {t:'photo',src:'brand-assets/images/chef character 1024x894.png',cap:'Chef mascot'},
  {t:'photo',src:'brand-assets/images/pasta_people.png',cap:'Pasta People'},
  {t:'icon',src:'brand-assets/images/vegan option.png',cap:'Vegan icon'},
];
function tileHTML(t){
  const removeBtn='<button class="remove-btn" onclick="this.parentElement.remove()">✕</button>';
  if(t.t==='logo')return `<div class="fill"><img src="${encodeURI(t.src)}" alt="Vapiano Australia logo"/></div>${removeBtn}`;
  if(t.t==='swatch')return `<div class="fill" style="background:${t.c}"></div><div class="cap">${escH(t.cap)}</div>${removeBtn}`;
  if(t.t==='font')return `<div class="fill" style="${t.style||''}">${t.big}</div><div class="cap">${escH(t.cap)}</div>${removeBtn}`;
  // 'icon' and 'photo' (default) both show a real image filling the tile, styled differently in CSS
  return `<div class="fill"><img src="${encodeURI(t.src)}" alt="${escH(t.cap||'')}"/></div><div class="cap">${escH(t.cap||'')}</div>${removeBtn}`;
}
function runScan(){
  const m=document.getElementById('masonry');m.innerHTML='';
  document.getElementById('scanActions').classList.add('hidden');
  const au0=document.getElementById('addAssetsBtn');if(au0){au0.disabled=false;au0.textContent='Add more assets';}
  document.getElementById('scanSpin').classList.remove('hidden');
  document.getElementById('scanTitle').textContent='Reading your brand…';
  document.getElementById('scanSub').textContent='Scanning vapiano.com.au · this takes about 2 minutes';
  let i=0;
  const iv=setInterval(()=>{
    if(i>=TILES.length){clearInterval(iv);finishScan();return;}
    const t=TILES[i];const d=document.createElement('div');d.className='tile '+t.t;d.style.animationDelay='0s';
    d.innerHTML=tileHTML(t);
    m.appendChild(d);i++;
  },340);
}
function finishScan(){
  document.getElementById('scanSpin').classList.add('hidden');
  document.getElementById('scanTitle').textContent='Review your brand assets';
  document.getElementById('scanSub').textContent='We found your brand colors, fonts, and icons. You can generate games now using these assets, or upload specific product photos to personalize them further.';
  document.getElementById('scanActions').classList.remove('hidden');
}
function uploadGapImages(){
  document.getElementById('gapFileInput').click();
}
function handleGapFileSelected(){
  const input=document.getElementById('gapFileInput');
  if(!input.files||!input.files.length)return;
  const btn=document.getElementById('addAssetsBtn');btn.disabled=true;btn.textContent='Uploading…';
  document.getElementById('scanSpin').classList.remove('hidden');
  document.getElementById('scanTitle').textContent='Adding your uploaded photos…';
  document.getElementById('scanSub').textContent='Continuing the brand scan with your product images';
  const NEW_TILES=[
    {t:'photo',src:'brand-assets/images/Focaccia.jpg',cap:'Focaccia'},
    {t:'photo',src:'brand-assets/images/Spaghetti Bolognese.jpg',cap:'Spaghetti Bolognese'},
    {t:'photo',src:'brand-assets/images/Fusilli Bascilico.jpg',cap:'Fusilli Basilico'},
  ];
  const m=document.getElementById('masonry');
  let i=0;
  const iv=setInterval(()=>{
    if(i>=NEW_TILES.length){clearInterval(iv);finishGapUpload();return;}
    const t=NEW_TILES[i];const d=document.createElement('div');d.className='tile '+t.t;d.style.animationDelay='0s';
    d.innerHTML=tileHTML(t);
    m.insertBefore(d,m.firstChild);
    i++;
  },380);
}

function finishGapUpload(){
  document.getElementById('scanSpin').classList.add('hidden');
  document.getElementById('scanTitle').textContent='Review your brand assets';
  document.getElementById('scanSub').textContent='Nice — your product photos are in. Generate games whenever you’re ready.';
  document.getElementById('scanActions').classList.remove('hidden');
  const btn=document.getElementById('addAssetsBtn');btn.disabled=false;btn.textContent='✓ Assets added';
}

/* ---------- config + table rows ---------- */
function slugify(str){return str.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
function kebabItemsFor(g,ctx){
  if(g.status==='draft'){
    return '<button onclick="event.stopPropagation();closeKebabs();askSaveConfig(\''+g.id+'\',\''+ctx+'\')">Save configuration</button>'
         + '<button onclick="event.stopPropagation();closeKebabs();archiveGame(\''+g.id+'\',\''+ctx+'\')">📦 Archive</button>';
  }
  if(g.status==='ready'||g.status==='disabled'){
    return '<button onclick="event.stopPropagation();closeKebabs();askActivate(\''+g.id+'\',\''+ctx+'\')">Turn on game</button>'
         + '<button onclick="event.stopPropagation();closeKebabs();archiveGame(\''+g.id+'\',\''+ctx+'\')">📦 Archive</button>';
  }
  if(g.status==='active'){
    return '<button onclick="event.stopPropagation();closeKebabs();showCampaignHandoff(\''+g.id+'\',\''+ctx+'\')">Use in Campaign</button>'
         + '<button onclick="event.stopPropagation();closeKebabs();askPauseGame(\''+g.id+'\',\''+ctx+'\')">⏸ Pause game</button>'
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
  const statusPill = g.status==='active'?'<span class="pill p-green"><span class="dotpulse"></span>On</span>'
    : g.status==='ready'?'<span class="pill p-brand">Ready</span>'
    : g.status==='disabled'?'<span class="pill p-amber">Paused</span>'
    : g.status==='generating'?'<span class="pill p-brand"><span class="dotpulse"></span>Generating…</span>'
    : g.status==='archived'?'<span class="pill p-gray" style="opacity:.6">📦 Archived</span>'
    : '<span class="pill p-gray">Draft</span>';
  const rowOpacity = g.status==='archived'?'opacity:.55;':'';
  const alwaysOpen = ctx==='cfg';
  const mainClick = alwaysOpen ? `selectGame('${ctx}','${g.id}')` : `selectGame('${ctx}','${g.id}');toggleRow('${ctx}','${g.id}')`;
  const key=ctx+'-'+g.id;
  const headerAction = alwaysOpen
    ? (g.status==='draft'
        ? '<button class="btn sec sm" onclick="event.stopPropagation();askSaveConfig(\''+g.id+'\',\''+ctx+'\')">Save configuration</button>'
        : g.status==='ready'||g.status==='disabled'
          ? '<button class="btn green sm" onclick="event.stopPropagation();askActivate(\''+g.id+'\',\''+ctx+'\')">Turn on game</button>'
          : g.status==='active'
            ? '<button class="btn sm" onclick="event.stopPropagation();showCampaignHandoff(\''+g.id+'\',\''+ctx+'\')">Use in Campaign</button>'
              + '<button class="btn sec sm" onclick="event.stopPropagation();askPauseGame(\''+g.id+'\',\''+ctx+'\')">Pause</button>'
            : '')
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
          <div class="field"><label>Game name</label><input id="gameName-${ctx}-${g.id}" value="${g.name}" oninput="markConfigDirty('${ctx}','${g.id}')"/></div>
          <div class="field"><label>Score to win</label><input id="gameScore-${ctx}-${g.id}" type="number" min="1" value="${g.score}" oninput="markConfigDirty('${ctx}','${g.id}')"/>
            <div class="hint">Higher = harder, fewer wins.</div></div>
          <div class="field"><label>Wins allowed per member</label>
            <select id="gameWins-${ctx}-${g.id}" onchange="markConfigDirty('${ctx}','${g.id}')">${['1 time','3 times','5 times','10 times','Unlimited'].map(v=>`<option ${v===g.wins?'selected':''}>${v}</option>`).join('')}</select>
            <div class="hint">Game disappears for a member after this many wins.</div></div>
          <div class="field"><label>Total Gifts available</label>
            <input id="gameCap-${ctx}-${g.id}" type="number" min="1" value="${g.totalCap||''}" placeholder="No limit" oninput="markConfigDirty('${ctx}','${g.id}')" />
            <div class="hint">Shared across all Members. Leave empty for unlimited.</div></div>
          <div class="field"><label>Gift</label>
            <div class="benefit-picker" id="benefit-${ctx}-${g.id}">
              <button type="button" class="benefit-trigger" onclick="event.stopPropagation();toggleBenefitPicker('${ctx}','${g.id}')">
                <span id="benefitLabel-${ctx}-${g.id}">${g.reward}</span>
                <span class="benefit-chev">▾</span>
              </button>
              <div class="benefit-panel hidden" id="benefitPanel-${ctx}-${g.id}" onclick="event.stopPropagation()">
                <div class="benefit-search"><input type="text" placeholder="Search" oninput="filterBenefitList('${ctx}','${g.id}',this.value)"/><span class="bsearch-ic">🔍</span></div>
                <div class="benefit-filters"><span>Type <b>All ▾</b></span><span>Status <b>Activated ▾</b></span></div>
                <div class="benefit-listhead"><span>Gifts</span><a href="#" onclick="event.preventDefault();createGiftPlaceholder()">Create Gift</a></div>
                <div class="benefit-list" id="benefitList-${ctx}-${g.id}">${benefitListHTML(ctx,g.id,'',g.reward)}</div>
              </div>
            </div></div>
        </div>
        <div class="game-config-footer">
          <div class="game-config-scope"><b>Game configuration</b><span>Member targeting and messages are set later in Campaign Center.</span></div>
          ${g.status==='draft'||g.status==='ready'?'':g.status==='active'
            ?`<button class="btn sm hidden" id="saveFooterBtn-${ctx}-${g.id}" onclick="event.stopPropagation();askSaveConfig('${g.id}','${ctx}')">Save changes</button>`
            :`<button class="btn sec sm" onclick="event.stopPropagation();askSaveConfig('${g.id}','${ctx}')">Save changes</button>`}
        </div>
      </div>
    </div>
  </div>`;
}
function renderConfig(){
  document.getElementById('configRows').innerHTML=tableGames.map(g=>rowHTML(g,'cfg')).join('');
}
function renderTable(){
  renderConfig();
}
function toggleRow(ctx,id){document.getElementById('row-'+ctx+'-'+id).classList.toggle('open');}

/* ---------- game state mock ---------- */
/* The Arena is the real games/index.html (the standalone project's own menu page),
   not a mocked list — it's what a member sees when eligible for 2+ games, and its
   game cards are real <a> links, so navigating it inside the iframe genuinely opens
   the chosen game. 'play' with no game selected falls back to Arena since there's
   nothing specific to preview yet.

   The real games are designed mobile-first for a real phone viewport (fonts, the
   d-pad, HUD numbers etc. all use CSS clamp() minimums tuned for ~390px width) —
   loading them directly into our much narrower phone-preview box made everything
   look oversized/"zoomed in" and pushed controls (like the d-pad) out of view.
   liveFrameHTML() instead renders each game at a fixed logical viewport
   (LIVE_VW×LIVE_VH, iPhone-14-Pro-ish) inside a wrapper div, and fitLiveFrames()
   (driven by a MutationObserver so it runs after every re-render, wherever the
   preview lives) uniformly scales that wrapper down with a CSS transform to fit
   whatever phone screen currently contains it — the same trick browser dev tools
   use for device previews. */
const LIVE_VW=393,LIVE_VH=852;
function liveFrameHTML(gameId,playUrl,title){
  return `<div class="live-frame-wrap" data-mount="1" style="width:${LIVE_VW}px;height:${LIVE_VH}px">
    <iframe class="live-game-frame" id="livePreviewFrame" data-game-id="${gameId}" src="${playUrl}" title="${escH(title)} live preview" allow="autoplay"></iframe>
  </div>`;
}
function fitLiveFrames(){
  document.querySelectorAll('.live-frame-wrap[data-mount="1"]').forEach(wrap=>{
    const host=wrap.parentElement;
    if(!host||!host.clientWidth)return;
    wrap.style.transform='scale('+(host.clientWidth/LIVE_VW)+')';
    wrap.removeAttribute('data-mount');
  });
}
new MutationObserver(fitLiveFrames).observe(document.body,{childList:true,subtree:true});
function arenaFrameHTML(){
  return liveFrameHTML('arena',ARENA_URL,'Games arena');
}
function gameStateHTML(state,g){
  if(state==='play'){
    if(!g)return arenaFrameHTML();
    return g.playUrl
      ? liveFrameHTML(g.id,g.playUrl,g.name)
      : `<div class="gamewrap"><div class="gtop"><span>SCORE 0/${g.score}</span><span>❤❤❤</span></div>
    <div class="gboard">${Array(8).fill('<div class="gcell">'+g.emoji+'</div>').join('')}</div></div>`;
  }
  if(state==='win')return `<div class="gstate win"><div class="em">🎉</div><h4>You won!</h4>
    <div class="reward-chip">🎁 ${g?g.reward:'Free Kids Pancake'}</div>
    <p>Nice one. You can keep playing to win again.</p>
    <button class="pbtn" onclick="resetLivePreview()">Play again</button></div>`;
  if(state==='winfinal')return `<div class="gstate win"><div class="em">🏅</div><h4>You won!</h4>
    <div class="reward-chip">🎁 ${g?g.reward:'Free Kids Pancake'}</div>
    <p>That's your last play for this game. See you next campaign!</p>
    <button class="pbtn">Use my reward</button></div>`;
  if(state==='lose')return `<div class="gstate lose"><div class="em">😅</div><h4>So close!</h4>
    <p>Try again — unlimited tries until you win.</p>
    <button class="pbtn" onclick="resetLivePreview()">Play again</button><button class="pbtn sec">Back to home</button></div>`;
  if(state==='out')return `<div class="gstate out"><div class="em">🔒</div><h4>Game over for now</h4>
    <p>You've won this one. Come back when a new game unlocks.</p>
    <button class="pbtn">Back to home</button></div>`;
  if(state==='arena')return arenaFrameHTML();
}
/* Real games post GAME_OVER (reason 'win'|'self-collision'|'timeout' etc.) to the
   parent frame once a round ends. The live phone preview listens for that message
   and swaps the iframe out for Como's own branded win/lose screen — which is what
   shows the merchant's actually-configured Gift, since the game itself has no idea
   what Gift was picked in Hub. This mirrors how a real game host would intercept
   GAME_OVER before the member ever sees the game's own generic completion screen.
   The game is identified by the iframe's CURRENT location rather than the id it was
   given at load time, because navigating the real Arena page inside the iframe
   (its game cards are plain <a href> links) changes location without changing the
   iframe element's src attribute or dataset. */
window.addEventListener('message',function(e){
  const data=e.data||{};
  if(data.type!=='GAME_OVER')return;
  const frame=document.getElementById('livePreviewFrame');
  if(!frame||frame.contentWindow!==e.source)return;
  let slug=null;
  try{ const path=frame.contentWindow.location.pathname; const m=path.match(/\/games\/([^/]+)\//); slug=m?m[1]:null; }catch(err){ /* cross-origin, shouldn't happen locally */ }
  const pool=[...tableGames,...GAMES,...EXTRA];
  const g=(slug&&pool.find(x=>x.slug===slug))||pool.find(x=>x.id===frame.dataset.gameId);
  if(!g)return;
  selectedGameId=g.id; // so "Play again" resumes this specific game, not the Arena
  const container=frame.parentElement.parentElement; // .live-frame-wrap -> .pscreen
  const phone=container?container.parentElement:null; // .phone
  const toggles=phone&&phone.parentElement?phone.parentElement.querySelector('.preview-toggles'):null;
  const state=data.reason==='win'?'win':'lose';
  container.innerHTML=gameStateHTML(state,g);
  if(toggles){
    toggles.querySelectorAll('button').forEach(b=>b.classList.remove('on'));
    const match=[...toggles.querySelectorAll('button')].find(b=>b.textContent.trim().toLowerCase()===state);
    if(match)match.classList.add('on');
  }
});
function setActiveToggle(toggleId,label){
  const toggles=document.getElementById(toggleId);
  if(!toggles)return;
  toggles.querySelectorAll('button').forEach(b=>b.classList.remove('on'));
  const match=[...toggles.querySelectorAll('button')].find(b=>b.textContent.trim()===label);
  if(match)match.classList.add('on');
}
function resetLivePreview(){
  const cfgPrev=document.getElementById('cfgPhonePreview');
  if(!cfgPrev)return;
  if(selectedGameId){
    const g=[...tableGames,...GAMES,...EXTRA].find(x=>x.id===selectedGameId)||GAMES[0];
    cfgPrev.innerHTML=gameStateHTML('play',g);
    setActiveToggle('cfgPrevToggles','Game');
  }else{
    showPreviewArena('cfg');
  }
}
function setPrev(ctx,id,state,btn){
  const g=[...tableGames,...GAMES].find(x=>x.id===id);
  document.getElementById('prev-'+ctx+'-'+id).innerHTML=gameStateHTML(state,g);
  btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
}

/* ---------- save → turn on → Campaign distribution ---------- */
let pending=null;
function gameById(id){return tableGames.find(g=>g.id===id)||GAMES.find(g=>g.id===id);}
function gameTag(g){return 'game_eligible_'+g.id;}
function gameDeepLink(g){return 'https://games.como.com/play/'+g.id;}
function askSaveConfig(id,ctx){
  const g=gameById(id);if(!g)return;
  pending={id,ctx,action:'save'};
  if(g.status!=='active'){
    saveConfigValues(g,ctx);
    if(g.status==='draft')g.status='ready';
    renderConfig();
    pending=null;
    return;
  }
  document.getElementById('activateFlow').classList.remove('hidden');
  document.getElementById('activateFlowBox').innerHTML=`
    <h3>Apply changes to this live game?</h3>
    <div class="legal">The updated configuration will affect all existing and future eligible Members.</div>
    <div class="acts"><button class="btn sec" onclick="closeLifecycleModal()">Cancel</button><button class="btn" onclick="confirmSaveConfig()">Apply changes</button></div>`;
}
function saveConfigValues(g,ctx){
  const name=document.getElementById('gameName-'+ctx+'-'+g.id);
  const score=document.getElementById('gameScore-'+ctx+'-'+g.id);
  const wins=document.getElementById('gameWins-'+ctx+'-'+g.id);
  const cap=document.getElementById('gameCap-'+ctx+'-'+g.id);
  const reward=document.getElementById('benefitLabel-'+ctx+'-'+g.id);
  if(name&&name.value.trim())g.name=name.value.trim();
  if(score&&Number(score.value)>0)g.score=Number(score.value);
  if(wins)g.wins=wins.value;
  if(cap)g.totalCap=cap.value;
  if(reward)g.reward=reward.textContent.trim();
  if(g.themeUrl)syncGameTheme(g);
}
function syncGameTheme(g){
  fetch('/api/game-theme',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({themeUrl:g.themeUrl,title:g.name,scoreTarget:g.score})})
    .then(()=>{ refreshLivePreviewFor(g.id); })
    .catch(()=>{ /* local-mode write API is best-effort in the prototype */ });
}
/* Saving re-writes the real theme.json, but the currently-open iframe already has
   the OLD file loaded — reloading it takes a moment, so this shows a short
   "Applying changes…" spinner first rather than silently swapping the game out. */
function refreshLivePreviewFor(gameId){
  const frame=document.getElementById('livePreviewFrame');
  if(!frame||frame.dataset.gameId!==gameId)return;
  const cfgPrev=document.getElementById('cfgPhonePreview');
  if(!cfgPrev)return;
  cfgPrev.innerHTML='<div class="preview-loading"><div class="spinner"></div><div>Applying changes…</div></div>';
  setTimeout(()=>{
    const g=[...tableGames,...GAMES,...EXTRA].find(x=>x.id===gameId);
    if(g)cfgPrev.innerHTML=gameStateHTML('play',g);
  },2000);
}
function confirmSaveConfig(){
  if(!pending)return;
  const g=gameById(pending.id);if(!g)return;
  saveConfigValues(g,pending.ctx);
  renderConfig();
  closeLifecycleModal();
}
function askActivate(id,ctx){
  pending={id,ctx};
  const g=gameById(id);
  if(!g)return;
  saveConfigValues(g,ctx);
  document.getElementById('activateFlow').classList.remove('hidden');
  renderActivateLoading(g);
  setTimeout(()=>renderActivateSuccess(g),1400);
}
function renderActivateLoading(g){
  document.getElementById('activateFlowBox').innerHTML = `
    <div style="text-align:center;padding:10px 6px 4px">
      <div class="spinner" style="margin:0 auto 16px;width:26px;height:26px"></div>
      <h3 style="margin:0 0 6px">Turning on "${g.name}"…</h3>
      <p style="color:var(--soft);font-size:13px;margin:0">Preparing game access and automatic Gift delivery…</p>
    </div>`;
}
function renderActivateSuccess(g){
  g.status='active';
  renderConfig();
  renderCampaignHandoff(g,true);
}
function showCampaignHandoff(id,ctx){
  const g=gameById(id);if(!g)return;
  pending={id,ctx,action:'campaign'};
  document.getElementById('activateFlow').classList.remove('hidden');
  renderCampaignHandoff(g,false);
}
function renderCampaignHandoff(g,justActivated){
  const tag=gameTag(g);const link=gameDeepLink(g);
  const winLimit=g.wins.replace(' time',' win').replace(' times',' wins');
  const accessCopy=g.wins==='Unlimited'
    ? 'Because wins are unlimited, the Member keeps access while the game remains On and they remain eligible.'
    : `When the Member reaches ${winLimit}, they are automatically untagged and lose access to the game.`;
  document.getElementById('activateFlowBox').innerHTML=`
    <div class="launch-state"><span class="launch-dot"></span><b>On</b><span>Waiting for distribution</span></div>
    <h3>${justActivated?'“'+g.name+'” is ready to share':'Share “'+g.name+'” with Members'}</h3>
    <div class="legal">Finish these two steps in Campaign Center to choose who gets the game and how they receive it.</div>
    <div class="campaign-kit">
      <div class="campaign-kit-title">Set up your Campaign</div>
      <div class="campaign-step">
        <div class="step-number">1</div>
        <div class="step-content">
          <b>Choose the Members who should get the game</b>
          <p>Define your audience in Campaign Center. For example: Members who spent over $100 in the last 3 months. Add this tag to make the game visible only to those Members:</p>
          <div class="setup-value"><code>${tag}</code><button onclick="copyCampaignValue('${tag}','Eligibility tag')">Copy tag</button></div>
        </div>
      </div>
      <div class="campaign-step">
        <div class="step-number">2</div>
        <div class="step-content">
          <b>Send those Members the game link</b>
          <p>Add an email, SMS, or push activity after the tag step, and include this link in the message:</p>
          <div class="setup-value"><code>${link}</code><button onclick="copyCampaignValue('${link}','Game link')">Copy link</button></div>
        </div>
      </div>
    </div>
    <div class="automatic-logic"><span class="automatic-icon">✓</span><div><b>Como handles the rest</b><span>After each accepted win, the Member automatically receives ${g.reward}. ${accessCopy}</span></div></div>
    <div class="acts"><button class="btn sec" onclick="closeLifecycleModal()">Done</button><button class="btn" onclick="openCampaignCenter()">Open Campaign Center</button></div>`;
}
function askPauseGame(id,ctx){
  const g=gameById(id);if(!g)return;
  pending={id,ctx,action:'pause'};
  document.getElementById('activateFlow').classList.remove('hidden');
  document.getElementById('activateFlowBox').innerHTML=`
    <h3>Pause “${g.name}”?</h3>
    <div class="impact-list">
      <div><b>Access stops immediately</b><span>The Games backend blocks every load, even when a Member still has the eligibility tag.</span></div>
      <div><b>Progress and tags are kept</b><span>Recorded wins are not reset and no bulk untagging runs.</span></div>
      <div><b>Campaigns are not paused</b><span>Stop the marketing Campaign separately if you do not want it to keep sending the game link.</span></div>
    </div>
    <div class="acts"><button class="btn sec" onclick="closeLifecycleModal()">Cancel</button><button class="btn danger" onclick="confirmPauseGame()">Pause game</button></div>`;
}
function confirmPauseGame(){
  if(!pending)return;const g=gameById(pending.id);if(g)g.status='disabled';renderConfig();closeLifecycleModal();
}
function copyCampaignValue(value,label){
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(value);
  alert(label+' copied (prototype)');
}
function openCampaignCenter(){alert('Opens Campaign Center in a new tab with the setup checklist kept available here (prototype)');}
function closeLifecycleModal(){hide('activateFlow');pending=null;}
function finishActivateFlow(){closeLifecycleModal();}
function deactivateGame(id,ctx){askPauseGame(id,ctx);}
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
  tableGames=[...GAMES.map(g=>({...g,status:'draft'}))];
  document.getElementById('configRows').innerHTML='';
  document.getElementById('cfgTitle').textContent='Generating your games…';
  document.getElementById('cfgSub').textContent='Games appear below as the Game Designer delegates to coders.';
  document.getElementById('agentPanel').classList.remove('collapsed');
  document.getElementById('agentPanel').classList.remove('hidden');
  document.getElementById('genMoreBtn').classList.add('hidden');
  document.getElementById('cfgSpinner').style.display='';
  document.getElementById('designerThoughts').innerHTML='';
  showPreviewLoading('cfg');
  runGenerating();
}

/* ---------- generating flow (streams into config screen) ---------- */
const DESIGNER_THOUGHTS=[
  'Analyzing brand personality… Vapiano Australia is bold, Italian, and menu-driven.',
  'Menu items detected: pizza, pasta, burrata, tiramisu, olives, focaccia.',
  'Best mechanics for an Italian menu: wrapping snake, memory matching, platform climbing.',
  'Selecting 3 templates from the bank…',
  '→ Delegating "Vapiano Loop" (wrapping snake) to Coder 1…',
  '→ Delegating "Pasta Pairing" (memory match) to Coder 2…',
  '→ Delegating "Menu Tower" (platform jumper) to Coder 3…',
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
  },1900);
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
    document.getElementById('genMoreBtn').classList.remove('hidden');
    renderConfig();
    showPreviewArena('cfg');
    // gently collapse the agent stream now that it's done
    setTimeout(()=>{document.getElementById('agentPanel').classList.add('collapsed');},1200);
  },800);
}
function toggleAgentPanel(){
  document.getElementById('agentPanel').classList.toggle('collapsed');
}

/* ---------- persistent phone preview ---------- */
/* selectedGameId is null until the merchant picks a specific game row (or a real
   GAME_OVER message identifies one) — until then the preview shows the real Arena. */
let selectedGameId=null;
function selectGame(ctx,id){
  selectedGameId=id;
  const target=ctx==='cfg'?'cfgPhonePreview':'tblPhonePreview';
  const g=[...tableGames,...GAMES,...EXTRA].find(x=>x.id===id);
  if(g && document.getElementById(target)) document.getElementById(target).innerHTML=gameStateHTML('play',g);
  if(ctx==='cfg')setActiveToggle('cfgPrevToggles','Game');
}
function setCfgPrev(state,btn){
  const g=selectedGameId?[...tableGames,...GAMES,...EXTRA].find(x=>x.id===selectedGameId):null;
  document.getElementById('cfgPhonePreview').innerHTML=gameStateHTML(state,g);
  btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
}
function setTblPrev(state,btn){
  const g=[...tableGames,...EXTRA].find(x=>x.id===selectedGameId)||tableGames[0];
  document.getElementById('tblPhonePreview').innerHTML=gameStateHTML(state,g);
  btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
}
/* Shown only while the Game Designer / coders are generating — there's nothing
   playable yet, so the preview should not imply otherwise. */
function showPreviewLoading(ctx){
  const target=ctx==='cfg'?'cfgPhonePreview':'tblPhonePreview';
  const el=document.getElementById(target);
  if(!el)return;
  selectedGameId=null;
  el.innerHTML='<div class="preview-loading"><div class="spinner"></div><div>Generating your games…</div></div>';
}
/* Default preview once games are ready: the real Arena (games/index.html), matching
   what a member sees when eligible for 2+ games. Selecting a specific row switches
   away from this to that game's own live preview (see selectGame). */
function showPreviewArena(ctx){
  const target=ctx==='cfg'?'cfgPhonePreview':'tblPhonePreview';
  const el=document.getElementById(target);
  if(!el)return;
  selectedGameId=null;
  el.innerHTML=gameStateHTML('arena');
  if(ctx==='cfg')setActiveToggle('cfgPrevToggles','Arena');
}

/* ---------- fake door ---------- */
function openFakeDoor(){document.getElementById('fakedoor').classList.remove('hidden');}

/* ---------- try game (restart the live iframe / return from a win-lose preview) ---------- */
function tryGame(){
  resetLivePreview();
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
showScreen('empty');
setTimeout(()=>document.getElementById('flag').style.display='none',9000);
