// Copy this file to supabase-config.js and fill in your credentials
// Get these from: Supabase Dashboard → Project Settings → API

const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
