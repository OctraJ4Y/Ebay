// ========================================
// script.js – Pauls Laptops (FUNKTIONIERT 100%)
// IMPRESSUM DIREKT IM HTML → KEIN FETCH!
// ========================================

const SUPABASE_URL = 'https://uhwrnlwcuotrwozfqknl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVod3JubHdjdW90cndvemZxa25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDk4MzIsImV4cCI6MjA3NzkyNTgzMn0.IjvV4q0QoV-ajZwhEHGqz1h79yYYFGDQtdG9A65RTwQ';

let _supabase, productGrid, navToggle, navMenu, modal, loginForm, adminPanel, itemList, newItemInput;
let adminBtn = null, lightbox = null;

// DOM GELADEN
document.addEventListener('DOMContentLoaded', () => {
    navToggle = document.getElementById('nav-toggle');
    navMenu = document.getElementById('nav-menu');
    modal = document.getElementById('admin-modal');
    loginForm = document.getElementById('login-form');
    adminPanel = document.getElementById('admin-panel');
    itemList = document.getElementById('item-list');
    productGrid = document.getElementById('product-grid');
    newItemInput = document.getElementById('new-item-id');

    const { createClient } = supabase;
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // NAVBAR
    navToggle.addEventListener('click', () => navMenu.classList.toggle('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => navMenu.classList.remove('active')));

    // ADMIN ZUGRIFF
    let logoClicks = 0;
    document.querySelector('.logo').addEventListener('click', () => {
        if (++logoClicks === 5) { createAdminBtn(); adminBtn.classList.add('visible'); alert('Admin freigeschaltet!'); logoClicks = 0; }
    });
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.altKey && e.key === 'a') { e.preventDefault(); createAdminBtn(); openAdmin(); }
    });

    // INIT
    loadProducts();
    renderItemList();
});

// === ADMIN ===
function createAdminBtn() {
    if (adminBtn) return;
    const li = document.createElement('li');
    adminBtn = document.createElement('button');
    adminBtn.id = 'admin-btn'; adminBtn.className = 'admin-btn'; adminBtn.textContent = 'Admin';
    adminBtn.onclick = openAdmin;
    li.appendChild(adminBtn);
    document.querySelector('.nav-menu').insertBefore(li, document.querySelector('.toggle-btn').parentElement);
}
function openAdmin() { modal.style.display = 'flex'; }
function closeAdmin() { modal.style.display = 'none'; }
function checkPassword() {
    if (document.getElementById('admin-pass').value === 'thinkpad2025') {
        localStorage.setItem('admin_logged_in', 'true');
        loginForm.style.display = 'none'; adminPanel.style.display = 'block';
        renderItemList(); if (adminBtn) adminBtn.classList.add('visible');
    } else alert('Falsches Passwort!');
}

// === SUPABASE DB ===
async function loadItemIds() {
    const { data, error } = await _supabase.from('items').select('item_id').order('created_at', { ascending: false });
    return error ? [] : data.map(r => r.item_id);
}
async function addItemId(id) { await _supabase.from('items').insert({ item_id: id }); }
async function removeItemId(id) { await _supabase.from('items').delete().eq('item_id', id); }

// === EBAY SCRAPING ===
async function fetchEbayItem(itemId) {
    const url = `https://corsproxy.io/?${encodeURIComponent(`https://www.ebay.de/itm/${itemId}`)}`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error();
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('h1')?.innerText.trim() || 'Unbekannt';
        const priceEl = doc.querySelector('.ux-textspans--SECONDARY, .notranslate, .price');
        const price = priceEl ? priceEl.innerText.replace(/[^\d,.-]/g, '').trim() || 'Preis prüfen' : 'Preis prüfen';

        const images = Array.from(doc.querySelectorAll('img'))
            .map(i => i.src).filter(s => s.includes('s-l') && !s.includes('logo')).slice(0, 5);

        const desc = doc.querySelector('#desc_div, .d-item-description')?.innerText.replace(/\s+/g, ' ').trim().substring(0, 200) + '...' || 'Keine Beschreibung.';

        return {
            id: itemId, title, price,
            images: images.length ? images : ['https://via.placeholder.com/300x200/222/ccc?text=Laptop'],
            description: desc, link: `https://www.ebay.de/itm/${itemId}`
        };
    } catch (e) {
        console.warn('Scraping fehlgeschlagen:', e);
        return {
            id: itemId, title: 'Ladefehler', price: '–',
            images: ['https://via.placeholder.com/300x200/FF6B6B/222?text=Fehler'],
            description: 'Nicht erreichbar.', link: `https://www.ebay.de/itm/${itemId}`, error: true
        };
    }
}

// === PRODUKTE LADEN ===
async function loadProducts() {
    if (!productGrid) return;
    productGrid.innerHTML = '<div class="loading">Lade Laptops...</div>';
    const ids = await loadItemIds();
    if (!ids.length) { productGrid.innerHTML = '<div class="error">Keine Produkte!</div>'; return; }

    const items = await Promise.all(ids.map(fetchEbayItem));
    productGrid.innerHTML = items.map(item => {
        const gallery = item.images.map(src => 
            `<img src="${src}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200/222/ccc?text=Bild'" onclick="openLightbox('${src.replace(/'/g, "\\'")}')">`
        ).join('');
        return `
            <div class="product-card fade-in ${item.error ? 'error-card' : ''}">
                <span class="ebay-badge">eBay</span>
                <div class="product-gallery">${gallery}</div>
                <div class="product-info">
                    <h3>${item.title}</h3>
                    <div class="price">${item.price}</div>
                    <div class="description">${item.description}</div>
                    <div class="btn-group">
                        <a href="${item.link}" target="_blank" class="ebay-btn">Jetzt kaufen</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.fade-in').forEach((el, i) => {
        el.style.animationDelay = `${i * 0.1}s`;
        el.classList.add('animate');
    });
}

// === ADMIN PANEL ===
async function renderItemList() {
    if (!itemList) return;
    const ids = await loadItemIds();
    itemList.innerHTML = ids.length ? ids.map(id => `
        <div class="item-entry"><span><strong>${id}</strong></span><button class="remove-btn" onclick="removeAndReload('${id}')">Löschen</button></div>
    `).join('') : '<p style="color:#888;">Keine IDs</p>';
}
async function removeAndReload(id) { await removeItemId(id); renderItemList(); loadProducts(); }
async function addItem() {
    const id = newItemInput.value.trim();
    if (id && /^\d+$/.test(id)) { await addItemId(id); newItemInput.value = ''; renderItemList(); loadProducts(); }
    else alert('Bitte gültige eBay Item-ID eingeben!');
}

// === LIGHTBOX ===
window.openLightbox = function(src) {
    if (!lightbox) {
        lightbox = document.createElement('div'); lightbox.className = 'lightbox';
        lightbox.innerHTML = `<div class="lightbox-content"><span class="lightbox-close" onclick="closeLightbox()">×</span><img id="lightbox-img" src="" alt=""></div>`;
        document.body.appendChild(lightbox);
        lightbox.addEventListener('click', e => e.target === lightbox && closeLightbox());
    }
    document.getElementById('lightbox-img').src = src;
    lightbox.style.display = 'flex';
};
window.closeLightbox = () => { if (lightbox) lightbox.style.display = 'none'; };

// === THEME ===
function toggleTheme() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
    document.querySelector('.toggle-btn').textContent = isDark ? 'Dark' : 'Light';
}