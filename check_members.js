require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkMembers() {
  const { data, error } = await supabase.schema('members').from('members').select('id, email, password, name');
  console.log('Members:', data);
  if (error) console.error('Error:', error);
}

checkMembers();
