import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ighxnnjebtsgpnhnkqoo.supabase.co';
const supabaseAnonKey = 'sb_publishable_JICuNYwik0lbpkriSWbz1A_Vfgfr0XB';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnon() {
  console.log('Attempting anonymous sign in...');
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
  
  if (authError) {
    console.error('Anonymous sign in failed:', authError);
  } else {
    console.log('Anonymous sign in successful!', authData.session?.user?.id);
    
    // Set token
    console.log('\n--- Querying categories table after anon login ---');
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*');
    
    if (catError) {
      console.error('Categories error:', catError);
    } else {
      console.log(`Categories count: ${categories?.length}`);
      console.log('Categories:', categories);
    }

    console.log('\n--- Querying dishes table after anon login ---');
    const { data: dishes, error: dishError } = await supabase
      .from('dishes')
      .select('*, extras(*), category:categories(name)');
    
    if (dishError) {
      console.error('Dishes error:', dishError);
    } else {
      console.log(`Dishes count: ${dishes?.length}`);
      console.log('Dishes:', dishes);
    }
  }
}

testAnon();
