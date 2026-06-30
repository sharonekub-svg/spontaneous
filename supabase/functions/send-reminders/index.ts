// Supabase Edge Function: send-reminders
//
// Sends an Expo push notification to every user who hasn't done today's mission
// yet. Intended to be invoked on a schedule (~3x/day) by pg_cron + pg_net — see
// docs/push-notifications.md.
//
// Required function secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-available in the runtime)
//   CRON_SECRET  — a shared secret; the caller must send it as x-cron-secret.
//
// Deploy:  supabase functions deploy send-reminders --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// A few friendly Hebrew nudges; one is picked at random per run.
const MESSAGES = [
  { title: 'המשימה היומית מחכה', body: 'דקה אחת של ספונטניות — קדימה, תשלימו את היום.' },
  { title: 'אל תשברו את הרצף', body: 'עוד לא עשיתם את המשימה היום. הלהבה מחכה להידלק.' },
  { title: 'ספונטני?', body: 'המשימה של היום עדיין פתוחה. בואו נצבור נקודות.' },
];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req) => {
  // Simple shared-secret guard so the endpoint can't be triggered by anyone.
  const secret = Deno.env.get('CRON_SECRET');
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data, error } = await supabase.rpc('tokens_for_reminders');
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const tokens: string[] = (data ?? []).map((r: { token: string }) => r.token);
  if (tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  let sent = 0;

  for (const batch of chunk(tokens, 100)) {
    const messages = batch.map((to) => ({
      to,
      sound: 'default',
      title: msg.title,
      body: msg.body,
      priority: 'high',
    }));
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(messages),
    });
    if (res.ok) sent += batch.length;
  }

  return new Response(JSON.stringify({ sent, total: tokens.length }), {
    headers: { 'content-type': 'application/json' },
  });
});
