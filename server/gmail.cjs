const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

function base64UrlEncode(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function resolveClientJsonPath(env) {
  const p = env.GMAIL_OAUTH_CLIENT_JSON_PATH || 'server/credentials/gmail-oauth-client.json';
  return path.isAbsolute(p) ? p : path.join(__dirname, '..', p);
}

function loadOAuthClientConfig(env) {
  const clientId = (env.GMAIL_CLIENT_ID || '').trim();
  const clientSecret = (env.GMAIL_CLIENT_SECRET || '').trim();
  const redirectUri = (env.GMAIL_REDIRECT_URI || '').trim();

  // In ambienti serverless (Vercel) preferiamo ENV invece del file JSON locale
  if (clientId && clientSecret && redirectUri) {
    return {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: [redirectUri],
    };
  }

  const jsonPath = resolveClientJsonPath(env);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      `Non trovo il file credenziali OAuth JSON. Atteso in: ${jsonPath}. ` +
      `In alternativa imposta GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET e GMAIL_REDIRECT_URI nelle ENV.`
    );
  }
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const conf = raw.installed || raw.web;
  if (!conf?.client_id || !conf?.client_secret || !Array.isArray(conf.redirect_uris) || conf.redirect_uris.length === 0) {
    throw new Error('JSON OAuth non valido: mancano client_id / client_secret / redirect_uris.');
  }
  return conf;
}

function buildOAuth2Client(env) {
  const conf = loadOAuthClientConfig(env);
  const refreshToken = (env.GMAIL_REFRESH_TOKEN || '').trim();
  if (!refreshToken) {
    throw new Error('Manca GMAIL_REFRESH_TOKEN in .env.local (generalo con server/gmail-auth.cjs).');
  }
  const oAuth2Client = new google.auth.OAuth2(conf.client_id, conf.client_secret, conf.redirect_uris[0]);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
}

async function sendGmailText({ env, to, subject, text }) {
  const from = env.GMAIL_FROM;
  if (!from || !from.includes('@')) {
    throw new Error('Manca GMAIL_FROM in .env.local (es. tuoaccount@gmail.com).');
  }
  if (!to || !to.includes('@')) {
    throw new Error('Destinatario email non valido.');
  }

  const auth = buildOAuth2Client(env);
  const gmail = google.gmail({ version: 'v1', auth });

  const message =
    `From: "EMOTIVE" <${from}>\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n` +
    `Content-Transfer-Encoding: 7bit\r\n` +
    `\r\n` +
    `${text}\r\n`;

  const raw = base64UrlEncode(message);
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return result.data;
}

/**
 * Invia email HTML con allegato PDF
 */
async function sendGmailHtml({ env, to, subject, html, attachments = [] }) {
  const from = env.GMAIL_FROM;
  if (!from || !from.includes('@')) {
    throw new Error('Manca GMAIL_FROM in .env.local (es. tuoaccount@gmail.com).');
  }
  if (!to || !to.includes('@')) {
    throw new Error('Destinatario email non valido.');
  }

  const auth = buildOAuth2Client(env);
  const gmail = google.gmail({ version: 'v1', auth });

  const boundary = '----=_Part_' + Date.now();
  
  let message = 
    `From: "EMOTIVE - Format and Concept" <${from}>\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: multipart/mixed; boundary="${boundary}"\r\n` +
    `\r\n`;

  // Parte HTML (base64 per compatibilità Gmail)
  message += `--${boundary}\r\n`;
  message += `Content-Type: text/html; charset="UTF-8"\r\n`;
  message += `Content-Transfer-Encoding: base64\r\n`;
  message += `\r\n`;
  message += `${Buffer.from(html, 'utf8').toString('base64')}\r\n`;
  message += `\r\n`;

  // Allegati
  for (const attachment of attachments) {
    const { filename, content, mimeType } = attachment;
    const base64Content = Buffer.isBuffer(content) 
      ? content.toString('base64') 
      : Buffer.from(content).toString('base64');
    
    message += `--${boundary}\r\n`;
    message += `Content-Type: ${mimeType}; name="${filename}"\r\n`;
    message += `Content-Disposition: attachment; filename="${filename}"\r\n`;
    message += `Content-Transfer-Encoding: base64\r\n`;
    message += `\r\n`;
    
    // Spezza il base64 in righe da 76 caratteri (standard RFC)
    const lines = base64Content.match(/.{1,76}/g) || [];
    message += lines.join('\r\n') + '\r\n';
    message += `\r\n`;
  }

  message += `--${boundary}--`;

  const raw = base64UrlEncode(message);
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return result.data;
}

module.exports = { sendGmailText, sendGmailHtml };
