import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ighxnnjebtsgpnhnkqoo.supabase.co';
const supabaseAnonKey = 'sb_publishable_JICuNYwik0lbpkriSWbz1A_Vfgfr0XB';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealtime() {
  console.log('Subscribing to tables changes...');
  
  const channel = supabase
    .channel('test-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, (payload) => {
      console.log('Realtime event received!', payload);
    })
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });

  // Wait 3 seconds for subscription to be active
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('Triggering table update...');
  // Update Table 3 capacity to trigger event
  const { data, error } = await supabase
    .from('tables')
    .update({ capacity: 5 })
    .eq('table_number', 3);

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update successful! Waiting for realtime event...');
  }

  // Wait 5 seconds to receive the event
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Reset capacity back to 4
  await supabase
    .from('tables')
    .update({ capacity: 4 })
    .eq('table_number', 3);

  console.log('Unsubscribing...');
  supabase.removeChannel(channel);
}

testRealtime();
