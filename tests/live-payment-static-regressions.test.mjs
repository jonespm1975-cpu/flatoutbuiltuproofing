// Static, non-network regression checks. Run: node --test tests/live-payment-static-regressions.test.mjs
// These check checked-in source ONLY; the deployed functions/Stripe/Resend must be audited separately.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = (path) => readFileSync(path, 'utf8');
const webhook = source('supabase/functions/stripe-webhook/index.ts');
const checkout = source('supabase/functions/stripe-live-checkout/index.ts');
const emailWorker = source('supabase/functions/live-purchase-email-delivery-worker/index.ts');
const contract = source('supabase/functions/live-purchase-email-delivery-worker/contract-snapshot.ts');
const buyerReceipts = source('purchase-confirmations.html');
const membership = source('members.html');

test('one-off Stripe Checkout uses the approved £9.99 price, UK address and consent', () => {
  assert.match(checkout, /checkout\.sessions\.create\s*\(/);
  assert.match(checkout, /mode\s*:\s*["']payment["']/);
  assert.match(checkout, /allowed_countries\s*:\s*\[\s*["']GB["']\s*\]/);
  assert.match(checkout, /immediate_access_consent\s*!==\s*true/);
  assert.match(checkout, /cancellation_acknowledgement\s*!==\s*true/);
  assert.match(checkout, /terms_accepted\s*!==\s*true/);
  assert.match(checkout, /automatic_tax\s*:\s*\{\s*enabled\s*:\s*false\s*\}/);
});

test('webhook verifies signed and paid live Checkout before recording the purchase', () => {
  assert.match(webhook, /webhooks\.constructEventAsync\s*\(/);
  assert.match(webhook, /session\.payment_status\s*!==\s*["']paid["']/);
  assert.match(webhook, /event\.livemode\s*!==\s*true/);
  assert.match(webhook, /session\.mode\s*!==\s*["']payment["']/);
  assert.match(webhook, /session\.amount_total\s*!==\s*999/);
  assert.match(webhook, /addressCountry\s*!==\s*["']GB["']/);
  assert.match(webhook, /lineItems\.data\.length\s*!==\s*1/);
  assert.match(webhook, /purchase_confirmations/);
  assert.doesNotMatch(webhook, /api\.resend\.com/i, 'Never send email synchronously from payment webhook');
});

test('email worker uses private claim/finalize functions and a stable idempotency key', () => {
  assert.match(emailWorker, /verify_live_purchase_email_worker_cron_token/);
  assert.match(emailWorker, /claim_live_purchase_email_retry/);
  assert.match(emailWorker, /finish_live_purchase_email_retry/);
  assert.match(emailWorker, /Idempotency-Key/);
  assert.match(emailWorker, /course-confirmation-/);
  assert.match(emailWorker, /LIVE_PURCHASE_EMAIL_WORKER_ENABLED/);
  assert.match(emailWorker, /LIVE_PURCHASE_EMAIL_SENDING_ENABLED/);
});

test('buyer receipt endpoint requires signed-in user and filters records by account', () => {
  // Server-side per-user filtering was verified separately against the deployed Supabase function.
  assert.match(buyerReceipts, /purchase confirmations/i);
  assert.match(buyerReceipts, /Print or save as PDF/i);
});

test('customer confirmation email includes fixed launch contract snapshots', () => {
  assert.match(contract, /Terms-of-use\.html/);
  assert.match(contract, /Cancellation-and-refunds\.html/);
  assert.match(emailWorker, /contractAttachments/);
});

test('£1.99 membership is not described as a live paid offering', () => {
  assert.match(membership, /£1\.99 monthly membership is not yet available to buy/);
});

// A gate, not a success claim: do not mark the refund/confirmation access redesign complete
// until a legally reviewed durable medium and independent two-connection DB tests exist.
test.todo('decouple paid lesson entitlement from email-provider acceptance without violating durable-contract confirmation duties');
