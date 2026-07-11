import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ighxnnjebtsgpnhnkqoo.supabase.co';
const supabaseAnonKey = 'sb_publishable_JICuNYwik0lbpkriSWbz1A_Vfgfr0XB';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('Attempting to insert a row into table_sessions...');

  // Use table id from table 1
  const tableId = '7c525c26-ba98-43c8-a6ab-69cf6b7db534';
  const anonymousId = 'test-anonymous-id-' + Math.random().toString(36).substring(7);
  const deviceInfo = { userAgent: 'test-device' };

  const { data, error } = await supabase
    .from('table_sessions')
    .insert({
      table_id: tableId,
      anonymous_id: anonymousId,
      status: 'active',
      device_info: deviceInfo,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Insert failed with error:', error);
  } else {
    console.log('Insert successful! Session data:', data);
  }
}

testInsert();
