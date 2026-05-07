require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  const { data: gymsPublic, error: errPublic } = await supabase.from('gyms').select('*');
  const { data: gymsFac, error: errFac } = await supabase.schema('facilities').from('gyms').select('*');
  
  console.log('Public Schema gyms:', gymsPublic, errPublic?.message);
  console.log('Facilities Schema gyms:', gymsFac, errFac?.message);
}

run();
