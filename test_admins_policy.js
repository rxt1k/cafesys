import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ighxnnjebtsgpnhnkqoo.supabase.co';
const supabaseAnonKey = 'sb_publishable_JICuNYwik0lbpkriSWbz1A_Vfgfr0XB';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tempEmail = `temp_test_${Date.now()}@example.com`;
const tempPassword = 'password123';

async function testAdminsPolicy() {
  console.log(`Registering temporary user: ${tempEmail}`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: tempEmail,
    password: tempPassword,
  });

  if (signUpError) {
    console.error('Sign up failed:', signUpError);
    return;
  }

  const userId = signUpData.user?.id;
  console.log('Sign up successful! User ID:', userId);

  // Sign in to establish session
  console.log('Signing in...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: tempEmail,
    password: tempPassword,
  });

  if (signInError) {
    console.error('Sign in failed:', signInError);
    return;
  }

  console.log('Sign in successful! Active session user ID:', signInData.session?.user?.id);

  // Now query the admins table
  console.log('\n--- Querying admins table as authenticated user ---');
  const { data: admins, error: adminsError } = await supabase
    .from('admins')
    .select('*');
  
  if (adminsError) {
    console.error('Admins query error:', adminsError);
  } else {
    console.log(`Admins query successful! Count: ${admins?.length}`);
    console.log('Admins data:', admins);
  }

  // Clean up: delete user? We don't have admin client, but it's fine to leave a temp user in auth.
}

testAdminsPolicy();
