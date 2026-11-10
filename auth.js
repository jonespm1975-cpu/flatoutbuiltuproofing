import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm";
export const supabase = createClient("https://fhyhshakmvqwzdyannec.supabase.co", "sb_publishable_U5QORbnSzGR4j1_8hrmCGg_GOeQ5jwu");
export function safeNext(value) {
  const allowed = new Set(['members.html']);
  return allowed.has(value) ? value : 'members.html';
}
export async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    location.replace('login.html?next=members.html');
    return null;
  }
  return data.user;
}
