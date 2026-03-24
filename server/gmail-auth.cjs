const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const http = require('http');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function resolveClientJsonPath() {
  const p = process.env.GMAIL_OAUTH_CLIENT_JSON_PATH || 'server/credentials/gmail-oauth-client.json';
  return path.isAbsolute(p) ? p : path.join(__dirname, '..', p);
}

function loadOAuthClientConfig() {
  const jsonPath = resolveClientJsonPath();
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Non trovo il file credenziali OAuth JSON. Atteso in: ${jsonPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const conf = raw.installed || raw.web;
  if (!conf?.client_id || !conf?.client_secret || !Array.isArray(conf.redirect_uris) || conf.redirect_uris.length === 0) {
    throw new Error('JSON OAuth non valido: mancano client_id / client_secret / redirect_uris.');
  }
  return conf;
}

function startLocalCallbackServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');

        if (error) {
          res.end(`<h2>Errore OAuth</h2><p>${error}</p><p>Puoi chiudere questa scheda.</p>`);
          server.__oauthError = error;
          return;
        }

        if (!code) {
          res.end(`<h2>In attesa...</h2><p>Nessun code ricevuto.</p><p>Puoi chiudere questa scheda.</p>`);
          return;
        }

        res.end(`<h2>OK</h2><p>Autorizzazione completata. Puoi chiudere questa scheda.</p>`);
        server.__oauthCode = code;
      } catch (e) {
        res.statusCode = 500;
        res.end('Errore callback.');
      } finally {
        // chiudiamo subito: ci basta una richiesta
        setTimeout(() => server.close(), 50);
      }
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('Impossibile avviare server locale.'));
      resolve({ server, port: address.port });
    });
  });
}

async function waitForOAuthCode(server) {
  // aspetta fino a quando il server si chiude (dopo aver ricevuto la callback)
  await new Promise((resolve) => server.on('close', resolve));
  if (server.__oauthError) throw new Error(`OAuth error: ${server.__oauthError}`);
  if (!server.__oauthCode) throw new Error('Nessun code ricevuto dal redirect OAuth.');
  return server.__oauthCode;
}

async function main() {
  const conf = loadOAuthClientConfig();

  const scope = ['https://www.googleapis.com/auth/gmail.send'];

  // Preferiamo un server locale temporaneo così non compare "impossibile raggiungere localhost"
  const { server, port } = await startLocalCallbackServer();
  const redirectUri = `http://localhost:${port}`;

  const oAuth2Client = new google.auth.OAuth2(conf.client_id, conf.client_secret, redirectUri);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope,
  });

  console.log('\nApri questo link nel browser, fai login e consenti:');
  console.log(authUrl);
  console.log(`\n(Nota: dopo il consenso verrai reindirizzato su ${redirectUri} e vedrai una pagina "OK")`);

  // Se l'utente preferisce incollare manualmente, può settare GMAIL_AUTH_CODE:
  // $env:GMAIL_AUTH_CODE="..." ; node .\server\gmail-auth.cjs
  const code = process.env.GMAIL_AUTH_CODE || (await waitForOAuthCode(server));

  const tokenResponse = await oAuth2Client.getToken(code);
  const refreshToken = tokenResponse.tokens.refresh_token;

  if (!refreshToken) {
    console.log('Token ottenuti, ma refresh_token NON presente.');
    console.log('Suggerimento: riprova assicurandoti di usare prompt=consent e access_type=offline, e di non aver già autorizzato questa app.');
    console.log('Tokens:', tokenResponse.tokens);
    process.exit(1);
  }

  console.log('\nREFRESH TOKEN (mettilo in .env.local):');
  console.log(`GMAIL_REFRESH_TOKEN=${refreshToken}`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});

