const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const rootDir = path.join(__dirname, '..');
const envLocalPath = path.join(rootDir, '.env.local');
const envPath = path.join(rootDir, '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const required = [
  'STRIPE_SECRET_KEY',
  'APP_BASE_URL',
  'GMAIL_FROM',
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'GMAIL_REDIRECT_URI',
  'GMAIL_REFRESH_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_TABLE',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AI_PROVIDER_MODE',
  'HUGGINGFACE_API_TOKEN',
  'HUGGINGFACE_MODEL',
  'HUGGINGFACE_API_URL',
];

const missing = required.filter((key) => {
  const value = process.env[key];
  return typeof value !== 'string' || value.trim() === '';
});

if (missing.length > 0) {
  console.error('Variabili ambiente mancanti:');
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log('Controllo ENV OK: tutte le variabili richieste sono presenti.');
