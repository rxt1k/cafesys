import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ighxnnjebtsgpnhnkqoo.supabase.co';
const supabaseAnonKey = 'sb_publishable_JICuNYwik0lbpkriSWbz1A_Vfgfr0XB';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPolicies() {
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*');
  
  if (error) {
    console.error('Failed to query pg_policies:', error);
  } else {
    console.log('pg_policies:', data);
  }
}

testPolicies();
