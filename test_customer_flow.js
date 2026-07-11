import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ighxnnjebtsgpnhnkqoo.supabase.co';
const supabaseAnonKey = 'sb_publishable_JICuNYwik0lbpkriSWbz1A_Vfgfr0XB';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tableId = '7c525c26-ba98-43c8-a6ab-69cf6b7db534'; // Table 1 from our previous list
const anonymousId = 'test-anon-12345';

async function testCustomerFlow() {
  console.log('--- Testing table_sessions operations ---');
  // 1. Insert session
  const { data: session, error: sessError } = await supabase
    .from('table_sessions')
    .insert({
      table_id: tableId,
      anonymous_id: anonymousId,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (sessError) {
    console.error('Create session failed:', sessError);
  } else {
    console.log('Create session successful:', session);

    // 2. Query session
    const { data: fetchedSession, error: fetchSessError } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('id', session.id)
      .single();

    if (fetchSessError) {
      console.error('Fetch session failed:', fetchSessError);
    } else {
      console.log('Fetch session successful:', fetchedSession);
    }

    // 3. Create order
    console.log('\n--- Testing orders operations ---');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        session_id: session.id,
        table_id: tableId,
        status: 'pending',
        subtotal: 100,
        tax_amount: 10,
        discount_amount: 0,
        total_amount: 110,
        payment_status: 'unpaid',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Create order failed:', orderError);
    } else {
      console.log('Create order successful:', order);

      // 4. Query order
      const { data: fetchedOrder, error: fetchOrderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single();

      if (fetchOrderError) {
        console.error('Fetch order failed:', fetchOrderError);
      } else {
        console.log('Fetch order successful:', fetchedOrder);
      }
    }
  }
}

testCustomerFlow();
