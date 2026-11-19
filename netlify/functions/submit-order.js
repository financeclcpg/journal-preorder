// Saves a prayer-journal pre-order into Airtable.
// Needs one environment variable in Netlify: AIRTABLE_TOKEN
// (an Airtable personal access token with data.records:write on the pre-order base).

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'app7ebQVUPNPncfnQ';
const TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblYP1oTivxSfP9n5';
const RECEIPT_FIELD_ID = 'fldrk0EepYMdGETe8'; // "Payment Receipt" attachment field

const PAYMENT_OPTIONS = ['DuitNow QR', 'Online bank transfer'];
const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = /^(image\/(jpeg|png|webp|heic|heif|gif)|application\/pdf)$/;

function reply(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { ok: false, error: 'Method not allowed.' });

  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return reply(500, { ok: false, error: 'The form is not set up yet. Please contact the church office.' });

  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch {
    return reply(400, { ok: false, error: 'Invalid request.' });
  }

  // Spam trap: bots fill hidden fields; pretend success and save nothing.
  if (clean(input.website)) return reply(200, { ok: true });

  const name = clean(input.name, 120);
  const phone = clean(input.phone, 30);
  const email = clean(input.email, 120);
  const remarks = clean(input.remarks, 1000);
  const copies = Number(input.copies);
  const payment = clean(input.payment, 60);

  if (!name) return reply(400, { ok: false, error: 'Please enter your full name.' });
  if (phone.replace(/\D/g, '').length < 9) return reply(400, { ok: false, error: 'Please enter a valid phone number.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { ok: false, error: 'Please check your email address.' });
  if (!Number.isInteger(copies) || copies < 1 || copies > 50) return reply(400, { ok: false, error: 'Please enter between 1 and 50 copies.' });
  if (!PAYMENT_OPTIONS.includes(payment)) return reply(400, { ok: false, error: 'Please choose how you will pay.' });

  const receipt = input.receipt;
  const needsReceipt = true;
  {
    if (!receipt || !receipt.base64) return reply(400, { ok: false, error: 'Please upload your payment receipt.' });
    if (!ALLOWED_TYPES.test(String(receipt.contentType))) return reply(400, { ok: false, error: 'Please upload the receipt as an image or PDF.' });
    const approxBytes = Math.floor(String(receipt.base64).length * 3 / 4);
    if (approxBytes > MAX_RECEIPT_BYTES) return reply(400, { ok: false, error: 'Your receipt file is larger than 4 MB. Please upload a smaller screenshot.' });
  }

  const fields = {
    'Full Name': name,
    'Phone (WhatsApp)': phone,
    'Number of Copies': copies,
    'Payment Method': payment,
    'Payment Status': 'Unpaid',
  };
  if (email) fields['Email'] = email;
  if (remarks) fields['Remarks'] = remarks;

  // 1) Create the order record.
  const createRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }] }),
  });
  if (!createRes.ok) {
    console.error('Airtable create failed', createRes.status, await createRes.text());
    return reply(502, { ok: false, error: 'We could not save your order. Please try again, or contact the church office.' });
  }
  const created = await createRes.json();
  const record = created.records && created.records[0];
  const orderNo = record && record.fields ? record.fields['Order No.'] : undefined;

  // 2) Attach the receipt to the record.
  if (needsReceipt && record) {
    const safeName = clean(receipt.filename, 100).replace(/[^\w.\- ]+/g, '_') || 'receipt';
    const uploadRes = await fetch(
      `https://content.airtable.com/v0/${BASE_ID}/${record.id}/${RECEIPT_FIELD_ID}/uploadAttachment`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: receipt.contentType, file: receipt.base64, filename: safeName }),
      }
    );
    if (!uploadRes.ok) {
      console.error('Airtable receipt upload failed', uploadRes.status, await uploadRes.text());
      // The order is saved; note the missing receipt so the office can follow up.
      await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${record.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { Remarks: `${remarks ? remarks + '\n\n' : ''}[Receipt upload failed – please ask for it on WhatsApp]` } }),
      }).catch(() => {});
    }
  }

  return reply(200, { ok: true, orderNo });
};
