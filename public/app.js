// DOM Elements
const authSection = document.getElementById('auth-section');
const mainSection = document.getElementById('main-section');
const logoutBtn = document.getElementById('logout-btn');
const addLinkForm = document.getElementById('add-link-form');
const urlInput = document.getElementById('url-input');
const addLoading = document.getElementById('add-loading');
const linksGrid = document.getElementById('links-grid');
const emptyState = document.getElementById('empty-state');
const linksLoading = document.getElementById('links-loading');
const bucketSidebar = document.getElementById('bucket-sidebar');
const mobileFilterBtn = document.getElementById('mobile-filter-btn');
const mobileFilterName = document.getElementById('mobile-filter-name');
const mobileBucketSheet = document.getElementById('mobile-bucket-sheet');

// State
let currentUser = null;
let buckets = [];
let currentBucketId = null; // null = "All Links"
let links = []; // Store links for count calculations
let isReloading = false; // Prevent multiple simultaneous reloads

// ============================================
// CLERK AUTH
// ============================================

async function getAuthHeaders() {
  const token = await window.Clerk.session?.getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function initClerk() {
  const clerk = window.Clerk;
  await clerk.load();

  if (clerk.user) {
    currentUser = clerk.user;
    showMainApp();
    await Promise.all([loadBuckets(), loadLinks()]);
    // Mount Clerk user button
    const userBtnEl = document.getElementById('clerk-user-btn');
    if (userBtnEl) clerk.mountUserButton(userBtnEl);
  } else {
    showAuth();
    clerk.mountSignIn(document.getElementById('clerk-sign-in'));
  }

  // Listen for auth changes
  clerk.addListener(async ({ user }) => {
    if (user) {
      currentUser = user;
      showMainApp();
      await Promise.all([loadBuckets(), loadLinks()]);
      const userBtnEl = document.getElementById('clerk-user-btn');
      if (userBtnEl && !userBtnEl.hasChildNodes()) {
        clerk.mountUserButton(userBtnEl);
      }
    } else {
      currentUser = null;
      buckets = [];
      links = [];
      currentBucketId = null;
      showAuth();
      clerk.mountSignIn(document.getElementById('clerk-sign-in'));
    }
  });
}

// UI State Functions
function showAuth() {
  authSection.style.display = 'block';
  mainSection.style.display = 'none';
}

function showMainApp() {
  authSection.style.display = 'none';
  mainSection.style.display = 'block';
}

async function handleLogout() {
  await window.Clerk.signOut();
  linksGrid.innerHTML = '';
  buckets = [];
  links = [];
  currentBucketId = null;
}

// ============================================
// BUCKET FUNCTIONS
// ============================================

async function loadBuckets() {
  try {
    const response = await fetch('/api/buckets', {
      headers: await getAuthHeaders(),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    buckets = data.buckets || [];
    renderBucketSidebar();
  } catch (err) {
    console.error('Failed to load buckets:', err);
  }
}

async function createBucket(name) {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  try {
    const response = await fetch('/api/buckets', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ name: trimmedName }),
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Failed to create bucket');
      return null;
    }

    buckets.push(data.bucket);
    buckets.sort((a, b) => a.name.localeCompare(b.name));
    renderBucketSidebar();
    return data.bucket;
  } catch (err) {
    console.error('Failed to create bucket:', err);
    return null;
  }
}

async function renameBucket(bucketId, newName) {
  const trimmedName = newName.trim();
  if (!trimmedName) return false;

  try {
    const response = await fetch(`/api/buckets/${bucketId}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ name: trimmedName }),
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Failed to rename bucket');
      return false;
    }

    const bucket = buckets.find(b => b.id === bucketId);
    if (bucket) bucket.name = trimmedName;
    buckets.sort((a, b) => a.name.localeCompare(b.name));
    renderBucketSidebar();
    return true;
  } catch (err) {
    console.error('Failed to rename bucket:', err);
    return false;
  }
}

async function deleteBucket(bucketId) {
  const bucket = buckets.find(b => b.id === bucketId);
  if (!bucket) return;

  if (!confirm(`Delete "${bucket.name}"? Links will become uncategorized.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/buckets/${bucketId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete');

    buckets = buckets.filter(b => b.id !== bucketId);

    // If viewing deleted bucket, switch to All Links
    if (currentBucketId === bucketId) {
      currentBucketId = null;
      loadLinks();
    }

    renderBucketSidebar();
  } catch (err) {
    console.error('Failed to delete bucket:', err);
    alert('Failed to delete bucket');
  }
}

async function assignLinkToBucket(linkId, bucketId) {
  try {
    const response = await fetch(`/api/links/${linkId}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ bucketId }),
    });

    if (!response.ok) throw new Error('Failed to update');

    // Update local state
    const link = links.find(l => l.id === linkId);
    if (link) {
      link.bucketId = bucketId;
    }

    renderBucketSidebar();

    // If filtering by bucket and link moved out, remove from view
    if (currentBucketId && bucketId !== currentBucketId) {
      const card = document.querySelector(`[data-id="${linkId}"]`);
      if (card) {
        card.classList.add('deleting');
        setTimeout(() => card.remove(), 300);
        setTimeout(() => {
          if (linksGrid.children.length === 0) {
            emptyState.style.display = 'block';
          }
        }, 350);
      }
    }

    closeAllDropdowns();
    return true;
  } catch (err) {
    console.error('Failed to assign link to bucket:', err);
    alert('Failed to update link');
    return false;
  }
}

function filterByBucket(bucketId) {
  currentBucketId = bucketId;
  loadLinks();
  renderBucketSidebar();
  updateMobileFilterName();
  closeMobileBucketSheet();
}

function getBucketLinkCount(bucketId) {
  if (bucketId === null) {
    return links.length;
  }
  return links.filter(l => String(l.bucketId) === String(bucketId)).length;
}

function renderBucketSidebar() {
  if (!bucketSidebar) return;

  const allLinksCount = links.length;

  bucketSidebar.innerHTML = `
    <div class="bucket-item ${currentBucketId === null ? 'active' : ''}" onclick="filterByBucket(null)">
      <span class="bucket-name">All Links</span>
      <span class="bucket-count">${allLinksCount}</span>
    </div>
    <div class="bucket-divider"></div>
    <div class="bucket-header">BUCKETS</div>
    ${buckets.map(bucket => `
      <div class="bucket-item ${String(currentBucketId) === String(bucket.id) ? 'active' : ''}" data-bucket-id="${bucket.id}">
        <span class="bucket-name" onclick="filterByBucket('${bucket.id}')">${escapeHtml(bucket.name)}</span>
        <span class="bucket-count">${getBucketLinkCount(bucket.id)}</span>
        <button class="bucket-menu-btn" onclick="event.stopPropagation(); showBucketContextMenu(event, '${bucket.id}')" title="Options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="6" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="18" r="2"/>
          </svg>
        </button>
      </div>
    `).join('')}
    <div class="new-bucket-section">
      <button class="new-bucket-btn" onclick="showNewBucketInput()">+ New Bucket</button>
      <div id="new-bucket-form" class="new-bucket-form" style="display: none;">
        <input type="text" id="new-bucket-input" placeholder="Bucket name..." maxlength="100">
        <div class="new-bucket-actions">
          <button class="btn-confirm" onclick="confirmNewBucket()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
          <button class="btn-cancel" onclick="cancelNewBucket()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  renderMobileBucketList();
}

function renderMobileBucketList() {
  const mobileList = document.getElementById('mobile-bucket-list');
  if (!mobileList) return;

  const allLinksCount = links.length;

  mobileList.innerHTML = `
    <div class="mobile-bucket-item ${currentBucketId === null ? 'active' : ''}" onclick="filterByBucket(null)">
      <span>All Links</span>
      <span class="bucket-count">${allLinksCount}</span>
    </div>
    ${buckets.map(bucket => `
      <div class="mobile-bucket-item ${String(currentBucketId) === String(bucket.id) ? 'active' : ''}" onclick="filterByBucket('${bucket.id}')">
        <span>${escapeHtml(bucket.name)}</span>
        <span class="bucket-count">${getBucketLinkCount(bucket.id)}</span>
      </div>
    `).join('')}
  `;
}

function updateMobileFilterName() {
  if (!mobileFilterName) return;

  if (currentBucketId === null) {
    mobileFilterName.textContent = 'All Links';
  } else {
    const bucket = buckets.find(b => b.id === currentBucketId);
    mobileFilterName.textContent = bucket ? bucket.name : 'All Links';
  }
}

function showNewBucketInput() {
  const form = document.getElementById('new-bucket-form');
  const btn = document.querySelector('.new-bucket-btn');
  if (form && btn) {
    btn.style.display = 'none';
    form.style.display = 'flex';
    document.getElementById('new-bucket-input').focus();
  }
}

function cancelNewBucket() {
  const form = document.getElementById('new-bucket-form');
  const btn = document.querySelector('.new-bucket-btn');
  const input = document.getElementById('new-bucket-input');
  if (form && btn) {
    form.style.display = 'none';
    btn.style.display = 'block';
    if (input) input.value = '';
  }
}

async function confirmNewBucket() {
  const input = document.getElementById('new-bucket-input');
  if (input && input.value.trim()) {
    await createBucket(input.value);
    cancelNewBucket();
  }
}

// Bucket context menu
let currentContextBucketId = null;

function showBucketContextMenu(event, bucketId) {
  event.stopPropagation();
  currentContextBucketId = bucketId;

  const menu = document.getElementById('bucket-context-menu');
  if (!menu) return;

  menu.style.display = 'block';
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;

  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - rect.width - 10}px`;
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - rect.height - 10}px`;
  }
}

function hideBucketContextMenu() {
  const menu = document.getElementById('bucket-context-menu');
  if (menu) {
    menu.style.display = 'none';
  }
  currentContextBucketId = null;
}

function startRenameBucket() {
  if (!currentContextBucketId) return;

  const bucket = buckets.find(b => b.id === currentContextBucketId);
  if (!bucket) return;

  const newName = prompt('Rename bucket:', bucket.name);
  if (newName && newName.trim() !== bucket.name) {
    renameBucket(currentContextBucketId, newName);
  }
  hideBucketContextMenu();
}

function confirmDeleteBucket() {
  if (!currentContextBucketId) return;
  deleteBucket(currentContextBucketId);
  hideBucketContextMenu();
}

// Mobile bucket sheet
function openMobileBucketSheet() {
  if (mobileBucketSheet) {
    mobileBucketSheet.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileBucketSheet() {
  if (mobileBucketSheet) {
    mobileBucketSheet.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ============================================
// BUCKET DROPDOWN ON CARDS
// ============================================

function createBucketDropdown(link) {
  const currentBucket = buckets.find(b => b.id === link.bucketId);
  const displayName = currentBucket ? currentBucket.name : 'No bucket';

  return `
    <div class="bucket-dropdown" data-link-id="${link.id}">
      <button class="bucket-dropdown-btn" onclick="event.preventDefault(); event.stopPropagation(); toggleBucketDropdown('${link.id}')">
        <svg class="bucket-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="bucket-dropdown-text">${escapeHtml(displayName)}</span>
        <svg class="dropdown-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="bucket-dropdown-menu" id="bucket-menu-${link.id}">
        <div class="bucket-option ${!link.bucketId ? 'selected' : ''}" onclick="event.preventDefault(); event.stopPropagation(); assignLinkToBucket('${link.id}', null)">
          No bucket
        </div>
        ${buckets.map(b => `
          <div class="bucket-option ${String(b.id) === String(link.bucketId) ? 'selected' : ''}" onclick="event.preventDefault(); event.stopPropagation(); assignLinkToBucket('${link.id}', '${b.id}')">
            ${escapeHtml(b.name)}
          </div>
        `).join('')}
        <div class="bucket-option bucket-option-new" onclick="event.preventDefault(); event.stopPropagation(); createBucketFromDropdown('${link.id}')">
          + Create new bucket
        </div>
      </div>
    </div>
  `;
}

function toggleBucketDropdown(linkId) {
  const menu = document.getElementById(`bucket-menu-${linkId}`);
  if (!menu) return;

  const isOpen = menu.classList.contains('open');
  const card = menu.closest('.link-card');

  closeAllDropdowns();

  if (!isOpen) {
    menu.classList.add('open');
    if (card) card.style.zIndex = '1000';
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.bucket-dropdown-menu.open').forEach(menu => {
    menu.classList.remove('open');
    const card = menu.closest('.link-card');
    if (card) card.style.zIndex = '';
  });
}

async function createBucketFromDropdown(linkId) {
  const name = prompt('New bucket name:');
  if (name && name.trim()) {
    const bucket = await createBucket(name);
    if (bucket) {
      await assignLinkToBucket(linkId, bucket.id);
      loadLinks();
    }
  }
}

// ============================================
// LINK FUNCTIONS
// ============================================

async function fetchMetadata(url) {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();
    const html = data.contents;

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const title = doc.querySelector('title')?.textContent?.trim() ||
                  doc.querySelector('meta[property="og:title"]')?.content?.trim() ||
                  url;
    const ogImage = doc.querySelector('meta[property="og:image"]')?.content ||
                    doc.querySelector('meta[name="twitter:image"]')?.content ||
                    null;

    return { title, ogImage };
  } catch (err) {
    console.error('Failed to fetch metadata:', err);
    return { title: url, ogImage: null };
  }
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getFallbackImage(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString();
}

function createLinkCard(link) {
  const card = document.createElement('div');
  card.className = 'link-card';
  card.dataset.id = link.id;

  const imageUrl = link.imageUrl || getFallbackImage(link.domain);

  card.innerHTML = `
    <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="card-link">
      <div class="card-image">
        <img src="${imageUrl}" alt="" onerror="this.src='${getFallbackImage(link.domain)}'">
      </div>
      <div class="card-content">
        <h3 class="card-title">${escapeHtml(link.title || link.url)}</h3>
        <span class="card-domain">${escapeHtml(link.domain)}</span>
      </div>
      <span class="card-date">${formatTimeAgo(link.createdAt)}</span>
    </a>
    <div class="card-actions">
      ${createBucketDropdown(link)}
      <button class="delete-btn" title="Delete" onclick="deleteLink('${link.id}', this.closest('.link-card'))">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>
    </div>
  `;

  return card;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadLinks() {
  linksLoading.style.display = 'block';
  emptyState.style.display = 'none';
  linksGrid.innerHTML = '';

  try {
    const response = await fetch('/api/links', {
      headers: await getAuthHeaders(),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    links = data.links || [];

    // Filter for display
    let displayLinks = links;
    if (currentBucketId !== null) {
      displayLinks = links.filter(l => String(l.bucketId) === String(currentBucketId));
    }

    if (displayLinks.length === 0) {
      emptyState.style.display = 'block';
      if (currentBucketId !== null) {
        emptyState.querySelector('p').textContent = 'No links in this bucket';
        emptyState.querySelector('.subtle').textContent = 'Assign links from the main feed';
      } else {
        emptyState.querySelector('p').textContent = 'No saved links yet';
        emptyState.querySelector('.subtle').textContent = 'Paste a URL above to get started';
      }
    } else {
      displayLinks.forEach(link => {
        linksGrid.appendChild(createLinkCard(link));
      });
    }

    renderBucketSidebar();
    updateMobileFilterName();

  } catch (err) {
    console.error('Failed to load links:', err);
  }

  linksLoading.style.display = 'none';
}

async function addLink(e) {
  e.preventDefault();

  const url = urlInput.value.trim();
  if (!url) return;

  try {
    new URL(url);
  } catch {
    alert('Please enter a valid URL');
    return;
  }

  addLoading.style.display = 'block';
  urlInput.disabled = true;
  document.getElementById('add-btn').disabled = true;

  try {
    const domain = extractDomain(url);
    const { title, ogImage } = await fetchMetadata(url);

    const response = await fetch('/api/links', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        url: url,
        title: title,
        imageUrl: ogImage,
        domain: domain,
      }),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    links.unshift(data.link);

    if (currentBucketId === null) {
      emptyState.style.display = 'none';
      linksGrid.insertBefore(createLinkCard(data.link), linksGrid.firstChild);
    }

    urlInput.value = '';
    renderBucketSidebar();

    // Call AI to auto-categorize (async, don't wait)
    categorizeWithAI(data.link.id, title, domain, url);

  } catch (err) {
    console.error('Failed to add link:', err);
    alert('Failed to save link. Please try again.');
  }

  addLoading.style.display = 'none';
  urlInput.disabled = false;
  document.getElementById('add-btn').disabled = false;
  urlInput.focus();
}

// ============================================
// AI AUTO-CATEGORIZATION
// ============================================

async function categorizeWithAI(linkId, title, domain, url) {
  try {
    const response = await fetch('/api/categorize', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ linkId, title, domain, url }),
    });

    const result = await response.json();

    if (result.success && result.bucketId) {
      console.log(`AI categorized link into: ${result.bucketName}`);

      const link = links.find(l => l.id === linkId);
      if (link) {
        link.bucketId = result.bucketId;
      }

      // Check if this is a new bucket we don't have locally
      if (!buckets.find(b => b.id === result.bucketId)) {
        await loadBuckets();
      }

      renderBucketSidebar();

      const card = document.querySelector(`[data-id="${linkId}"]`);
      if (card) {
        const dropdownBtn = card.querySelector('.bucket-dropdown-text');
        if (dropdownBtn) {
          dropdownBtn.textContent = result.bucketName;
        }
      }
    }
  } catch (err) {
    console.error('AI categorization failed:', err);
  }
}

async function deleteLink(id, cardElement) {
  cardElement.classList.add('deleting');

  try {
    const response = await fetch(`/api/links/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!response.ok) throw new Error('Failed to delete');

    links = links.filter(l => l.id !== id);
    cardElement.remove();

    if (linksGrid.children.length === 0) {
      emptyState.style.display = 'block';
    }

    renderBucketSidebar();

  } catch (err) {
    console.error('Failed to delete link:', err);
    cardElement.classList.remove('deleting');
    alert('Failed to delete. Please try again.');
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

logoutBtn.addEventListener('click', handleLogout);
addLinkForm.addEventListener('submit', addLink);

if (mobileFilterBtn) {
  mobileFilterBtn.addEventListener('click', openMobileBucketSheet);
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.bucket-dropdown')) {
    closeAllDropdowns();
  }
  if (!e.target.closest('.bucket-context-menu') && !e.target.closest('.bucket-menu-btn')) {
    hideBucketContextMenu();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'new-bucket-input') {
    confirmNewBucket();
  }
  if (e.key === 'Escape') {
    cancelNewBucket();
    closeAllDropdowns();
    hideBucketContextMenu();
    closeMobileBucketSheet();
  }
});

// Reload data after bfcache restore
async function reloadAfterRestore() {
  if (isReloading) return;
  isReloading = true;

  try {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (window.Clerk?.user) {
      currentUser = window.Clerk.user;
      await Promise.all([loadBuckets(), loadLinks()]);
    } else {
      currentUser = null;
      showAuth();
    }
  } catch (err) {
    console.error('Error during reload:', err);
  } finally {
    isReloading = false;
  }
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    reloadAfterRestore();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentUser) {
    const gridEmpty = linksGrid.children.length === 0;
    const loadingVisible = linksLoading.style.display === 'block';
    if (gridEmpty || loadingVisible) {
      reloadAfterRestore();
    }
  }
});

window.addEventListener('focus', () => {
  if (currentUser && linksGrid.children.length === 0 && mainSection.style.display !== 'none') {
    reloadAfterRestore();
  }
});

// ============================================
// INITIALIZE - Wait for Clerk
// ============================================

function waitForClerk() {
  if (window.Clerk) {
    initClerk();
  } else {
    const check = setInterval(() => {
      if (window.Clerk) {
        clearInterval(check);
        initClerk();
      }
    }, 100);
  }
}

window.addEventListener('load', waitForClerk);
