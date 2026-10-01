import crypto from 'crypto';
import { config } from './config';

const graphBase = () => `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;

export function verifyMetaSignature(rawBody, signatureHeader) {
  if (!config.appSecret) return true; // permite ambiente de desenvolvimento
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', config.appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

async function postMessage(payload) {
  if (!config.accessToken || !config.phoneNumberId) {
    console.log('[DEV] WhatsApp payload:', JSON.stringify(payload, null, 2));
    return { dev: true };
  }

  const response = await fetch(graphBase(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      ...payload
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Meta API ${response.status}: ${text}`);
  }
  return response.json();
}

export async function sendText(to, body) {
  return postMessage({
    to,
    type: 'text',
    text: { body, preview_url: false }
  });
}

export async function sendMainMenu(to) {
  return postMessage({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: config.brand },
      body: {
        text: `Olá! Sou o assistente virtual do ${config.brand}. Posso ajudar com agendamentos e informações administrativas.`
      },
      footer: { text: 'Não realizo diagnóstico, prescrição ou atendimento de urgência.' },
      action: {
        button: 'Ver opções',
        sections: [
          {
            title: 'Atendimento',
            rows: [
              { id: 'menu_schedule', title: 'Agendar consulta', description: 'Online, presencial ou domiciliar' },
              { id: 'menu_prices', title: 'Valores', description: 'Modalidades e valores' },
              { id: 'menu_patient', title: 'Já sou paciente', description: 'Retorno e demandas administrativas' }
            ]
          },
          {
            title: 'Outras opções',
            rows: [
              { id: 'menu_info', title: 'Informações', description: 'Site e funcionamento' },
              { id: 'menu_human', title: 'Falar com a equipe', description: 'Transferir para atendimento humano' },
              { id: 'menu_urgent', title: 'Situação de urgência', description: 'Orientação imediata de segurança' }
            ]
          }
        ]
      }
    }
  });
}
