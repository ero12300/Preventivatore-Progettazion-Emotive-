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

function resolveGmailOAuthJsonPath() {
  const p = process.env.GMAIL_OAUTH_CLIENT_JSON_PATH || 'server/credentials/gmail-oauth-client.json';
  return path.isAbsolute(p) ? p : path.join(rootDir, p);
}

/** Stessa logica di server/gmail.cjs: ENV oppure file JSON (tipico in locale). */
function isGmailOAuthConfigPresent() {
  const clientId = (process.env.GMAIL_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim();
  const redirectUri = (process.env.GMAIL_REDIRECT_URI || '').trim();
  if (clientId && clientSecret && redirectUri) {
    return true;
  }
  const jsonPath = resolveGmailOAuthJsonPath();
  if (!fs.existsSync(jsonPath)) {
    return false;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const conf = raw.installed || raw.web;
    return Boolean(
      conf?.client_id &&
        conf?.client_secret &&
        Array.isArray(conf.redirect_uris) &&
        conf.redirect_uris.length > 0
    );
  } catch {
    return false;
  }
}

const required = [
  'STRIPE_SECRET_KEY',
  'APP_BASE_URL',
  'GMAIL_FROM',
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

if (!isGmailOAuthConfigPresent()) {
  console.error('Config Gmail OAuth incompleta. Serve una di queste opzioni:');
  console.error('- Imposta GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET e GMAIL_REDIRECT_URI (es. su Vercel), oppure');
  console.error(`- File OAuth JSON valido in: ${resolveGmailOAuthJsonPath()}`);
  process.exit(1);
}

console.log('Controllo ENV OK: tutte le variabili richieste sono presenti.');
