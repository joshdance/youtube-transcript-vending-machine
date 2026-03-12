require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const [, , userId, newPassword] = process.argv;

  if (!userId || !newPassword) {
    console.error(
      'Usage: node scripts/reset-user-password.js <user-id> <new-password>'
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_API_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'Missing SUPABASE_API_URL and/or SUPABASE_SECRET_KEY env vars.'
    );
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error('Error updating password:', error);
      process.exit(1);
    }

    console.log('Password updated:', data);
  } catch (err) {
    console.error('Unexpected error while updating password:', err);
    process.exit(1);
  }
}

main();

