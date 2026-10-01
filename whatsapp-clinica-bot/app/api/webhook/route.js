import { NextResponse } from 'next/server';
import { config } from '../../../lib/config';
import { handleIncoming } from '../../../lib/bot';
import { verifyMetaSignature } from '../../../lib/whatsapp';

export const runtime = 'nodejs';

export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && token === config.verifyToken) {
    return new Response(challenge || '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

function extractMessages(payload) {
  const out = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {};
      const contacts = value?.contacts || [];
      const nameByWaId = Object.fromEntries(contacts.map(c => [c.wa_id, c?.profile?.name || '']));
      for (const m of value?.messages || []) {
        let text = '';
        let replyId = '';
        if (m.type === 'text') text = m?.text?.body || '';
        if (m.type === 'interactive') {
          replyId = m?.interactive?.list_reply?.id || m?.interactive?.button_reply?.id || '';
          text = m?.interactive?.list_reply?.title || m?.interactive?.button_reply?.title || '';
        }
        if (!text && !replyId) text = `[${m.type || 'mensagem'}]`;
        out.push({
          phone: m.from,
          profileName: nameByWaId[m.from] || '',
          text,
          replyId
        });
      }
    }
  }
  return out;
}

export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  if (!verifyMetaSignature(raw, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload;
  try { payload = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }

  const messages = extractMessages(payload);
  for (const message of messages) {
    try {
      await handleIncoming(message);
    } catch (error) {
      console.error('Bot error:', error);
    }
  }

  return NextResponse.json({ received: true });
}
