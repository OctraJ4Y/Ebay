/* Modernisiertes script.js
   - sauberer Scope
   - Theme Persistenz (auto / light / dark)
   - Accessibile Admin-Modal (focus management)
   - Admin-Button Freischaltung (5x Logo click oder Ctrl+Alt+A)
   - Supabase usage wie vorher (achte auf Sicherheit der Keys)
*/

(() => {
  'use strict';

  // Supabase config (wie vorher) - behandle den ANON_KEY vertraulich
  const SUPABASE_URL = 'https://uhwrnlwcuotrwozfqknl.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVod3JubHdjdW90cndvemZxa25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDk4MzIsImV4cCI6MjA3NzkyNTgzMn0.IjvV4q0QoV-ajZwhEHGqz1h79yYYFGDQtdG9A65RTwQ';

  // DOM elements
  const body = document.documentElement;
  const logoBtn = document.getElementById('logo');
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const themeToggle = document.getElementById('theme-toggle');
  const productGrid = document.getElementById('product-grid');

  // Admin elements
  const adminModal = document.getElementById('admin-modal');
  const adminClose = document.getElementById('admin-close');
  const checkBtn = document.getElementById('check-btn');
  const loginBtn = document.getElementById('login-btn');
  const passwordInput = document.getElementById('admin-pass');
  const passwordConfirm = document.getElementById('password-confirm');
  const confirmMessage = document.getElementById('confirm-message');
  const loginForm = document.getElementById('login-form');
  const adminPanel = document.getElementById('admin-panel');
  const addItemBtn = document.getElementById('add-item-btn');
  const newItemInput = document.getElementById('new-item-id');
  const reloadBtn = document.getElementById('reload-btn');
  const itemList = document.getElementById('item-list');

  // admin navbar button (created dynamically)
  let adminBtn = null;
  let logoClicks = 0;

  // state
  let passwordChecked = false;
  let _supabase = null;
  let lightbox = null;

  // Init after DOM loaded (script is deferred)
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Supabase client
    try {
      const { createClient } = supabase;
      _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn('Supabase initialisierung fehlgeschlagen', e);
    }

    // nav toggle for small screens
    navToggle?.addEventListener('click', () => {
      const open = navMenu.getAttribute('data-open') === 'true';
      navMenu.setAttribute('data-open', String(!open));
      navToggle.setAttribute('aria-expanded', String(!open));
    });

    // theme initialization
    setupTheme();

    // admin activation via logo clicks
    logoBtn?.addEventListener('click', () => {
      logoClicks++;
      if (logoClicks >= 5) {
        createAdminBtn();
        showToast('Admin freigeschaltet!');
        logoClicks = 0;
      }
      // reset if not clicked further within 2s
      clearTimeout(logoBtn._clickTimeout);
      logoBtn._clickTimeout = setTimeout(() => logoClicks = 0, 2000);
    });

    // keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        createAdminBtn();
        openAdminModal();
      }
    });

    // modal events
    adminClose?.addEventListener('click', closeAdminModal);
    adminModal?.addEventListener('click', (ev) => {
      // backdrop closes modal
      if (ev.target?.dataset?.close === 'true') closeAdminModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && adminModal.getAttribute('aria-hidden') === 'false') closeAdminModal();
    });

    // admin form actions
    checkBtn?.addEventListener('click', checkPasswordPreview);
    loginBtn?.addEventListener('click', confirmLogin);
    addItemBtn?.addEventListener('click', addItem);
    reloadBtn?.addEventListener('click', loadProducts);

    // initial data load
    loadProducts();
    renderItemList();
  }

  /* ========== THEME ========== */
  function setupTheme() {
    // priority: localStorage > system preference
    const stored = localStorage.getItem('theme') || 'auto';
    applyTheme(stored);

    // toggle button
    themeToggle?.addEventListener('click', () => {
      const current = body.getAttribute('data-theme') || 'auto';
      // cycle auto -> light -> dark -> auto
      const next = current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto';
      localStorage.setItem('theme', next);
      applyTheme(next);
    });
    updateThemeToggleLabel();
  }

  function applyTheme(name) {
    // if auto, use system preference
    if (name === 'auto') {
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      body.setAttribute('data-theme', 'auto'); // we keep 'auto' so CSS can target it if needed
      // but also set visual theme by applying light variables when system prefers
      if (prefersLight) document.documentElement.style.setProperty('--dummy', 'light');
      // We will toggle CSS variables via data-theme on :root in CSS; for simplicity set attribute to 'light'/'dark' for definite appearance
      document.documentElement.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', name);
    }
    updateThemeToggleLabel();
  }

  function updateThemeToggleLabel() {
    const theme = localStorage.getItem('theme') || 'auto';
    if (!themeToggle) return;
    if (theme === 'auto') themeToggle.textContent = 'Auto';
    else if (theme === 'light') themeToggle.textContent = 'Light';
    else themeToggle.textContent = 'Dark';
    themeToggle.setAttribute('aria-pressed', String(theme !== 'auto'));
  }

  /* ========== ADMIN UI ========== */
  function createAdminBtn() {
    if (adminBtn) return;
    const li = document.createElement('li');
    adminBtn = document.createElement('button');
    adminBtn.id = 'admin-btn';
    adminBtn.className = 'small-btn';
    adminBtn.textContent = 'Admin';
    adminBtn.addEventListener('click', openAdminModal);
    li.appendChild(adminBtn);
    // insert before the theme toggle li (last known)
    const toggleLi = Array.from(navMenu.children).find(li => li.textContent.trim().toLowerCase().includes('auto') || li.querySelector('#theme-toggle'));
    if (toggleLi) navMenu.insertBefore(li, toggleLi);
    else navMenu.appendChild(li);
  }

  function openAdminModal() {
    adminModal.setAttribute('aria-hidden', 'false');
    passwordInput.value = '';
    passwordConfirm.hidden = true;
    confirmMessage.textContent = '';
    passwordChecked = false;
    // show modal and focus
    setTimeout(() => passwordInput.focus(), 120);
  }

  function closeAdminModal() {
    adminModal.setAttribute('aria-hidden', 'true');
    // return focus to adminBtn or logo
    (adminBtn || logoBtn)?.focus();
  }

  function showToast(message) {
    // very small toast implementation
    const t = document.createElement('div');
    t.textContent = message;
    t.style.position = 'fixed';
    t.style.right = '1rem';
    t.style.bottom = '1rem';
    t.style.padding = '0.6rem 1rem';
    t.style.background = 'linear-gradient(90deg,#ff3366,#ff6b6b)';
    t.style.color = 'white';
    t.style.borderRadius = '8px';
    t.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
    document.body.appendChild(t);
    setTimeout(() => t.style.opacity = '0', 2200);
    setTimeout(() => t.remove(), 2600);
  }

  /* ======== CHECK / LOGIN ======== */
  function checkPasswordPreview() {
    const pw = passwordInput?.value.trim();
    passwordConfirm.hidden = true;
    confirmMessage.textContent = '';

    if (!pw) {
      confirmMessage.textContent = 'Bitte Passwort eingeben!';
      confirmMessage.style.color = '#ff6b6b';
      passwordConfirm.hidden = false;
      passwordChecked = false;
      return;
    }

    // Simple local password check (keine sikkerheitsgarantie!)
    if (pw === 'thinkpad2025') {
      confirmMessage.textContent = 'Passwort korrekt!';
      confirmMessage.style.color = '#0f0';
      passwordConfirm.hidden = false;
      passwordChecked = true;
      checkBtn.disabled = true;
      checkBtn.style.opacity = '0.6';
      checkBtn.style.cursor = 'not-allowed';
    } else {
      confirmMessage.textContent = 'Falsches Passwort!';
      confirmMessage.style.color = '#ff6b6b';
      passwordConfirm.hidden = false;
      passwordChecked = false;
    }
  }

  function confirmLogin() {
    if (!passwordChecked) {
      alert('Bitte erst prüfen!');
      return;
    }
    // Mark admin as logged in
    localStorage.setItem('admin_logged_in', 'true');
    // hide login form, show admin panel
    document.getElementById('login-form').style.display = 'none';
    adminPanel.hidden = false;
    renderItemList();
    showToast('Eingeloggt als Admin');
  }

  /* ======== SUPABASE / ITEMS ======== */
  async function loadItemIds() {
    if (!_supabase) return [];
    try {
      const { data, error } = await _supabase.from('items').select('item_id').order('created_at', { ascending: false });
      if (error) {
        console.warn('Supabase error', error);
        return [];
      }
      return data.map(r => r.item_id);
    } catch (e) {
      console.warn('loadItemIds failed', e);
      return [];
    }
  }

  async function addItemId(itemId) {
    if (!_supabase) return;
    try {
      await _supabase.from('items').insert({ item_id: itemId });
    } catch (e) { console.warn('addItemId failed', e); }
  }

  async function removeItemId(itemId) {
    if (!_supabase) return;
    try {
      await _supabase.from('items').delete().eq('item_id', itemId);
    } catch (e) { console.warn('removeItemId failed', e); }
  }

  /* ======== eBay scraping (simple) ======== */
  async function fetchEbayItem(itemId) {
    const proxy = `https://corsproxy.io/?${encodeURIComponent(`https://www.ebay.de/itm/${itemId}`)}`;
    try {
      const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error('network');
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const title = doc.querySelector('h1')?.innerText.trim() || 'Unbekannt';
      const priceEl = doc.querySelector('.ux-textspans--SECONDARY, .notranslate, .price');
      const price = priceEl ? priceEl.innerText.replace(/[^\d,,-./]/g, '').trim() : 'Preis prüfen';

      const images = Array.from(doc.querySelectorAll('img'))
        .map(i => i.src).filter(s => s && s.includes('s-l') && !s.includes('logo')).slice(0,5);

      const desc = doc.querySelector('#desc_div, .d-item-description')?.innerText.replace(/\s+/g,' ').trim().slice(0,200) + '...' || 'Keine Beschreibung.';

      return {
        id: itemId, title, price,
        images: images.length ? images : ['https://via.placeholder.com/300x200/222/ccc?text=Laptop'],
        description: desc, link: `https://www.ebay.de/itm/${itemId}`
      };
    } catch (e) {
      console.warn('Scraping fehlgeschlagen', e);
      return {
        id: itemId, title: 'Ladefehler', price: '–',
        images: ['https://via.placeholder.com/300x200/FF6B6B/222?text=Fehler'],
        description: 'Nicht erreichbar.', link: `https://www.ebay.de/itm/${itemId}`, error: true
      };
    }
  }

  /* ======== Render products ======== */
  async function loadProducts() {
    if (!productGrid) return;
    productGrid.innerHTML = `<div class="product-card"><p style="padding:1rem;color:var(--muted)">Lade Laptops...</p></div>`;

    const ids = await loadItemIds();
    if (!ids.length) {
      productGrid.innerHTML = `<div class="product-card"><p style="padding:1rem;color:var(--muted)">Keine Produkte!</p></div>`;
      return;
    }

    const items = await Promise.all(ids.map(fetchEbayItem));
    productGrid.innerHTML = items.map(item => renderProductCard(item)).join('');
    // add image click handlers for lightbox
    document.querySelectorAll('.product-gallery img').forEach(img => {
      img.addEventListener('click', (e) => openLightbox(e.target.src));
    });
  }

  function renderProductCard(item) {
    const imagesHtml = (item.images || []).map(src => `<img src="${src}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200/222/ccc?text=Bild'">`).join('');
    return `
      <article class="product-card" role="listitem" aria-label="${escapeHtml(item.title)}">
        <div style="position:relative;">
          <span class="ebay-badge">eBay</span>
          <div class="product-gallery">${imagesHtml}</div>
        </div>
        <div class="product-info">
          <h3>${escapeHtml(item.title)}</h3>
          <div class="price">${escapeHtml(item.price)}</div>
          <div class="description">${escapeHtml(item.description)}</div>
          <div class="form-actions" style="margin-top:0.6rem;">
            <a class="btn neutral" href="${item.link}" target="_blank" rel="noopener">Jetzt kaufen</a>
          </div>
        </div>
      </article>
    `;
  }

  /* ======== Admin panel items ======== */
  async function renderItemList() {
    if (!itemList) return;
    const ids = await loadItemIds();
    if (!ids || ids.length === 0) {
      itemList.innerHTML = `<div style="color:var(--muted);padding:0.5rem">Keine IDs</div>`;
      return;
    }
    itemList.innerHTML = ids.map(id => `
      <div class="item-entry">
        <span style="font-family:monospace">${id}</span>
        <div style="display:flex;gap:0.4rem">
          <button data-remove="${id}" class="btn neutral">Löschen</button>
        </div>
      </div>
    `).join('');
    // attach listeners
    itemList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.remove;
        await removeItemId(id);
        await renderItemList();
        await loadProducts();
      });
    });
  }

  async function addItem() {
    const id = (newItemInput.value || '').trim();
    if (!/^\d+$/.test(id)) {
      alert('Bitte gültige eBay Item-ID eingeben!');
      return;
    }
    await addItemId(id);
    newItemInput.value = '';
    await renderItemList();
    await loadProducts();
  }

  /* ======== Lightbox ======== */
  function openLightbox(src) {
    if (!src) return;
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.style.position = 'fixed';
      lightbox.style.inset = '0';
      lightbox.style.background = 'rgba(0,0,0,0.9)';
      lightbox.style.display = 'flex';
      lightbox.style.alignItems = 'center';
      lightbox.style.justifyContent = 'center';
      lightbox.style.zIndex = 4000;
      lightbox.innerHTML = `<div style="position:relative;max-width:92vw;max-height:92vh">
        <button style="position:absolute;right:-10px;top:-30px;background:#ff3366;color:white;border:none;padding:0.4rem 0.6rem;border-radius:8px;cursor:pointer">✕</button>
        <img style="max-width:100%;max-height:92vh;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.6)" src="${src}" alt="Produktbild">
      </div>`;
      document.body.appendChild(lightbox);
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });
      lightbox.querySelector('button').addEventListener('click', closeLightbox);
    } else {
      lightbox.querySelector('img').src = src;
      lightbox.style.display = 'flex';
    }
  }

  function closeLightbox() {
    if (lightbox) lightbox.style.display = 'none';
  }

  /* ======== Helpers ======== */
  function escapeHtml(s = '') {
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'", '&#39;');
  }

  // simple polyfill for AbortSignal.timeout for older browsers
  if (!('timeout' in AbortSignal)) {
    AbortSignal.timeout = (ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    };
  }
})();