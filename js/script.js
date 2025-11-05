// ========================================
// js/script.js – Pauls ThinkPad Shop
// Smooth Animations + Specs Button
// ========================================

// === KONFIG ===
const ADMIN_PASSWORD = 'thinkpad2025';
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
let ITEM_IDS = JSON.parse(localStorage.getItem('pauls_thinkpad_ids')) || [];

// === DOM ===
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');
const adminBtn = document.getElementById('admin-btn');
const modal = document.getElementById('admin-modal');
const loginForm = document.getElementById('login-form');
const adminPanel = document.getElementById('admin-panel');
const itemList = document.getElementById('item-list');
const productGrid = document.getElementById('product-grid');
const newItemInput = document.getElementById('new-item-id');

// === SPECS MODAL (neues Modal) ===
const specsModal = document.createElement('div');
specsModal.className = 'modal';
specsModal.id = 'specs-modal';
specsModal.innerHTML = `
    <div class="modal-content specs-modal">
        <span class="close" onclick="closeSpecs()">&times;</span>
        <h2>Technische Daten</h2>
        <div id="specs-content" style="margin-top:1rem; line-height:1.7; font-size:0.95rem;"></div>
    </div>
`;
document.body.appendChild(specsModal);

// === NAVBAR TOGGLE ===
navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navMenu.classList.remove('active'));
});

// === ADMIN ===
function toggleAdminBtn() {
    adminBtn.classList.toggle('visible', localStorage.getItem('admin_logged_in') === 'true');
}
function openAdmin() { modal.style.display = 'flex'; }
function closeAdmin() { modal.style.display = 'none'; }
function checkPassword() {
    if (document.getElementById('admin-pass').value === ADMIN_PASSWORD) {
        localStorage.setItem('admin_logged_in', 'true');
        loginForm.style.display = 'none';
        adminPanel.style.display = 'block';
        renderItemList();
        toggleAdminBtn();
    } else alert('Falsches Passwort!');
}
function addItem() {
    const id = newItemInput.value.trim();
    if (id && !ITEM_IDS.includes(id)) {
        ITEM_IDS.push(id);
        saveItems();
        newItemInput.value = '';
        renderItemList();
        loadProducts();
    }
}
function removeItem(id) {
    ITEM_IDS = ITEM_IDS.filter(x => x !== id);
    saveItems();
    renderItemList();
    loadProducts();
}
function saveItems() { localStorage.setItem('pauls_thinkpad_ids', JSON.stringify(ITEM_IDS)); }
function renderItemList() {
    itemList.innerHTML = ITEM_IDS.length === 0
        ? '<p style="color:var(--text-muted);">Keine IDs</p>'
        : ITEM_IDS.map(id => `
            <div class="item-entry">
                <span><strong>${id}</strong></span>
                <button class="remove-btn" onclick="removeItem('${id}')">Löschen</button>
            </div>
        `).join('');
}

// === SPECS MODAL ===
function openSpecs(specs) {
    const content = document.getElementById('specs-content');
    content.innerHTML = specs.length > 0
        ? specs.map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`).join('')
        : '<em>Keine Specs verfügbar.</em>';
    specsModal.style.display = 'flex';
}
function closeSpecs() { specsModal.style.display = 'none'; }

// === SCRAPING + SPECS ===
async function fetchEbayItem(itemId) {
    try {
        const ebayUrl = `https://www.ebay.de/itm/${itemId}`;
        const proxyUrl = `${PROXY_URL}${encodeURIComponent(ebayUrl)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const title = doc.querySelector('h1')?.innerText.trim() || 'Unbekannt';
        const price = doc.querySelector('.ux-textspans, .notranslate')?.innerText.trim() || 'Preis?';

        // Bilder
        const images = Array.from(doc.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src.includes('s-l') && !src.includes('logo'))
            .slice(0, 5);

        // Beschreibung
        const descEl = doc.querySelector('#desc_div, .d-item-description');
        const description = descEl 
            ? descEl.innerText.replace(/\s+/g, ' ').trim().substring(0, 200) + '...'
            : 'Keine Beschreibung.';

        // SPECS: NameValueList aus eBay
        const specs = [];
        const specTables = doc.querySelectorAll('.ux-labels-values__labels, .itemAttr table');
        specTables.forEach(table => {
            const rows = table.querySelectorAll('tr, .ux-labels-values__row');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td, .ux-labels-values__labels, .ux-labels-values__values');
                if (cells.length >= 2) {
                    const key = cells[0].innerText.trim();
                    const value = cells[1].innerText.trim();
                    if (key && value && !key.includes(':')) specs.push([key, value]);
                }
            });
        });

        return {
            id: itemId,
            title, price,
            images: images.length ? images : ['https://via.placeholder.com/300x200/222/ccc?text=Kein+Bild'],
            description,
            specs,
            link: ebayUrl
        };
    } catch (e) {
        console.error('Scraping Fehler:', e);
        return { id: itemId, error: 'Ladefehler', link: `https://www.ebay.de/itm/${itemId}` };
    }
}

// === RENDER MIT SPECS-BUTTON ===
async function loadProducts() {
    productGrid.innerHTML = '<div class="loading">Lade ThinkPads...</div>';

    if (ITEM_IDS.length === 0) {
        productGrid.innerHTML = `<div class="error">Füge im Admin eine Item-ID hinzu!</div>`;
        return;
    }

    const items = await Promise.all(ITEM_IDS.map(fetchEbayItem));

    productGrid.innerHTML = items.map(item => {
        if (item.error) {
            return `<div class="product-card error-card"><p>${item.error}</p><a href="${item.link}" class="ebay-btn">eBay</a></div>`;
        }

        const gallery = item.images.map(src => `<img src="${src}" loading="lazy">`).join('');
        const hasSpecs = item.specs.length > 0;

        return `
            <div class="product-card fade-in">
                <span class="ebay-badge">eBay</span>
                <div class="product-gallery">${gallery}</div>
                <div class="product-info">
                    <h3>${item.title}</h3>
                    <div class="price">${item.price}</div>
                    <div class="description">${item.description}</div>
                    <div class="btn-group">
                        <a href="${item.link}" target="_blank" class="ebay-btn">Jetzt kaufen</a>
                        <button class="specs-btn" ${hasSpecs ? '' : 'disabled'} 
                                onclick='openSpecs(${JSON.stringify(item.specs)})'>
                            Specs
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Trigger Fade-In Animation
    document.querySelectorAll('.fade-in').forEach((el, i) => {
        el.style.animationDelay = `${i * 0.1}s`;
        el.classList.add('animate');
    });
}

// === THEME TOGGLE ===
function toggleTheme() {
    const body = document.body;
    const btn = document.querySelector('.toggle-btn');
    if (body.dataset.theme === 'dark') {
        body.dataset.theme = 'light';
        btn.textContent = 'Dark';
    } else {
        body.dataset.theme = 'dark';
        btn.textContent = 'Light';
    }
}

// === GEHEIMZUGRIFF ===
let logoClicks = 0;
document.querySelector('.logo').addEventListener('click', () => {
    if (++logoClicks === 5) {
        adminBtn.classList.add('visible');
        alert('Admin freigeschaltet!');
        logoClicks = 0;
    }
});

// === KEYBOARD SHORTCUT ===
document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.altKey && e.key === 'a') {
        e.preventDefault();
        openAdmin();
    }
});

// === INIT ===
toggleAdminBtn();
loadProducts();