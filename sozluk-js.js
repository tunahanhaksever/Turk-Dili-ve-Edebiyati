// Basit, bağımsız bir edebiyat sözlüğü — localStorage tabanlı ==== 
(function(){
  const LS_KEY = 'edebiyat_entries_v1';
  const THEME_KEY = 'edebiyat_theme_v1';
  const FAV_KEY = 'edebiyat_favs_v1';

  // state
  let entries = (typeof SAMPLE !== 'undefined') ? SAMPLE.slice() : [];
  let stored = load(LS_KEY, []);
  entries = [...entries, ...stored];

  let favs = load(FAV_KEY, []);
  let onlyFav = false;

  // DOM
  const grid = document.getElementById('grid');
  const count = document.getElementById('count');
  const total = document.getElementById('total');
  const favCount = document.getElementById('favCount');
  const favList = document.getElementById('favList');
  const tagCount = document.getElementById('tagCount');
  const search = document.getElementById('search');
  const lettersEl = document.getElementById('letters');
  const tagsEl = document.getElementById('tags');
  const themeToggle = document.getElementById('themeToggle');
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const favFilter = document.getElementById('favFilter');
  const resetBtn = document.getElementById('resetBtn');
  const clearBtn = document.getElementById('clearBtn');

  // theme
  const root = document.documentElement;
  (function initTheme(){
    const t = localStorage.getItem(THEME_KEY) || (window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
    setTheme(t);
  })();

  function setTheme(t){
    if(t==='dark') root.setAttribute('data-theme','dark'); else root.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY,t);
  }
  themeToggle.addEventListener('click', ()=>{
    const cur = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setTheme(cur==='dark' ? 'light' : 'dark');
  });

  // letters (basit latin alfabet - istersen türkçe alfabet ile değiştirilebilir)
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  let activeLetter = '';
  function renderLetters(){
    lettersEl.innerHTML = '';
    letters.forEach(l=>{
      const b = document.createElement('button'); b.textContent = l.toUpperCase();
      if(activeLetter===l) b.classList.add('active');
      b.addEventListener('click', ()=>{ activeLetter = activeLetter===l ? '' : l; render(); });
      lettersEl.appendChild(b);
    });
    const all = document.createElement('button'); all.textContent='Hepsi'; all.addEventListener('click', ()=>{ activeLetter=''; render(); });
    // NOT: başlangıçta "Hepsi" aktif yapılmıyor, böylece başlangıçta tüm liste görünmez
    lettersEl.appendChild(all);
  }

  // tags
  let activeTags = [];
  function getAllTags(){
    const s = new Set(); entries.forEach(e=>e.tags && e.tags.forEach(t=>s.add(t)));
    return Array.from(s).sort((a,b)=>a.localeCompare(b,'tr'));
  }
  function renderTags(){
    tagsEl.innerHTML='';
    getAllTags().forEach(t=>{
      const b = document.createElement('button'); b.className='tag'; b.textContent=t;
      b.addEventListener('click', ()=>{ if(activeTags.includes(t)) activeTags = activeTags.filter(x=>x!==t); else activeTags.unshift(t); render(); });
      if(activeTags.includes(t)) b.classList.add('selected');
      tagsEl.appendChild(b);
    });
  }

  // render
  function render(){
    renderLetters(); renderTags();
    const q = (search && search.value ? search.value.trim().toLowerCase() : '');
    const hasQuery = q.length > 0;
    const hasAnyFilter = Boolean(activeLetter) || activeTags.length > 0 || onlyFav;

    // Eğer ne arama var ne de herhangi bir filtre aktifse, başlangıçta sonuç gösterme
    if(!hasQuery && !hasAnyFilter){
      grid.innerHTML = `<div class="muted" style="padding:18px">Arama yaparak terimleri görüntüleyin. (Klavye kısayolu: /)</div>`;
      count.textContent = `(0)`;
      total.textContent = entries.length;
      favCount.textContent = favs.length;
      tagCount.textContent = getAllTags().length;
      renderFavList();
      return;
    }

    // Aksi durumda filtreleri uygula (arama varsa aramaya göre, yoksa sadece filtrelerle göster)
    let out = entries.slice().filter(e=>{
      if(onlyFav && !favs.includes(e.id)) return false;
      if(activeLetter && (e.term || '').charAt(0).toLowerCase() !== activeLetter) return false;
      if(activeTags.length && !activeTags.every(t=> (e.tags||[]).includes(t))) return false;
      if(hasQuery){
        return ((e.term||'').toLowerCase().includes(q) || (e.definition||'').toLowerCase().includes(q) || (e.examples||[]).join(' ').toLowerCase().includes(q));
      }
      return true;
    }).sort((a,b)=>a.term.localeCompare(b.term,'tr'));

    grid.innerHTML='';
    out.forEach(e=>{
      const c = document.createElement('article'); c.className='card fade-in';
      c.innerHTML = `<div><h3>${escapeHtml(e.term)}</h3><div class="muted">${escapeHtml(e.pron || '')}</div></div><p class="muted" style="margin-top:10px">${escapeHtml(e.definition)}</p>`;
      const meta = document.createElement('div'); meta.className='meta';
      const tags = document.createElement('div'); tags.style.fontSize='13px'; tags.className='muted'; tags.textContent = (e.tags||[]).join(', ');
      const favBtn = document.createElement('button'); favBtn.className='btn'; favBtn.textContent = favs.includes(e.id) ? '★' : '☆';
      favBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); toggleFav(e.id); render(); });
      meta.appendChild(tags); meta.appendChild(favBtn);
      c.appendChild(meta);
      c.addEventListener('click', ()=> openModal(e));
      grid.appendChild(c);
    });

    count.textContent = `(${out.length})`;
    total.textContent = entries.length;
    favCount.textContent = favs.length;
    tagCount.textContent = getAllTags().length;

    renderFavList();
  }

  function renderFavList(){
    favList.innerHTML='';
    if(favs.length===0){ favList.textContent='Henüz favori yok.'; return; }
    favs.forEach(id=>{
      const e = entries.find(x=>x.id===id); if(!e) return;
      const b = document.createElement('button'); b.className='btn'; b.style.textAlign='left'; b.textContent = e.term; b.addEventListener('click', ()=> openModal(e));
      favList.appendChild(b);
    });
  }

  function toggleFav(id){
    if(favs.includes(id)) favs = favs.filter(x=>x!==id); else favs.unshift(id);
    save(FAV_KEY,favs);
  }

  // modal (view only)
  function openModal(entry){
    const tpl = document.getElementById('termModalTpl');
    const clone = tpl.content.cloneNode(true);
    const overlay = clone.querySelector('.overlay');
    document.body.appendChild(overlay);

    const termInput = overlay.querySelector('#termInput');
    const pronInput = overlay.querySelector('#pronInput');
    const defInput = overlay.querySelector('#defInput');
    const tagsInput = overlay.querySelector('#tagsInput');
    const examplesInput = overlay.querySelector('#examplesInput');
    const modalTitle = overlay.querySelector('#modalTitle');
    const modalClose = overlay.querySelector('#modalClose');
    const shareTwitter = overlay.querySelector('#shareTwitter');
    const shareFacebook = overlay.querySelector('#shareFacebook');

    if(entry){
      modalTitle.textContent = entry.term;
      termInput.value = entry.term;
      pronInput.value = entry.pron || '';
      defInput.value = entry.definition || '';
      tagsInput.value = (entry.tags||[]).join(', ');
      examplesInput.value = (entry.examples||[]).join('\n');

      const shareText = `${entry.term}: ${entry.definition ? entry.definition.substring(0, 140) : ''}`;
      const shareUrl = encodeURIComponent(window.location.href);

      shareTwitter.addEventListener('click', () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${shareUrl}`;
        window.open(url, '_blank', 'width=550,height=420');
      });

      shareFacebook.addEventListener('click', () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank', 'width=550,height=420');
      });
    }

    function close(){
      overlay.remove();
      render();
    }

    modalClose.addEventListener('click', close);
    overlay.addEventListener('click', (ev)=>{ if(ev.target===overlay) close(); });
  }

  // global paylaşım butonları (aside)
  document.querySelectorAll('.share-btn.twitter').forEach(btn=> btn.addEventListener('click', () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Edebiyat Sözlüğü - Güzel bir kaynak')}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }));
  document.querySelectorAll('.share-btn.facebook').forEach(btn=> btn.addEventListener('click', () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }));
  document.querySelectorAll('.share-btn.whatsapp').forEach(btn=> btn.addEventListener('click', () => {
    const url = `https://wa.me/?text=${encodeURIComponent('Edebiyat Sözlüğü - Güzel bir kaynak: ' + window.location.href)}`;
    window.open(url, '_blank');
  }));

  // helpers
  function uid(){ return Math.random().toString(36).slice(2,9); }
  function save(key,val){ localStorage.setItem(key,JSON.stringify(val)); }
  function load(key, fallback){ try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch(e){return fallback;} }
  function escapeHtml(s){ return (s||'').toString().replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }

  // import/export
  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(entries, null, 2)],{type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download='edebiyat-sozlugu.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  importFile.addEventListener('change', (ev)=>{
    const f = ev.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = (e)=>{
      try{
        const parsed = JSON.parse(e.target.result);
        if(Array.isArray(parsed)) {
          const sanitized = parsed.map(p=>({
            id:p.id||uid(),
            term:p.term||'',
            pron:p.pron||'',
            tags:Array.isArray(p.tags)?p.tags:[],
            definition:p.definition||'',
            examples:Array.isArray(p.examples)?p.examples:[]
          }));
          entries = sanitized.concat(entries);
          save(LS_KEY,entries);
          render();
          alert('İçe aktarıldı');
        } else alert('Geçersiz JSON: dizi bekleniyor');
      }catch(err){ alert('JSON okunurken hata: '+(err && err.message)); }
    };
    r.readAsText(f);
  });

  // search + ui hooks
  search.addEventListener('input', ()=>render());
  clearBtn.addEventListener('click', ()=>{ search.value=''; activeLetter=''; activeTags=[]; onlyFav=false; favFilter.classList.remove('active'); render(); });
  resetBtn.addEventListener('click', ()=>{ if(confirm('Filtreleri sıfırlamak istiyor musun?')){ search.value=''; activeLetter=''; activeTags=[]; onlyFav=false; favFilter.classList.remove('active'); render(); } });
  favFilter.addEventListener('click', ()=>{ onlyFav = !onlyFav; favFilter.classList.toggle('active'); render(); });

  // keyboard shortcuts
  window.addEventListener('keydown', (e)=>{
    if(e.key === '/') { e.preventDefault(); search.focus(); }
  });

  // storage sync
  window.addEventListener('storage', (ev)=>{
    if(ev.key===LS_KEY) entries = load(LS_KEY, (typeof SAMPLE !== 'undefined') ? SAMPLE.slice() : []), render();
  });

  // init
  render();
})();
