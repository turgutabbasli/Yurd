// Netlify Edge Function for the land advisor ("Torpaq məsləhətçisi"); see chat.ts for why Edge Functions are used.
import { handleAdvisor } from '../../server/ai.ts';

declare const Netlify: { env: { get(name: string): string | undefined } };

export default async (request: Request, context: { ip?: string }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Yalnız POST sorğusu qəbul edilir.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const body = await request.json().catch(() => null);
  const { status, payload } = await handleAdvisor(body, context?.ip || 'unknown', name => Netlify.env.get(name));
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
};

export const config = { path: '/api/advisor' };
