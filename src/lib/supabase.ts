import { createClient } from '@supabase/supabase-js';

// Configure via VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (see .env.example).
// The fallbacks are the existing public (anon) project values so current deploys keep working;
// remove them once every environment sets the env vars.
const FALLBACK_URL = 'https://jcecbgjqlcbjpljmiuib.databasepad.com';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIwNjg3YjQzLWVhYWEtNGJhMS1iZTM2LTFlODQ0ODRjN2ViNiJ9.eyJwcm9qZWN0SWQiOiJqY2VjYmdqcWxjYmpwbGptaXVpYiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgwMDY2OTQzLCJleHAiOjIwOTU0MjY5NDMsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.0jg8mB8g7Dv3L_wra4OMsM-Zc51xXtZU-xyx27TKKiM';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
