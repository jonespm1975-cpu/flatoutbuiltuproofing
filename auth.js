import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm";
export const supabase = createClient("https://fhyhshakmvqwzdyannec.supabase.co", "sb_publishable_U5QORbnSzGR4j1_8hrmCGg_GOeQ5jwu");
export function safeNext(value) {
  const allowed = new Set(['members.html','purchase-info.html','sandbox-checkout.html','gallery.html','mobile-learning.html','owner-analytics.html']);
  return allowed.has(value) ? value : 'members.html';
}
export async function requireUser(nextPage = 'members.html') {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) {
    location.replace('login.html?next=' + encodeURIComponent(safeNext(nextPage)));
    return null;
  }
  return data.user;
}
