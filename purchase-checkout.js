import { supabase } from './auth.js';

const form = document.querySelector('#course-order');
const button = document.querySelector('#course-checkout');
const status = document.querySelector('#checkout-status');

button.disabled = false;
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity() || button.disabled) return;

  button.disabled = true;
  status.textContent = 'Checking your account…';
  let redirecting = false;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) {
      location.assign('login.html?next=purchase-info.html');
      redirecting = true;
      return;
    }
    status.textContent = 'Opening secure checkout…';
    const { data: checkout, error: checkoutError } = await supabase.functions.invoke('stripe-live-checkout', {
      body: {
        terms_accepted: true,
        immediate_access_consent: true,
        cancellation_acknowledgement: true
      }
    });
    if (checkoutError || !checkout?.url) throw new Error('Checkout unavailable');
    const url = new URL(checkout.url);
    if (url.origin !== 'https://checkout.stripe.com') throw new Error('Unexpected checkout address');
    location.assign(url.href);
    redirecting = true;
  } catch {
    status.textContent = 'Checkout is unavailable. Please try again later or contact us for help.';
  } finally {
    if (!redirecting) button.disabled = false;
  }
});
