import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ighxnnjebtsgpnhnkqoo.supabase.co';
const supabaseAnonKey = 'sb_publishable_JICuNYwik0lbpkriSWbz1A_Vfgfr0XB';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const email = 'editzritik42@gmail.com';
const passwords = [
  'admin123',
  'admin12345',
  'password',
  '123456',
  '12345678',
  'cafe123',
  'cafeadmin',
  'admin',
];

async function tryLogins() {
  for (const password of passwords) {
    console.log(`Trying password: ${password}`);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      console.log(`SUCCESS! Password is: ${password}`);
      console.log('User object:', data.user);
      console.log('Session object:', data.session);
      
      // Now query admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*');
      
      console.log('Admin data:', adminData);
      console.log('Admin query error:', adminError);
      return;
    } else {
      console.log(`Failed: ${error.message}`);
    }
  }
  console.log('All passwords failed.');
}

tryLogins();
