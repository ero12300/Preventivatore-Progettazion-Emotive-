const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

process.env.START_SERVER = 'false';
const app = require('../server/index.cjs');

const TEST_PORT = Number(process.env.SEND_TEST_EMAIL_PORT || 4256);
const API_BASE_URL = `http://localhost:${TEST_PORT}`;

async function run() {
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
    s.on('error', reject);
  });

  try {
    const payload = {
      to: 'boncordoarredi89@gmail.com',
      firstName: 'Eros',
      lastName: 'Boncordo',
      clientName: 'Eros Boncordo',
      phone: '',
      companyName: '',
      vatNumber: '',
      address: '',
      businessType: 'Centro estetico luxury',
      location: 'Milano',
      squareMeters: '70',
      projectDescription: 'Creare un centro estetico premium con reception scenografica, cabine riservate e percorso cliente fluido dalla consulenza al trattamento.',
      totalPrice: 990,
      depositPercentage: 30,
      depositTotal: 362.34,
      remainingTotal: 845.46,
    };

    const response = await fetch(`${API_BASE_URL}/api/gmail/send-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Invio email fallito (${response.status}): ${text}`);
    }

    console.log('Invio email completato con successo:');
    console.log(text);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((err) => {
  console.error('Errore script invio email test:', err.message);
  process.exit(1);
});
