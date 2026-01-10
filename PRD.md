# Pocket Clone - Product Requirements Document

## Overview

**Pocket Clone** is a simple web app to save URLs for later reading, with visual thumbnails like Pocket/Raindrop.

**Repository**: https://github.com/keeltekool/Pocket_Clone
**Local Path**: `C:\Users\Kasutaja\Claude_Projects\Pocket_Clone`

---

## User Requirements (Confirmed)

| Feature | Decision |
|---------|----------|
| Adding links | Manual paste only (input field) |
| Link display | URL + Title + **Thumbnail image** (og:image) |
| Organization | None - simple chronological list |
| Read status | None - save or delete only |
| Title | Auto-fetch from page |
| Delete | Immediate (no confirmation dialog) |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend/Auth | Supabase (Auth + PostgreSQL) |
| Hosting | GitHub Pages |

---

## UI Design

### Link Card Layout
```
┌─────────────────────────────────────────┐
│ ┌───────────┐                           │
│ │           │  Article Title Here       │
│ │  og:image │  domain.com               │
│ │ thumbnail │  Saved 2 hours ago    [🗑] │
│ └───────────┘                           │
└─────────────────────────────────────────┘
```

- **Mobile**: Cards stack vertically
- **Desktop**: 2-3 column responsive grid
- **Fallback image**: If no og:image, use favicon via Google's service

---

## File Structure

```
Pocket_Clone/
├── index.html              # Single page app
├── style.css               # Pocket-like styling
├── app.js                  # Main application logic
├── supabase-config.js      # Supabase credentials (gitignored!)
├── supabase-config.example.js  # Template for config
├── PRD.md                  # This document
└── .gitignore
```

---

## Database Schema (Supabase)

### Table: `links`

```sql
CREATE TABLE links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  image_url TEXT,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Policies (users can only access their own links)
CREATE POLICY "Users view own links" ON links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own links" ON links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own links" ON links
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX links_user_id_idx ON links(user_id);
CREATE INDEX links_created_at_idx ON links(created_at DESC);
```

---

## Supabase Setup Guide

### Step 1: Create Project
1. Go to https://supabase.com
2. Sign in / Create account
3. Click "New Project"
4. Name: `pocket-clone`
5. Set database password (save it!)
6. Select region closest to you
7. Wait for project to spin up (~2 min)

### Step 2: Get API Credentials
1. Go to **Project Settings → API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (the long one under "Project API keys")

### Step 3: Create Links Table
1. Go to **SQL Editor**
2. Paste and run the SQL from "Database Schema" section above

### Step 4: Configure Auth (Optional)
1. Go to **Authentication → Providers** - Email should be enabled
2. To skip email confirmation for testing:
   - Go to **Authentication → Settings**
   - Turn off "Enable email confirmations"

### Step 5: Create Config File
Create `supabase-config.js` in project root:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## Technical Implementation Details

### Fetching Page Metadata (Title + Thumbnail)

When user saves a URL, we need to fetch the page to extract:
- `<title>` tag for the title
- `<meta property="og:image">` for the thumbnail

**CORS Problem**: Browsers block cross-origin requests.
**Solution**: Use a CORS proxy service.

```javascript
async function fetchMetadata(url) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  const data = await response.json();
  const html = data.contents;

  // Parse HTML
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const title = doc.querySelector('title')?.textContent?.trim() || url;
  const ogImage = doc.querySelector('meta[property="og:image"]')?.content || null;

  return { title, ogImage };
}
```

### Fallback Image (when no og:image)

```javascript
function getFallbackImage(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
```

### Extract Domain from URL

```javascript
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}
```

---

## API Operations (Supabase)

### Insert Link
```javascript
await supabaseClient.from('links').insert({
  user_id: currentUser.id,
  url: url,
  title: title,
  image_url: imageUrl,
  domain: extractDomain(url)
});
```

### Fetch User's Links
```javascript
const { data } = await supabaseClient
  .from('links')
  .select('*')
  .eq('user_id', currentUser.id)
  .order('created_at', { ascending: false });
```

### Delete Link
```javascript
await supabaseClient.from('links').delete().eq('id', linkId);
```

---

## Implementation Phases

### Phase 1: Project Setup
- [ ] Create `.gitignore`
- [ ] Create `supabase-config.example.js` template
- [ ] Create `index.html` with basic structure
- [ ] Add Supabase JS library via CDN

### Phase 2: Supabase Setup (User)
- [ ] Create Supabase project
- [ ] Run SQL to create table + policies
- [ ] Get API credentials
- [ ] Create `supabase-config.js`

### Phase 3: Authentication
- [ ] Login/signup form
- [ ] Handle auth with Supabase
- [ ] Session persistence
- [ ] Logout functionality

### Phase 4: Core Functionality
- [ ] Add link form (URL input)
- [ ] Fetch page metadata (title + og:image)
- [ ] Save links to database
- [ ] Display links with thumbnails
- [ ] Delete links

### Phase 5: Styling
- [ ] Pocket-like card design
- [ ] Responsive grid layout
- [ ] Loading states
- [ ] Empty state (no links yet)

### Phase 6: Deploy
- [ ] Push to GitHub
- [ ] Enable GitHub Pages
- [ ] Test live version

---

## Verification Checklist

- [ ] Can signup with email/password
- [ ] Can login with existing account
- [ ] Session persists on page refresh
- [ ] Can logout
- [ ] Can paste URL and save
- [ ] Title auto-fetches correctly
- [ ] Thumbnail shows (or fallback)
- [ ] Links display in list
- [ ] Can delete links
- [ ] Works on mobile browser

---

## Dependencies

- **Supabase JS v2** (via CDN): `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- No other external libraries
- Pure vanilla JavaScript

---

## Notes

- Architecture similar to PicMachine project (same Supabase patterns)
- Keep it minimal - personal tool, not enterprise software
- Focus on reliability over features
