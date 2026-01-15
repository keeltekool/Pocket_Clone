const SUPABASE_URL = 'https://dorecfpibaftmodozltd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmVjZnBpYmFmdG1vZG96bHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzQ0MjEsImV4cCI6MjA4MzYxMDQyMX0.D34KYMz-_N8yXYe4qjRsGPEpJibM-B6tUpz4UNU0GRc';

let supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Recreate client (used after bfcache restore)
function recreateSupabaseClient() {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}
