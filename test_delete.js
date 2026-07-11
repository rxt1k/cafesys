import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ighxnnjebtsgpnhnkqoo.supabase.co';
const supabaseAnonKey = 'sb_publishable_JICuNYwik0lbpkriSWbz1A_Vfgfr0XB';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDelete() {
  // Let's create a temporary table first, then try to delete it
  console.log('--- Creating temporary table ---');
  const { data: tempTable, error: createError } = await supabase
    .from('tables')
    .insert({
      table_number: 99,
      capacity: 4,
      status: 'free',
      is_active: true,
    })
    .select()
    .single();

  if (createError) {
    console.error('Failed to create temporary table:', createError);
    return;
  }
  console.log('Created temporary table:', tempTable);

  console.log('\n--- Attempting to delete temporary table directly ---');
  const { data: deleteData, error: deleteError } = await supabase
    .from('tables')
    .delete()
    .eq('id', tempTable.id);

  if (deleteError) {
    console.error('Failed to delete table directly:', deleteError);
  } else {
    console.log('Successfully deleted table directly!', deleteData);
  }
}

testDelete();
