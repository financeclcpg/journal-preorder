# 2027 Duc in Altum Prayer Journal – Pre-Order Site

A one-page pre-order form for City Light Church Penang. Each order is saved into the
**Pre-Orders** table of the Airtable base "Duc in Altum Prayer Journal 2027 – Pre-Orders",
with the payment receipt attached.

```
public/index.html                        the form people see
public/qr.png                            payment QR code
netlify/functions/submit-order.js        saves each order to Airtable
netlify.toml                             tells Netlify where things are
```

## 1. Create an Airtable token (5 min)

1. Go to https://airtable.com/create/tokens and click **Create token**.
2. Name: `Journal pre-order site`
3. Scopes: add **data.records:write**
4. Access: add the base **Duc in Altum Prayer Journal 2027 – Pre-Orders** (only this base).
5. Click **Create token** and copy it. You only see it once. Treat it like a password.

## 2. Put the code on GitHub (no command line needed)

Netlify's drag-and-drop upload does not run the server function, so deploy from GitHub:

1. Sign in at https://github.com, then click **New repository**. Name it `journal-preorder`, set it to **Private**, and create it.
2. Click **uploading an existing file** and drag in everything from this folder, keeping the
   `public` and `netlify` folders as they are. Click **Commit changes**.

## 3. Create the site on Netlify

1. In Netlify: **Add new project → Import an existing project → GitHub**, then pick `journal-preorder`.
2. Leave the build settings as they are (netlify.toml fills them in) and click **Deploy**.
3. Go to **Project configuration → Environment variables → Add a variable**:
   - Key: `AIRTABLE_TOKEN`
   - Value: the token from step 1
4. Go to **Deploys → Trigger deploy → Deploy project** so the site picks up the token.

## 4. Give it a nice address (optional)

Under **Domain management → Add a domain**, add something like `journal.clcpg.org`.
Netlify will show the DNS record to add. Whoever manages clcpg.org (the same person who
set up reg.clcpg.org) can add it in a minute.

## 5. Test it

Submit one order with a small screenshot as the receipt. Check that a new row appears in
Airtable with the receipt attached, then delete the test row.

## Changing things later

- **Price:** edit `PRICE = 27` in `public/index.html` and the text "RM27" in the same file.
  The **Amount Due (RM)** formula in Airtable also uses 27.
- **Bank details / QR:** edit the "bank" block in `public/index.html` or replace `public/qr.png`.
- **Closing orders:** replace the form in `index.html` with a "Pre-orders are now closed"
  message, or remove the `AIRTABLE_TOKEN` variable in Netlify.

Every change you commit on GitHub redeploys the site automatically.
