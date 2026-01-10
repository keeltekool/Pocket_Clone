// DOM Elements
const authSection = document.getElementById('auth-section');
const mainSection = document.getElementById('main-section');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const toggleAuthLink = document.getElementById('toggle-auth');
const authModeText = document.getElementById('auth-mode-text');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');
const addLinkForm = document.getElementById('add-link-form');
const urlInput = document.getElementById('url-input');
const addLoading = document.getElementById('add-loading');
const linksGrid = document.getElementById('links-grid');
const emptyState = document.getElementById('empty-state');
const linksLoading = document.getElementById('links-loading');

// State
let isLoginMode = true;
let currentUser = null;

// Initialize app
async function init() {
  // Check for existing session
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    currentUser = session.user;
    showMainApp();
    loadLinks();
  } else {
    showAuth();
  }

  // Listen for auth changes
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
      currentUser = session.user;
      showMainApp();
      loadLinks();
    } else {
      currentUser = null;
      showAuth();
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

function showError(message) {
  authError.textContent = message;
  authError.style.display = 'block';
}

function clearError() {
  authError.textContent = '';
  authError.style.display = 'none';
}

// Auth Functions
function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    authBtn.textContent = 'Login';
    authModeText.textContent = "Don't have an account?";
    toggleAuthLink.textContent = 'Sign up';
  } else {
    authBtn.textContent = 'Sign up';
    authModeText.textContent = 'Already have an account?';
    toggleAuthLink.textContent = 'Login';
  }
  clearError();
}

async function handleAuth(e) {
  e.preventDefault();
  clearError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  authBtn.disabled = true;
  authBtn.textContent = isLoginMode ? 'Logging in...' : 'Signing up...';

  try {
    let result;
    if (isLoginMode) {
      result = await supabaseClient.auth.signInWithPassword({ email, password });
    } else {
      result = await supabaseClient.auth.signUp({ email, password });
    }

    if (result.error) {
      showError(result.error.message);
    } else if (!isLoginMode && result.data?.user && !result.data?.session) {
      // Signup succeeded but email confirmation required
      showError('Check your email to confirm your account!');
    }
  } catch (err) {
    console.error('Auth error:', err);
    showError(err.message || 'An error occurred. Please try again.');
  }

  authBtn.disabled = false;
  authBtn.textContent = isLoginMode ? 'Login' : 'Sign up';
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  linksGrid.innerHTML = '';
}

// Link Functions
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
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
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
  const card = document.createElement('a');
  card.className = 'link-card';
  card.href = link.url;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.dataset.id = link.id;

  const imageUrl = link.image_url || getFallbackImage(link.domain);

  card.innerHTML = `
    <div class="card-image">
      <img src="${imageUrl}" alt="" onerror="this.src='${getFallbackImage(link.domain)}'">
    </div>
    <div class="card-content">
      <h3 class="card-title">${escapeHtml(link.title || link.url)}</h3>
      <span class="card-domain">${escapeHtml(link.domain)}</span>
      <span class="card-time">${formatTimeAgo(link.created_at)}</span>
    </div>
    <button class="delete-btn" title="Delete">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      </svg>
    </button>
  `;

  // Prevent link click when clicking delete
  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteLink(link.id, card);
  });

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
    const { data, error } = await supabaseClient
      .from('links')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data.length === 0) {
      emptyState.style.display = 'block';
    } else {
      data.forEach(link => {
        linksGrid.appendChild(createLinkCard(link));
      });
    }
  } catch (err) {
    console.error('Failed to load links:', err);
  }

  linksLoading.style.display = 'none';
}

async function addLink(e) {
  e.preventDefault();

  const url = urlInput.value.trim();
  if (!url) return;

  // Basic URL validation
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

    const { data, error } = await supabaseClient
      .from('links')
      .insert({
        user_id: currentUser.id,
        url: url,
        title: title,
        image_url: ogImage,
        domain: domain
      })
      .select()
      .single();

    if (error) throw error;

    // Add new card to top of grid
    emptyState.style.display = 'none';
    linksGrid.insertBefore(createLinkCard(data), linksGrid.firstChild);
    urlInput.value = '';

  } catch (err) {
    console.error('Failed to add link:', err);
    alert('Failed to save link. Please try again.');
  }

  addLoading.style.display = 'none';
  urlInput.disabled = false;
  document.getElementById('add-btn').disabled = false;
  urlInput.focus();
}

async function deleteLink(id, cardElement) {
  // Immediate visual feedback
  cardElement.classList.add('deleting');

  try {
    const { error } = await supabaseClient
      .from('links')
      .delete()
      .eq('id', id);

    if (error) throw error;

    cardElement.remove();

    // Show empty state if no links left
    if (linksGrid.children.length === 0) {
      emptyState.style.display = 'block';
    }
  } catch (err) {
    console.error('Failed to delete link:', err);
    cardElement.classList.remove('deleting');
    alert('Failed to delete. Please try again.');
  }
}

// Event Listeners
toggleAuthLink.addEventListener('click', (e) => {
  e.preventDefault();
  toggleAuthMode();
});
authForm.addEventListener('submit', handleAuth);
logoutBtn.addEventListener('click', handleLogout);
addLinkForm.addEventListener('submit', addLink);

// Show/hide password toggle
document.getElementById('show-password-toggle').addEventListener('change', (e) => {
  passwordInput.type = e.target.checked ? 'text' : 'password';
});

// Start app
init();
