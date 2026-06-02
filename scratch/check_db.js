const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('matter_defaults').select('*').limit(1);
  if (error) {
    console.error("Error/Doesn't exist:", error);
  } else {
    console.log("Table exists:", data);
  }
}
check();
