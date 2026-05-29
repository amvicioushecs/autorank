import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://jvaikrgywkcgwzokoxuw.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRmNDFiZGJmLTBkMGMtNDljNi1hNzI0LWQ2MDNmMTk0MDMzNiJ9.eyJwcm9qZWN0SWQiOiJqdmFpa3JneXdrY2d3em9rb3h1dyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzgwMDQ1MDU0LCJleHAiOjIwOTU0MDUwNTQsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.aMF_JlCpe2Co3FczwyB16Qhy8N-ib9SQ-2pNbmGU8fQ';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };