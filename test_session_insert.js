import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ighxnnjebtsgpnhnkqoo.supabase.co';
const supabaseAnonKey = 'sb_publishable_JICuNYwik0lbpkriSWbz1A_Vfgfr0XB';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tableId = '7c525c26-ba98-43c8-a6ab-69cf6b7db534';
const anonymousId = 'test-anon-12345';

async function testInserts() {
  const tests = [
    {
      name: 'With device_info',
      data: {
        table_id: tableId,
        anonymous_id: anonymousId,
        status: 'active',
        device_info: { test: true },
        started_at: new Date().toISOString(),
      }
    },
    {
      name: 'Minimal insert (only table_id and anonymous_id)',
      data: {
        table_id: tableId,
        anonymous_id: anonymousId,
      }
    },
    {
      name: 'Without status',
      data: {
        table_id: tableId,
        anonymous_id: anonymousId,
        device_info: {},
      }
    },
  ];

  for (const t of tests) {
    console.log(`Testing: ${t.name}`);
    const { data, error } = await supabase
      .from('table_sessions')
      .insert(t.data)
      .select();
    
    if (error) {
      console.log(`Failed: ${error.message} (${error.code})`);
    } else {
      console.log('SUCCESS!', data);
    }
  }
}

testInserts();
