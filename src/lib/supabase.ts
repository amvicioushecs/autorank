import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://jcecbgjqlcbjpljmiuib.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIwNjg3YjQzLWVhYWEtNGJhMS1iZTM2LTFlODQ0ODRjN2ViNiJ9.eyJwcm9qZWN0SWQiOiJqY2VjYmdqcWxjYmpwbGptaXVpYiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgwMDY2OTQzLCJleHAiOjIwOTU0MjY5NDMsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.0jg8mB8g7Dv3L_wra4OMsM-Zc51xXtZU-xyx27TKKiM';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };