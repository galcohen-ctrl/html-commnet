(function(){
  var REPO='galcohen-ctrl/html-commnet';
  var PAGE='prototype';
  var PROJECT='ai-generated-games';
  var DATA_BRANCH='data';
  var ASSET_DIR='comment-assets/ai-generated-games';
  var comments=[];
  var mode=false;
  var activePanel=null;
  var activeBubble=null;
  var lastHovered=null;
  var updateQueued=false;
  var addBtn=document.getElementById('hc-add-btn');
  var refreshBtn=document.getElementById('hc-refresh-btn');
  var modal=document.getElementById('hc-modal');
  var pinLayer=document.createElement('div');
  pinLayer.id='hc-pin-layer';
  document.body.appendChild(pinLayer);

  function gTok(){return localStorage.getItem('hc_tok')||'';}
  function sTok(t){localStorage.setItem('hc_tok',t.trim());}
  function gName(){return localStorage.getItem('hc_name')||'Reviewer';}
  function escH(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML;}
  function cssEsc(v){return window.CSS&&CSS.escape?CSS.escape(String(v)):String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&');}
  function attrEsc(v){return String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"');}
  function ignore(el){return !!(el&&el.closest&&el.closest('#hc-fab,#hc-modal,#hc-highlight,#hc-highlight-label,#hc-pin-layer,.hc-ann-panel,.hc-cbubble,.hc-img-modal,#hc-toast'));}
  function visible(el){if(!el||!el.isConnected)return false;var r=el.getBoundingClientRect();var st=getComputedStyle(el);return r.width>0&&r.height>0&&st.display!=='none'&&st.visibility!=='hidden';}

  if(addBtn)addBtn.textContent='Add comment';

  document.getElementById('hc-cancel').onclick=function(){modal.classList.remove('open');};
  document.getElementById('hc-save').onclick=function(){
    var t=document.getElementById('hc-tok').value.trim();
    var n=document.getElementById('hc-nam').value.trim();
    if(!t){showToast('Please paste your GitHub token first.');return;}
    sTok(t);if(n)localStorage.setItem('hc_name',n);
    modal.classList.remove('open');enterMode();
  };

  function enterMode(){mode=true;addBtn.textContent='Click to comment';addBtn.classList.add('hc-on');document.body.classList.add('hc-mode');closePanels();}
  function exitMode(){mode=false;addBtn.textContent='Add comment';addBtn.classList.remove('hc-on');document.body.classList.remove('hc-mode');hideHighlight();}

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      if(document.querySelector('.hc-img-modal')){closeImagePreview();return;}
      if(activePanel||activeBubble){closePanels();return;}
      if(mode){exitMode();closePanels();}
    }
  });

  var hl=document.getElementById('hc-highlight');
  var hlLabel=document.getElementById('hc-highlight-label');
  function labelFor(el){
    var selector=selectorFor(el);
    var ctx=((el.textContent||el.value||el.getAttribute('title')||'').trim().replace(/\s+/g,' ')).slice(0,90);
    return {selector:selector,context:ctx};
  }
  function showHighlight(el){
    if(!el||!visible(el)||el===document.body||el===document.documentElement)return hideHighlight();
    if(el===lastHovered)return;
    lastHovered=el;
    var r=el.getBoundingClientRect();
    hl.style.left=r.left+'px';
    hl.style.top=r.top+'px';
    hl.style.width=r.width+'px';
    hl.style.height=r.height+'px';
    hl.style.display='block';
    var info=labelFor(el);
    hlLabel.textContent=info.selector||el.tagName.toLowerCase();
    hlLabel.style.left=Math.max(8,r.left)+'px';
    hlLabel.style.top=(r.top<20?r.bottom+5:r.top-18)+'px';
    hlLabel.style.display='block';
  }
  function hideHighlight(){hl.style.display='none';hlLabel.style.display='none';lastHovered=null;}

  document.addEventListener('mousemove',function(e){
    if(!mode)return;
    if(ignore(e.target)){hideHighlight();return;}
    var el=chooseAnchor(document.elementFromPoint(e.clientX,e.clientY));
    if(el)showHighlight(el);
  });

  addBtn.addEventListener('click',function(e){
    e.stopPropagation();
    if(mode){exitMode();closePanels();return;}
    if(!gTok()){modal.classList.add('open');return;}
    enterMode();
  });

  function currentScreen(){
    var s=document.querySelector('.screen:not(.hidden)');
    return s?s.id.replace('s-',''):'unknown';
  }

  function screenFor(el){
    var s=el&&el.closest&&el.closest('.screen');
    return s&&s.id?s.id.replace('s-',''):currentScreen();
  }

  function chooseAnchor(el){
    if(!el||ignore(el))return null;
    var meaningful=[
      '.modal','.phone','.pscreen','.grow-row','.grow-main','.audience-summary','.masonry .tile','.note','.empty','.tablehead',
      '.preview-toggles','button','input','select','textarea','label','h1','h2','h3','h4','p','li'
    ].join(',');
    return el.closest(meaningful)||el;
  }

  function hasUnique(sel){try{return document.querySelectorAll(sel).length===1;}catch(_){return false;}}
  function selectorFor(el){
    if(!el||el.nodeType!==1)return '';
    if(el.id&&hasUnique('#'+cssEsc(el.id)))return '#'+cssEsc(el.id);
    var screen=el.closest('.screen[id]');
    var attrs=['data-s','data-state','data-game','data-modal','data-slot-name','id'];
    var candidates=[];
    attrs.forEach(function(a){
      if(el.hasAttribute&&el.hasAttribute(a)){
        var base=el.tagName.toLowerCase()+'['+a+'="'+attrEsc(el.getAttribute(a))+'"]';
        candidates.push(base);
        if(screen)candidates.push('#'+cssEsc(screen.id)+' '+base);
      }
    });
    if(el.className&&typeof el.className==='string'){
      var cls=el.className.trim().split(/\s+/).filter(Boolean).slice(0,3).map(cssEsc).join('.');
      if(cls){
        candidates.push(el.tagName.toLowerCase()+'.'+cls);
        if(screen)candidates.push('#'+cssEsc(screen.id)+' '+el.tagName.toLowerCase()+'.'+cls);
      }
    }
    for(var i=0;i<candidates.length;i++){if(hasUnique(candidates[i]))return candidates[i];}
    var parts=[],cur=el;
    while(cur&&cur.nodeType===1&&cur!==document.body){
      var part=cur.tagName.toLowerCase();
      if(cur.id){part='#'+cssEsc(cur.id);parts.unshift(part);break;}
      if(cur.className&&typeof cur.className==='string'){
        var c=cur.className.trim().split(/\s+/).filter(Boolean).slice(0,2).map(cssEsc).join('.');
        if(c)part+='.'+c;
      }
      var same=Array.from(cur.parentElement?cur.parentElement.children:[]).filter(function(x){return x.tagName===cur.tagName;});
      if(same.length>1)part+=':nth-of-type('+(same.indexOf(cur)+1)+')';
      parts.unshift(part);
      var sel=parts.join(' > ');
      if(hasUnique(sel))return sel;
      cur=cur.parentElement;
    }
    return parts.join(' > ');
  }

  document.addEventListener('click',function(e){
    if(!mode)return;
    if(ignore(e.target))return;
    e.preventDefault();e.stopImmediatePropagation();
    var anchor=chooseAnchor(document.elementFromPoint(e.clientX,e.clientY));
    exitMode();hideHighlight();
    if(anchor)showAnnotationPanel(e.clientX,e.clientY,anchor);
  },true);

  function showAnnotationPanel(cx,cy,anchor){
    closePanels();
    var info=labelFor(anchor);
    var rect=anchor.getBoundingClientRect();
    var screen=screenFor(anchor);
    var target={
      selector:info.selector,
      context:info.context,
      relativeX:Math.max(0,Math.min(1,(cx-rect.left)/Math.max(1,rect.width))),
      relativeY:Math.max(0,Math.min(1,(cy-rect.top)/Math.max(1,rect.height))),
      fallbackClientX:cx,
      fallbackClientY:cy
    };
    var panel=document.createElement('div');
    panel.className='hc-ann-panel';
    panel.innerHTML=[
      '<div class="hc-ann-sec">',
      info.selector?'<div class="hc-ctx-card">'+escH(info.selector)+'</div>':'',
      info.context?'<div class="hc-ctx-sub">&ldquo;'+escH(info.context.slice(0,70))+'&rdquo;</div>':'',
      '</div>',
      '<div class="hc-ann-sec"><textarea class="hc-ann-ta" placeholder="Describe the issue or suggestion..."></textarea>',
      '<div class="hc-paste-hint">Paste screenshots here before submitting.</div><div class="hc-previews"></div></div>',
      '<div class="hc-ann-foot">',
      '<button class="hc-ann-btn hc-ann-cancel">Cancel</button>',
      '<button class="hc-ann-btn hc-ann-save">Submit</button>',
      '</div>'
    ].join('');
    document.body.appendChild(panel);
    posPanel(panel,cx,cy);
    activePanel=panel;
    var ta=panel.querySelector('.hc-ann-ta');
    var previews=panel.querySelector('.hc-previews');
    var pendingImages=[];
    ta.focus();
    panel.addEventListener('paste',function(e){addClipboardImages(e,pendingImages,previews);});
    panel.querySelector('.hc-ann-cancel').addEventListener('click',closePanels);
    panel.querySelector('.hc-ann-save').addEventListener('click',function(){
      var txt=ta.value.trim();
      if(!txt&&!pendingImages.length){ta.classList.add('err');return;}
      var btn=panel.querySelector('.hc-ann-save');
      btn.disabled=true;btn.textContent='Saving...';
      var meta={
        version:3,
        project:PROJECT,
        page:PAGE,
        screen:screen,
        name:gName(),
        comment:txt,
        target:target,
        images:[],
        viewport:{width:window.innerWidth,height:window.innerHeight},
        docSize:{width:document.body.scrollWidth,height:document.body.scrollHeight},
        createdAt:new Date().toISOString()
      };
      createIssue(meta)
      .then(function(issue){
        meta.issue={number:issue.number,url:issue.html_url,title:issue.title};
        if(!pendingImages.length)return issue;
        return Promise.all(pendingImages.map(function(item,i){return uploadImage('issue-'+issue.number,item.file,i+1);})).then(function(images){
          meta.images=images;
          return updateIssue(issue.number,meta);
        });
      })
      .then(function(issue){
        return normalizeComment({number:issue.number,title:issue.title,body:issue.body,html_url:issue.html_url,user:issue.user,created_at:issue.created_at});
      })
      .then(function(saved){
        pendingImages.forEach(function(item){URL.revokeObjectURL(item.url);});
        closePanels();
        comments.push(saved);
        renderPins();
        showToast('Comment saved');
      })
      .catch(function(err){
        btn.disabled=false;btn.textContent='Submit';
        showToast(err.message||'Could not save comment');
      });
    });
    ta.addEventListener('keydown',function(e){
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter')panel.querySelector('.hc-ann-save').click();
    });
  }

  function posPanel(panel,cx,cy){
    var vw=window.innerWidth,vh=window.innerHeight,g=12,pw=336;
    var left=cx+16;if(left+pw>vw-g)left=cx-pw-16;if(left<g)left=g;
    var top=cy;if(top+300>vh-g)top=vh-300-g;if(top<g)top=g;
    panel.style.left=left+'px';panel.style.top=top+'px';
  }

  function closePanels(){
    if(activePanel){activePanel.remove();activePanel=null;}
    if(activeBubble){activeBubble.remove();activeBubble=null;}
    closeImagePreview();
  }

  function addClipboardImages(e,items,previews){
    var files=[];
    Array.from(e.clipboardData?e.clipboardData.items:[]).forEach(function(item){
      if(item.type&&item.type.indexOf('image/')===0){
        var file=item.getAsFile();
        if(file)files.push(file);
      }
    });
    if(!files.length)return;
    e.preventDefault();
    files.forEach(function(file){items.push({file:file,url:URL.createObjectURL(file)});});
    renderPreviews(previews,items);
  }

  function renderPreviews(container,items){
    container.innerHTML='';
    items.forEach(function(item,idx){
      var thumb=document.createElement('div');
      thumb.className='hc-thumb';
      thumb.innerHTML='<img alt=""><button type="button" title="Remove image">x</button>';
      thumb.querySelector('img').src=item.url;
      thumb.querySelector('button').addEventListener('click',function(){
        URL.revokeObjectURL(item.url);
        items.splice(idx,1);
        renderPreviews(container,items);
      });
      container.appendChild(thumb);
    });
  }

  function fileToBase64(file){
    return new Promise(function(resolve,reject){
      var reader=new FileReader();
      reader.onload=function(){
        var s=String(reader.result||'');
        resolve(s.split(',')[1]||'');
      };
      reader.onerror=reject;
      reader.readAsDataURL(file);
    });
  }

  function extFor(type){
    if(type==='image/jpeg')return 'jpg';
    if(type==='image/webp')return 'webp';
    if(type==='image/gif')return 'gif';
    return 'png';
  }

  function ghHeaders(){
    var h={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    if(gTok())h.Authorization='Bearer '+gTok();
    return h;
  }

  function uploadImage(commentId,file,index){
    if(!gTok())return Promise.reject(new Error('GitHub token required to upload screenshots'));
    var type=file.type||'image/png';
    var ext=extFor(type);
    var path=ASSET_DIR+'/'+commentId+'-'+index+'.'+ext;
    return fileToBase64(file).then(function(content){
      return fetch('https://api.github.com/repos/'+REPO+'/contents/'+path,{
        method:'PUT',
        headers:Object.assign(ghHeaders(),{'Content-Type':'application/json'}),
        body:JSON.stringify({
          message:'docs: add AI Games comment screenshot '+commentId+'-'+index,
          content:content,
          branch:DATA_BRANCH
        })
      });
    }).then(function(r){
      if(!r.ok)return r.json().catch(function(){return {};}).then(function(j){throw new Error('Screenshot upload failed ('+r.status+'): '+(j.message||'GitHub API error'));});
      return r.json();
    }).then(function(){
      var url='https://raw.githubusercontent.com/'+REPO+'/'+DATA_BRANCH+'/'+path;
      return {path:path,url:url,name:file.name||('screenshot-'+index+'.'+ext),type:type};
    });
  }

  function issueBody(meta){
    var json=JSON.stringify(meta,null,2);
    var body='<!-- hc:comment\n'+json+'\n-->\n';
    body+='**Page**: '+PAGE+'\n';
    body+='**Screen**: '+meta.screen+'\n';
    body+='**Name**: '+meta.name+'\n';
    body+='**Comment**: '+meta.comment+'\n';
    body+='**Element**: '+(meta.target.selector||'')+'\n';
    body+='**Context**: '+(meta.target.context||'')+'\n';
    body+='**Anchor**: selector='+((meta.target.selector||'').replace(/\n/g,' '))+', rx='+meta.target.relativeX+', ry='+meta.target.relativeY+'\n';
    body+='**Fallback**: x='+Math.round(meta.target.fallbackClientX)+', y='+Math.round(meta.target.fallbackClientY)+'\n';
    body+='**Viewport**: '+meta.viewport.width+'x'+meta.viewport.height+'\n';
    body+='**DocSize**: '+meta.docSize.width+'x'+meta.docSize.height+'\n';
    if(meta.images&&meta.images.length){
      body+='\n**Screenshots**:\n';
      meta.images.forEach(function(img,i){body+='- [Screenshot '+(i+1)+']('+img.url+')\n';});
      body+='\n';
      meta.images.forEach(function(img,i){body+='![Screenshot '+(i+1)+']('+img.url+')\n';});
    }
    return body;
  }

  function handleIssueResponse(r,label){
    if(r.status===401||r.status===403){localStorage.removeItem('hc_tok');throw new Error('Token rejected. Re-enter a token with Issues write and Contents write.');}
    if(!r.ok)return r.json().catch(function(){return {};}).then(function(j){throw new Error(label+' failed ('+r.status+'): '+(j.message||'GitHub API error'));});
    return r.json();
  }

  function createIssue(meta){
    if(!gTok())return Promise.reject(new Error('GitHub token required to create comments'));
    var title='['+PAGE.toUpperCase()+'] '+(meta.comment||'Screenshot comment').slice(0,72);
    return fetch('https://api.github.com/repos/'+REPO+'/issues',{
      method:'POST',
      headers:Object.assign(ghHeaders(),{'Content-Type':'application/json'}),
      body:JSON.stringify({title:title,body:issueBody(meta),labels:['web-comment','ai-games']})
    }).then(function(r){return handleIssueResponse(r,'Issue save');});
  }

  function updateIssue(number,meta){
    return fetch('https://api.github.com/repos/'+REPO+'/issues/'+number,{
      method:'PATCH',
      headers:Object.assign(ghHeaders(),{'Content-Type':'application/json'}),
      body:JSON.stringify({body:issueBody(meta)})
    }).then(function(r){return handleIssueResponse(r,'Issue update');});
  }

  function fetchIssuesPage(page,acc){
    acc=acc||[];
    return fetch('https://api.github.com/repos/'+REPO+'/issues?state=open&per_page=100&page='+page,{headers:ghHeaders()})
    .then(function(r){
      if(!r.ok){showToast('Could not load comments (HTTP '+r.status+').');return Promise.reject(r.status);}
      return r.json();
    }).then(function(batch){
      acc=acc.concat(batch||[]);
      if(batch&&batch.length===100)return fetchIssuesPage(page+1,acc);
      return acc;
    });
  }

  function loadComments(){
    fetchIssuesPage(1,[])
    .then(function(issues){
      comments=(issues||[]).filter(function(i){return i.title&&i.title.indexOf('['+PAGE.toUpperCase()+']')===0;})
        .map(normalizeComment).filter(Boolean).reverse();
      renderPins();
      showToast(comments.length?'Loaded '+comments.length+' comment'+(comments.length===1?'':'s'):'No comments yet');
    }).catch(function(err){console.warn('Could not load comments:',err);});
  }

  function normalizeComment(issue){
    var body=issue.body||'';
    var json=body.match(/<!--\s*hc:comment\s*([\s\S]*?)\s*-->/);
    if(json){
      try{
        var meta=JSON.parse(json[1]);
        if(meta.project&&meta.project!==PROJECT)return null;
        return {
          id:String(issue.number),
          issueNumber:issue.number,
          issueUrl:issue.html_url,
          title:issue.title,
          name:meta.name||issue.user&&issue.user.login||'Reviewer',
          text:meta.comment||'',
          screen:meta.screen||'unknown',
          target:meta.target||{},
          images:meta.images||[],
          createdAt:issue.created_at
        };
      }catch(e){console.warn('Bad comment JSON in issue #'+issue.number,e);}
    }
    var xM=body.match(/\*\*Coordinates\*\*: x=(\d+)/),yM=body.match(/y=(\d+)/);
    var nm=body.match(/\*\*Name\*\*: (.+)/),tm=body.match(/\*\*Comment\*\*: (.+)/);
    var sm=body.match(/\*\*Element\*\*: (.*)/),cm=body.match(/\*\*Context\*\*: (.*)/);
    var scr=body.match(/\*\*Screen\*\*: (.*)/);
    if(!xM||!yM)return null;
    return {
      id:String(issue.number),
      issueNumber:issue.number,
      issueUrl:issue.html_url,
      title:issue.title,
      name:nm?nm[1]:'?',
      text:tm?tm[1]:'',
      screen:scr?scr[1].trim():'unknown',
      target:{
        selector:'',
        context:cm?cm[1]:'',
        fallbackClientX:parseInt(xM[1],10),
        fallbackClientY:parseInt(yM[1],10),
        legacyElement:sm?sm[1]:''
      },
      images:[],
      createdAt:issue.created_at,
      legacy:true
    };
  }

  function findTarget(c){
    var sel=c&&c.target&&c.target.selector;
    if(!sel)return null;
    try{return document.querySelector(sel);}catch(_){return null;}
  }

  function routeMatches(c){return c.screen===currentScreen()||c.screen==='unknown';}

  function pinPosition(c){
    var el=findTarget(c);
    if(el&&visible(el)){
      var r=el.getBoundingClientRect();
      var rx=Number(c.target.relativeX),ry=Number(c.target.relativeY);
      if(!Number.isFinite(rx))rx=.5;
      if(!Number.isFinite(ry))ry=.5;
      return {x:r.left+Math.max(0,Math.min(1,rx))*r.width,y:r.top+Math.max(0,Math.min(1,ry))*r.height,visible:routeMatches(c)};
    }
    var fx=c.target&&Number(c.target.fallbackClientX),fy=c.target&&Number(c.target.fallbackClientY);
    var hasFallback=Number.isFinite(fx)&&Number.isFinite(fy);
    return {x:hasFallback?fx:-100,y:hasFallback?fy:-100,visible:routeMatches(c)&&hasFallback};
  }

  function renderPins(){
    pinLayer.innerHTML='';
    comments.forEach(function(c,idx){
      var pos=pinPosition(c);
      var wrap=document.createElement('div');
      wrap.className='hc-pin';
      wrap.dataset.commentId=c.id;
      wrap.style.left=pos.x+'px';
      wrap.style.top=pos.y+'px';
      wrap.style.display=pos.visible?'':'none';
      var btn=document.createElement('button');
      btn.className='hc-pin-btn';
      btn.title=(c.name||'Reviewer')+': '+(c.text||'');
      btn.textContent=String(idx+1);
      btn.onclick=function(e){e.preventDefault();e.stopPropagation();openBubble(c,btn);};
      wrap.onclick=function(e){e.preventDefault();e.stopPropagation();openBubble(c,btn);};
      wrap.appendChild(btn);
      pinLayer.appendChild(wrap);
    });
  }

  pinLayer.addEventListener('click',function(e){
    var pin=e.target.closest('.hc-pin');
    if(!pin)return;
    var btn=pin.querySelector('.hc-pin-btn')||pin;
    var c=comments.find(function(x){return x.id===pin.dataset.commentId;});
    if(!c)return;
    e.preventDefault();
    e.stopPropagation();
    openBubble(c,btn);
  });

  function updatePins(){
    updateQueued=false;
    document.querySelectorAll('.hc-pin').forEach(function(pin){
      var c=comments.find(function(x){return x.id===pin.dataset.commentId;});
      if(!c)return;
      var pos=pinPosition(c);
      pin.style.left=pos.x+'px';
      pin.style.top=pos.y+'px';
      pin.style.display=pos.visible?'':'none';
    });
    if(activeBubble){activeBubble.remove();activeBubble=null;}
  }

  function scheduleUpdate(){if(updateQueued)return;updateQueued=true;requestAnimationFrame(updatePins);}

  function openBubble(c,btn){
    if(activeBubble&&activeBubble.dataset.commentId===c.id){activeBubble.remove();activeBubble=null;return;}
    if(activeBubble){activeBubble.remove();activeBubble=null;}
    var bub=document.createElement('div');
    bub.className='hc-cbubble';
    bub.dataset.commentId=c.id;
    var imgs=(c.images||[]).map(function(img,i){
      var name=img.name||('Screenshot '+(i+1));
      return '<button type="button" class="hc-img-thumb" data-img-url="'+escH(img.url)+'" data-img-name="'+escH(name)+'"><img src="'+escH(img.url)+'" alt="Screenshot '+(i+1)+'"></button>';
    }).join('');
    bub.innerHTML='<div class="hc-cb-name">'+escH(c.name||'Reviewer')+'</div>'
      +(c.target&&c.target.selector?'<div class="hc-cb-ctx">'+escH(c.target.selector)+'</div>':(c.target&&c.target.legacyElement?'<div class="hc-cb-ctx">'+escH(c.target.legacyElement)+'</div>':''))
      +'<div class="hc-cb-text">'+escH(c.text||'')+'</div>'
      +(imgs?'<div class="hc-cb-images">'+imgs+'</div>':'')
      +(c.issueUrl?'<div style="margin-top:10px;font-size:11px"><a style="color:#8fb0ff" target="_blank" rel="noreferrer" href="'+escH(c.issueUrl)+'">Open GitHub issue</a></div>':'');
    document.body.appendChild(bub);
    bub.querySelectorAll('.hc-img-thumb').forEach(function(thumb){
      thumb.addEventListener('click',function(e){
        e.stopPropagation();
        openImagePreview(thumb.dataset.imgUrl,thumb.dataset.imgName||'Screenshot');
      });
    });
    activeBubble=bub;
    var r=btn.getBoundingClientRect();
    var bw=bub.getBoundingClientRect().width||300,bh=bub.getBoundingClientRect().height||100;
    var vw=window.innerWidth,vh=window.innerHeight;
    var bl=r.right+8;if(bl+bw>vw-12)bl=r.left-bw-8;if(bl<12)bl=12;
    var bt=r.top;if(bt+bh>vh-12)bt=vh-bh-12;if(bt<12)bt=12;
    bub.style.left=bl+'px';bub.style.top=bt+'px';
  }

  function closeImagePreview(){
    var existing=document.querySelector('.hc-img-modal');
    if(existing)existing.remove();
  }

  function openImagePreview(url,name){
    closeImagePreview();
    var modal=document.createElement('div');
    modal.className='hc-img-modal';
    modal.innerHTML='<div class="hc-img-box"><div class="hc-img-top"><span>'+escH(name||'Screenshot')+'</span><div><a href="'+escH(url)+'" target="_blank" rel="noreferrer">Open original</a> <button class="hc-img-close" type="button" title="Close">x</button></div></div><img src="'+escH(url)+'" alt="'+escH(name||'Screenshot')+'"></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal)closeImagePreview();});
    modal.querySelector('.hc-img-close').addEventListener('click',closeImagePreview);
  }

  function showToast(msg){
    var t=document.getElementById('hc-toast');
    if(t)t.remove();
    t=document.createElement('div');t.id='hc-toast';t.textContent=msg;
    document.body.appendChild(t);
    setTimeout(function(){if(t.parentNode)t.remove();},3200);
  }

  refreshBtn.addEventListener('click',loadComments);
  document.addEventListener('scroll',scheduleUpdate,true);
  window.addEventListener('resize',scheduleUpdate);
  new MutationObserver(scheduleUpdate).observe(document.body,{attributes:true,childList:true,subtree:true,attributeFilter:['class','style']});
  document.addEventListener('click',function(e){
    if(e.target.closest('.hc-pin')||e.target.closest('.hc-ann-panel')||e.target.closest('.hc-cbubble')||e.target.closest('.hc-img-modal'))return;
    closePanels();
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadComments);else loadComments();
})();
