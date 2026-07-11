import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ighxnnjebtsgpnhnkqoo.supabase.co';
const supabaseAnonKey = 'sb_publishable_JICuNYwik0lbpkriSWbz1A_Vfgfr0XB';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key length:', supabaseAnonKey.length);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQueries() {
  console.log('\n--- Querying categories table ---');
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*');
  
  if (catError) {
    console.error('Categories error:', catError);
  } else {
    console.log(`Categories count: ${categories?.length}`);
    console.log('Categories:', categories);
  }

  console.log('\n--- Querying dishes table (simple) ---');
  const { data: dishesSimple, error: dishSimpleError } = await supabase
    .from('dishes')
    .select('*');
  
  if (dishSimpleError) {
    console.error('Dishes (simple) error:', dishSimpleError);
  } else {
    console.log(`Dishes (simple) count: ${dishesSimple?.length}`);
    console.log('Dishes (simple):', dishesSimple);
  }

  console.log('\n--- Querying dishes table (complex) ---');
  const { data: dishesComplex, error: dishComplexError } = await supabase
    .from('dishes')
    .select('*, extras(*), category:categories(name)');
  
  if (dishComplexError) {
    console.error('Dishes (complex) error:', dishComplexError);
  } else {
    console.log(`Dishes (complex) count: ${dishesComplex?.length}`);
  }

  console.log('\n--- Querying tables table ---');
  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .select('*');
  
  if (tablesError) {
    console.error('Tables error:', tablesError);
  } else {
    console.log(`Tables count: ${tables?.length}`);
    console.log('Tables:', tables);
  }
}

testQueries();
