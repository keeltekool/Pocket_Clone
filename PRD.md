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
| Organization | **Buckets** - named collections for categorization |
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

### App Layout (Desktop)
```
┌──────────────────────────────────────────────────────────────┐
│  Pocket Clone                                     [Logout]   │
├────────────────┬─────────────────────────────────────────────┤
│  SIDEBAR       │  MAIN CONTENT                               │
│  ┌──────────┐  │  ┌─────────────────────────────────────────┐│
│  │All Links │  │  │ [URL Input]              [Save Button] ││
│  └──────────┘  │  └─────────────────────────────────────────┘│
│  ───────────   │                                             │
│  BUCKETS       │  ┌─────────────────────────────────────────┐│
│  ┌──────────┐  │  │ [Link Card]  [Bucket ▼] [Delete]       ││
│  │Work    (5)│  │  │ [Link Card]  [Bucket ▼] [Delete]       ││
│  │Read   (12)│  │  │ [Link Card]  [Bucket ▼] [Delete]       ││
│  └──────────┘  │  └─────────────────────────────────────────┘│
│  [+ New Bucket]│                                             │
└────────────────┴─────────────────────────────────────────────┘
```

### Link Card Layout
```
┌─────────────────────────────────────────────────────────────┐
│ ┌───────────┐                                               │
│ │           │  Article Title Here                           │
│ │  og:image │  domain.com          [📁 Bucket ▼] [🗑]      │
│ │ thumbnail │  Saved 2 hours ago                            │
│ └───────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

- **Mobile**: Sidebar hidden, filter dropdown at top, bottom sheet for bucket selection
- **Desktop**: Two-column layout with persistent sidebar
- **Fallback image**: If no og:image, use favicon via Google's service

---

## File Structure

```
Pocket_Clone/
├── index.html              # Single page app with sidebar layout
├── style.css               # Literary minimalism styling + bucket UI
├── app.js                  # Main application logic + bucket management
├── save.html               # iOS shortcut quick-save page
├── shortcut.html           # iOS shortcut installation guide
├── supabase-config.js      # Supabase credentials (gitignored!)
├── supabase-config.example.js  # Template for config
├── PRD.md                  # This document
└── .gitignore
```

---

## Database Schema (Supabase)

### Table: `buckets`

```sql
CREATE TABLE public.buckets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT buckets_user_name_unique UNIQUE (user_id, name)
);

-- Enable RLS
ALTER TABLE public.buckets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own buckets" ON public.buckets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own buckets" ON public.buckets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own buckets" ON public.buckets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own buckets" ON public.buckets FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_buckets_user_id ON public.buckets(user_id);
```

### Table: `links`

```sql
CREATE TABLE links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  image_url TEXT,
  domain TEXT,
  bucket_id UUID REFERENCES public.buckets(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Policies (users can only access their own links)
CREATE POLICY "Users view own links" ON links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own links" ON links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own links" ON links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own links" ON links
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX links_user_id_idx ON links(user_id);
CREATE INDEX links_created_at_idx ON links(created_at DESC);
CREATE INDEX idx_links_bucket_id ON links(bucket_id);
```

### Migration: Add bucket_id to existing links table

If you already have the `links` table, run this to add bucket support:

```sql
ALTER TABLE public.links
ADD COLUMN bucket_id UUID REFERENCES public.buckets(id) ON DELETE SET NULL;

CREATE INDEX idx_links_bucket_id ON public.links(bucket_id);
```

---

## Buckets Feature

### Overview
Buckets are named collections that allow users to organize their saved links. New links always start uncategorized and can be assigned to buckets later.

### Key Behaviors
| Behavior | Description |
|----------|-------------|
| New links | Always saved with `bucket_id = null` (uncategorized) |
| All Links view | Shows all links regardless of bucket |
| Bucket view | Shows only links in that specific bucket |
| Delete bucket | Links become uncategorized (not deleted) |
| Bucket names | Must be unique per user |

### Bucket Management
- **Create**: Click "+ New Bucket" in sidebar, enter name
- **Rename**: Right-click bucket → Rename (or use context menu)
- **Delete**: Right-click bucket → Delete (confirmation required)

### Assigning Links to Buckets
- Each link card has a bucket dropdown selector
- Click dropdown to see all buckets + "No bucket" option
- Can create new bucket directly from dropdown
- When viewing a bucket, assigning a link to a different bucket removes it from current view

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

### Step 3: Create Database Tables
1. Go to **SQL Editor**
2. Paste and run the SQL from "Database Schema" section above
3. Run the `buckets` table SQL first, then `links` table

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
  domain: extractDomain(url),
  bucket_id: null // New links always uncategorized
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

### Create Bucket
```javascript
await supabaseClient.from('buckets').insert({
  user_id: currentUser.id,
  name: bucketName
});
```

### Assign Link to Bucket
```javascript
await supabaseClient.from('links')
  .update({ bucket_id: bucketId })
  .eq('id', linkId);
```

---

## Verification Checklist

### Core Functionality
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

### Buckets Feature
- [ ] Can create bucket with unique name
- [ ] Can rename bucket
- [ ] Can delete bucket (links become uncategorized)
- [ ] Can assign link to bucket via dropdown
- [ ] Can remove link from bucket (set to "No bucket")
- [ ] "All Links" filter shows all links
- [ ] Bucket filter shows only bucket's links
- [ ] New links appear uncategorized
- [ ] Mobile filter dropdown works
- [ ] save.html still works (uncategorized saves)

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
- Buckets feature added January 2026
