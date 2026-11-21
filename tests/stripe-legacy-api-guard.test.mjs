import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

// Static guard for code committed in this repository only.
// NOT a substitute for inspecting historical Stripe Workbench request logs,
// third-party clients, or independently deployed Supabase functions.
const paths = ['supabase/functions', 'purchase-checkout.js', 'server.js'];

function collect(entry) {
  const fs = awaitlessReaddir(entry);
  if (fs !== null) return fs.flatMap(({ name, type }) =>
    type === 'directory' ? collect(join(entry, name)) :
    ['.js', '.mjs', '.cjs', '.ts', '.tsx'].includes(extname(name)) ? [join(entry, name)] : []);
  return [entry];
}

function awaitlessReaddir(entry) {
  try { return readdirSync(entry, { withFileTypes: true }).map(x => ({
    name: x.name, type: x.isDirectory() ? 'directory' : 'file'
  })); } catch (error) {
    if (error?.code === 'ENOTDIR') return null;
    throw error;
  }
}

test('payment source avoids legacy token/Charges routes', () => {
  const files = paths.flatMap(collect);
  assert.ok(files.some(x => x.endsWith('stripe-live-checkout/index.ts')),
    'Live checkout source must be present in GitHub');
  const forbidden = [
    [/\.charges\.create\s*\(/i, 'Charges.create'],
    [/\/v1\/charges(?:\/|\?|\b)/i, 'legacy Charges REST API'],
    [/\.customers\.create\s*\(\s*\{[\s\S]{0,250}\b(?:source|card)\s*:/i, 'token-backed Customers.create'],
    [/\bstripe\.createToken\s*\(/i, 'Stripe.js createToken'],
  ];
  for (const path of files) {
    const source = readFileSync(path, 'utf8');
    for (const [pattern, name] of forbidden) {
      assert.doesNotMatch(source, pattern, `${path} includes ${name}`);
    }
  }
});

test('live course checkout is one-off and uses Stripe Checkout with GB address collection', () => {
  const source = readFileSync('supabase/functions/stripe-live-checkout/index.ts', 'utf8');
  assert.match(source, /stripe\.checkout\.sessions\.create\s*\(/);
  assert.match(source, /mode\s*:\s*["']payment["']/);
  assert.match(source, /allowed_countries\s*:\s*\[\s*["']GB["']\s*\]/);
});
