// ============================================================
// APP LOGIC — FARMACOPEDIA MIMI
// ============================================================

// ---------- THEME (dark/light) ----------
(function(){
  const root = document.documentElement;
  const saved = localStorage.getItem('farmacopedia-theme');
  const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const initial = saved || (systemPrefersLight ? 'light' : 'dark');
  root.setAttribute('data-theme', initial);

  function applyTheme(t){
    root.setAttribute('data-theme', t);
    localStorage.setItem('farmacopedia-theme', t);
    document.querySelectorAll('.theme-toggle .opt').forEach(o => o.classList.toggle('active', o.dataset.theme === t));
  }
  applyTheme(initial);

  document.querySelectorAll('.theme-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      const optEl = e.target.closest('.opt');
      const current = root.getAttribute('data-theme');
      const next = optEl ? optEl.dataset.theme : (current === 'dark' ? 'light' : 'dark');
      applyTheme(next);
    });
  });
})();

// ---------- PWA install prompt ----------
(function(){
  let deferredPrompt = null;
  const banner = document.getElementById('installBanner');
  const installBtn = document.getElementById('installBtn');
  const installClose = document.getElementById('installClose');
  if(!banner) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if(!sessionStorage.getItem('installDismissed')) banner.classList.add('show');
  });

  installBtn && installBtn.addEventListener('click', async () => {
    banner.classList.remove('show');
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
  installClose && installClose.addEventListener('click', () => {
    banner.classList.remove('show');
    sessionStorage.setItem('installDismissed', '1');
  });
  window.addEventListener('appinstalled', () => { banner.classList.remove('show'); });

  // Register service worker (only works when served over http/https, not file://)
  if('serviceWorker' in navigator && location.protocol !== 'file:'){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    });
  }
})();

// ---------- Back to top ----------
(function(){
  const btn = document.getElementById('topBtn');
  if(!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 500);
  }, { passive:true });
  btn.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
})();

(function(){
  const catList = document.getElementById('catList');
  const chipRow = document.getElementById('chipRow');
  const grid = document.getElementById('grid');
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearBtn');
  const resCount = document.getElementById('resCount');
  const statTotal = document.getElementById('statTotal');
  const modalOverlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('modal');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const burgerBtn = document.getElementById('burgerBtn');

  const catById = {};
  CATEGORIES.forEach(c => catById[c.id] = c);

  let state = { cat: 'all', q: '' };

  statTotal.textContent = DRUGS.length;

  const ICONS = {
    mind: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 2a5 5 0 0 0-5 5v1a3 3 0 0 0-1 5.5V16a3 3 0 0 0 3 3h1a3 3 0 0 0 3 3 3 3 0 0 0 3-3V5a3 3 0 0 0-3-3H9Z"/><path d="M15 2a5 5 0 0 1 5 5v1a3 3 0 0 1 1 5.5V16a3 3 0 0 1-3 3h-1a3 3 0 0 1-3 3"/></svg>',
    calm: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>',
    swirl: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2a10 10 0 1 0 7.07 2.93"/><path d="M12 8a4 4 0 1 0 2.83 1.17"/></svg>',
    scale: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v18M5 7l-3 6a4 4 0 0 0 6 0L5 7ZM19 7l-3 6a4 4 0 0 0 6 0L19 7ZM5 7h14M9 21h6"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>',
    drop: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2s7 7.58 7 12a7 7 0 1 1-14 0c0-4.42 7-12 7-12Z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>',
    bug: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="8" height="10" rx="4"/><path d="M8 12H4M20 12h-4M9 6l-2-3M15 6l2-3M9 18l-2 3M15 18l2 3M8 10 5 8M16 10l3-2"/></svg>',
    fungi: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 11a8 8 0 0 1 16 0c0 1.5-2 2-8 2s-8-.5-8-2Z"/><path d="M12 13v7M9 20h6"/></svg>',
    virus: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2 2M17.1 17.1l2 2M19.1 4.9l-2 2M6.9 17.1l-2 2"/></svg>',
    lungs: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v9M12 11c-1 3-2 3-4 3s-4 2-4 6c0 1.5 1 2 2 2 2 0 3-2 3-5M12 11c1 3 2 3 4 3s4 2 4 6c0 1.5-1 2-2 2-2 0-3-2-3-5"/></svg>',
    ribbon: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c-2 3-2 5 0 7s2 4 0 7M12 3c2 3 2 5 0 7s-2 4 0 7"/><circle cx="12" cy="10" r="1.5"/></svg>',
    worm: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6c2 0 2 3 4 3s2-3 4-3 2 3 4 3 2-3 4-3M4 14c2 0 2 3 4 3s2-3 4-3 2 3 4 3 2-3 4-3"/></svg>',
    mosquito: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="2.4"/><path d="M12 2v7.5M4 6l6 5M20 6l-6 5M3 14l6.5-2M21 14l-6.5-2M6 21l4.5-7M18 21l-4.5-7"/></svg>',
  };

  function iconFor(catId){
    const c = catById[catId];
    return ICONS[c.icon] || ICONS.spark;
  }

  // ---------- Build sidebar ----------
  function renderCatList(){
    let html = `<div class="cat-item ${state.cat==='all'?'active':''}" data-cat="all" style="--dot:#8DA0FF;">
        <span class="cat-dot" style="--dot:#8DA0FF; background:#8DA0FF;"></span>
        Todos los fármacos
        <span class="cnt">${DRUGS.length}</span>
      </div>`;
    CATEGORIES.forEach(c => {
      const count = DRUGS.filter(d => d.cat === c.id).length;
      html += `<div class="cat-item ${state.cat===c.id?'active':''}" data-cat="${c.id}" style="--dot:${c.color};">
          <span class="cat-dot" style="--dot:${c.color}; background:${c.color};"></span>
          ${c.label}
          <span class="cnt">${count}</span>
        </div>`;
    });
    catList.innerHTML = html;
    catList.querySelectorAll('.cat-item').forEach(el => {
      el.addEventListener('click', () => {
        state.cat = el.dataset.cat;
        renderCatList();
        renderChips();
        renderGrid();
        closeSidebarMobile();
      });
    });
  }

  // ---------- Build chip row (mobile-friendly quick filters) ----------
  function renderChips(){
    let html = `<div class="chip ${state.cat==='all'?'active':''}" data-cat="all" style="--dot:#8DA0FF;">Todos</div>`;
    CATEGORIES.forEach(c => {
      html += `<div class="chip ${state.cat===c.id?'active':''}" data-cat="${c.id}" style="--dot:${c.color};">${c.short}</div>`;
    });
    chipRow.innerHTML = html;
    chipRow.querySelectorAll('.chip').forEach(el => {
      el.addEventListener('click', () => {
        state.cat = el.dataset.cat;
        renderCatList();
        renderChips();
        renderGrid();
      });
    });
  }

  // ---------- Search + filter ----------
  function matches(drug, q){
    if(!q) return true;
    const hay = [
      drug.name, drug.brand, drug.group, drug.indications,
      drug.mech, catById[drug.cat].label
    ].join(' ').toLowerCase();
    return hay.includes(q);
  }

  function getFiltered(){
    const q = state.q.trim().toLowerCase();
    return DRUGS.filter(d => (state.cat==='all' || d.cat===state.cat) && matches(d, q));
  }

  // ---------- Render grid ----------
  function renderGrid(){
    const list = getFiltered();
    resCount.textContent = list.length;

    if(list.length === 0){
      grid.innerHTML = `<div class="empty-state">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <h3>Sin resultados</h3>
        <p>Prueba con otro nombre, marca o categoría.</p>
      </div>`;
      return;
    }

    grid.innerHTML = list.map(d => {
      const c = catById[d.cat];
      return `<div class="card" data-id="${d.id}" style="--dot:${c.color};">
        <div class="card-top">
          <div class="card-badge">${iconFor(d.cat)}</div>
          <div>
            <div class="card-cat">${c.label}</div>
          </div>
        </div>
        <h3 class="card-name">${d.name}</h3>
        <div class="card-brand">${d.brand && d.brand !== '—' ? d.brand : 'Nombre genérico'}</div>
        <div class="card-group">${d.group}</div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.card').forEach(el => {
      el.addEventListener('click', () => openModal(el.dataset.id));
    });
  }

  // ---------- Modal ----------
  const FIELD_ICONS = {
    mech: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/></svg>',
    pk: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    indications: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
    dose: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="10" rx="2"/><path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M12 12v4M10 14h4"/></svg>',
    presentation: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 10h16M10 4v16"/></svg>',
    adverse: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
    contra: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/></svg>',
  };

  const FIELD_LABELS = {
    mech: 'Mecanismo de acción',
    pk: 'Farmacocinética',
    indications: 'Indicaciones y usos terapéuticos',
    dose: 'Dosis e intervalos',
    presentation: 'Presentaciones',
    adverse: 'Efectos adversos',
    contra: 'Contraindicaciones y precauciones',
  };

  function openModal(id){
    const d = DRUGS.find(x => x.id === id);
    if(!d) return;
    const c = catById[d.cat];

    const fields = ['mech','pk','indications','dose','presentation','adverse','contra'];
    const fieldHtml = fields.map(f => {
      if(!d[f]) return '';
      return `<div class="field ${f}">
        <div class="field-label">${FIELD_ICONS[f]} ${FIELD_LABELS[f]}</div>
        <div class="field-text">${d[f]}</div>
      </div>`;
    }).join('');

    modal.style.setProperty('--dot', c.color);
    modal.innerHTML = `
      <div class="modal-head">
        <button class="modal-close" id="modalCloseBtn">✕</button>
        <div class="modal-cat">${c.label}</div>
        <h2 class="modal-name">${d.name}</h2>
        <div class="modal-brand">${d.brand && d.brand !== '—' ? 'Nombre comercial: ' + d.brand : 'Nombre genérico'}</div>
        <div class="modal-group">${d.group}</div>
      </div>
      <div class="modal-body">${fieldHtml}</div>
    `;

    modalOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  }

  function closeModal(){
    modalOverlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  modalOverlay.addEventListener('click', (e) => {
    if(e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeModal();
  });

  // ---------- Search input ----------
  let debounceT;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceT);
    const val = e.target.value;
    clearBtn.classList.toggle('show', val.length > 0);
    debounceT = setTimeout(() => {
      state.q = val;
      renderGrid();
    }, 90);
  });
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.q = '';
    clearBtn.classList.remove('show');
    renderGrid();
    searchInput.focus();
  });

  // ---------- Mobile sidebar ----------
  function openSidebarMobile(){
    sidebar.classList.add('open');
    overlay.classList.add('show');
  }
  function closeSidebarMobile(){
    if(window.innerWidth <= 980){
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    }
  }
  burgerBtn.addEventListener('click', openSidebarMobile);
  overlay.addEventListener('click', closeSidebarMobile);

  // ---------- Init ----------
  renderCatList();
  renderChips();
  renderGrid();
})();
