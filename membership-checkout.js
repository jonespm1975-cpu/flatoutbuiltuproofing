import { supabase } from './auth.js';

const form = document.querySelector('#membership-order');
const agreements = document.querySelector('#membership-agreements');
const button = document.querySelector('#membership-checkout');
const status = document.querySelector('#membership-checkout-status');
const signIn = document.querySelector('#member-sign-in');
const consentFields = [...form.querySelectorAll('input[type="checkbox"]')];

let signedIn = false;
let submitting = false;

function updateControls() {
  signIn.hidden = signedIn;
  agreements.disabled = !signedIn;
  button.disabled = !signedIn || submitting || consentFields.some(field => !field.checked);
}

async function checkSignIn() {
  const { data, error } = await supabase.auth.getUser();
  signedIn = !error && Boolean(data?.user) && !data.user.is_anonymous;
  updateControls();
  return signedIn;
}

form.addEventListener('change', updateControls);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (button.disabled || !form.reportValidity()) return;
  submitting = true;
  updateControls();
  let redirecting = false;
  try {
    if (!(await checkSignIn())) {
      status.textContent = 'Your session ended. Sign in again to continue.';
      return;
    }
    status.textContent = 'Opening secure Stripe Checkout…';
    const { data, error } = await supabase.functions.invoke('membership-live-checkout', {
      method: 'POST',
      body: {
        terms_version: form.dataset.termsVersion,
        ...Object.fromEntries(consentFields.map(field => [field.name, field.checked])),
      },
    });
    if (error) {
      switch (error.context?.status) {
        case 401:
          signedIn = false;
          status.textContent = 'Your session ended. Sign in again to continue.';
          return;
        case 409:
          status.textContent = 'A membership or checkout may already exist. Check My Learning first.';
          return;
        case 422:
          status.textContent = 'Reload this page and review the current membership terms before continuing.';
          return;
        case 503:
          status.textContent = 'Monthly checkout is currently unavailable.';
          return;
        default:
          throw error;
      }
    }
    if (typeof data?.url !== 'string') throw new Error('Checkout address missing');
    const destination = new URL(data.url);
    if (destination.origin !== 'https://checkout.stripe.com') throw new Error('Unexpected checkout address');
    location.assign(destination.href);
    redirecting = true;
  } catch {
    status.textContent = 'We could not open checkout. Please try again.';
  } finally {
    if (!redirecting) {
      submitting = false;
      updateControls();
    }
  }
});

if (new URLSearchParams(location.search).get('checkout') === 'cancel') {
  status.textContent = 'You returned from Stripe without completing checkout.';
}

checkSignIn().catch(() => {
  status.textContent = 'We could not check your sign-in. Reload the page to try again.';
});
