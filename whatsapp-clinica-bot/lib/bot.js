import { config } from './config';
import { sendMainMenu, sendText } from './whatsapp';
import { createAppointment, createTicket, getContact, logMessage, saveContact } from './store';

const normalize = (s='') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const urgentPatterns = [
  /quero me matar/, /suicid/, /me matar/, /tirar minha vida/, /nao quero viver/,
  /overdose/, /desmaiei/, /desmaio/, /dor no peito/, /falta de ar/, /convuls/, /sangramento intenso/,
  /alucin/, /agressiv.*arma/, /risco imediato/
];

const clinicalPatterns = [
  /receita/, /prescri/, /remedio/, /medicacao/, /dose/, /aumentar.*dose/, /diminuir.*dose/,
  /atestado/, /laudo/, /efeito colateral/, /sintoma/
];

function classify(text, replyId='') {
  const t = normalize(text);
  if (urgentPatterns.some(r => r.test(t))) return 'urgent';
  if (replyId) {
    const map = {
      menu_schedule: 'schedule', menu_prices: 'prices', menu_patient: 'patient',
      menu_info: 'info', menu_human: 'human', menu_urgent: 'urgent'
    };
    if (map[replyId]) return map[replyId];
  }
  if (/^(1|agendar|consulta|marcar)/.test(t)) return 'schedule';
  if (/^(2|valor|valores|preco|precos)/.test(t)) return 'prices';
  if (/^(3|ja sou paciente|retorno)/.test(t)) return 'patient';
  if (/^(4|informacoes|informacao|site|endereco)/.test(t)) return 'info';
  if (/^(5|humano|falar com.*equipe|atendente)/.test(t)) return 'human';
  if (/^(6|urgencia|emergencia)/.test(t)) return 'urgent';
  if (/^(menu|inicio|oi|ola|bom dia|boa tarde|boa noite)$/.test(t)) return 'menu';
  if (clinicalPatterns.some(r => r.test(t))) return 'clinical_handoff';
  return 'unknown';
}

async function reply(phone, text, intent) {
  await sendText(phone, text);
  await logMessage(phone, 'out', text, intent);
}

function urgencyText() {
  return `⚠️ Este canal não é adequado para urgências.\n\nSe houver risco imediato à vida, tentativa de suicídio, falta de ar importante, dor torácica intensa, desmaio, convulsão, intoxicação/overdose ou outra emergência, procure um serviço de urgência ou acione o SAMU pelo 192.\n\nEm crise emocional com risco de autoagressão, não permaneça sozinho(a). O CVV também atende pelo 188, mas situações de risco imediato exigem atendimento de emergência.\n\nSua mensagem será sinalizada para atendimento humano. Não aguarde resposta do WhatsApp para buscar socorro.`;
}

export async function handleIncoming({ phone, profileName='', text='', replyId='' }) {
  const intent = classify(text, replyId);
  await logMessage(phone, 'in', text || replyId, intent);

  let contact = await getContact(phone);
  contact.profile_name = profileName || contact.profile_name || '';

  if (intent === 'urgent') {
    await createTicket({ phone, category: 'urgency', priority: 'urgent', note: text || replyId });
    contact.bot_paused = true;
    contact.state = 'human';
    await saveContact(contact);
    await reply(phone, urgencyText(), 'urgent');
    return;
  }

  if (contact.bot_paused) {
    return;
  }

  if (intent === 'clinical_handoff') {
    await createTicket({ phone, category: 'clinical_request', priority: 'normal', note: text });
    contact.bot_paused = true;
    contact.state = 'human';
    await saveContact(contact);
    await reply(phone,
      `Recebi sua solicitação. Como envolve questão clínica, receita, documento médico ou medicação, vou encaminhá-la para a ${config.teamLabel}.\n\nPor segurança, o assistente virtual não diagnostica, prescreve nem orienta mudança de tratamento.`,
      'clinical_handoff');
    return;
  }

  if (contact.state === 'schedule_modality') {
    const t = normalize(text);
    let modality = null;
    if (/^(1|online|teleconsulta)/.test(t)) modality = 'Online';
    if (/^(2|presencial)/.test(t)) modality = 'Presencial';
    if (/^(3|domiciliar|casa)/.test(t)) modality = 'Domiciliar';
    if (!modality) {
      await reply(phone, 'Escolha uma modalidade: 1️⃣ Online  2️⃣ Presencial  3️⃣ Domiciliar', 'schedule');
      return;
    }
    contact.state_data = { ...(contact.state_data || {}), modality };
    contact.state = 'schedule_time';
    await saveContact(contact);
    await reply(phone, `Perfeito: *${modality}*. Qual dia e período/horário você prefere? Ex.: “terça à tarde” ou “05/10 às 14h”.`, 'schedule');
    return;
  }

  if (contact.state === 'schedule_time') {
    contact.state_data = { ...(contact.state_data || {}), preferred_time: text.slice(0, 200) };
    contact.state = 'schedule_reason';
    await saveContact(contact);
    await reply(phone,
      'Para direcionar a agenda, escolha apenas a categoria geral do motivo:\n1️⃣ Consulta geral\n2️⃣ Saúde mental\n3️⃣ Neurodesenvolvimento\n4️⃣ Retorno\n5️⃣ Outro\n\nNão é necessário enviar detalhes clínicos por aqui.',
      'schedule');
    return;
  }

  if (contact.state === 'schedule_reason') {
    const t = normalize(text);
    const reasonMap = {
      '1': 'Consulta geral', 'consulta geral': 'Consulta geral',
      '2': 'Saúde mental', 'saude mental': 'Saúde mental',
      '3': 'Neurodesenvolvimento', 'neurodesenvolvimento': 'Neurodesenvolvimento',
      '4': 'Retorno', 'retorno': 'Retorno',
      '5': 'Outro', 'outro': 'Outro'
    };
    const reason = reasonMap[t];
    if (!reason) {
      await reply(phone, 'Responda com 1, 2, 3, 4 ou 5 para eu concluir sua solicitação.', 'schedule');
      return;
    }

    const appointment = await createAppointment({
      phone,
      profile_name: contact.profile_name,
      modality: contact.state_data?.modality || '',
      preferred_time: contact.state_data?.preferred_time || '',
      reason_category: reason
    });

    contact.state = null;
    contact.state_data = {};
    await saveContact(contact);

    await reply(phone,
      `✅ Solicitação registrada.\n\n*Modalidade:* ${appointment.modality}\n*Preferência:* ${appointment.preferred_time}\n*Categoria:* ${reason}\n\nA ${config.teamLabel} ainda precisa confirmar a disponibilidade. O envio desta solicitação não garante o horário até a confirmação humana.`,
      'schedule_complete');
    return;
  }

  if (intent === 'menu' || intent === 'unknown') {
    try {
      await sendMainMenu(phone);
      await logMessage(phone, 'out', '[menu interativo]', 'menu');
    } catch {
      await reply(phone,
        `Olá! Sou o assistente virtual do ${config.brand} (${config.crm}).\n\n1️⃣ Agendar consulta\n2️⃣ Valores\n3️⃣ Já sou paciente\n4️⃣ Informações\n5️⃣ Falar com a equipe\n6️⃣ Situação de urgência\n\nDigite o número da opção desejada.`,
        'menu');
    }
    return;
  }

  if (intent === 'schedule') {
    contact.state = 'schedule_modality';
    contact.state_data = {};
    await saveContact(contact);
    await reply(phone, 'Vamos agendar. Escolha a modalidade:\n1️⃣ Online\n2️⃣ Presencial\n3️⃣ Domiciliar', 'schedule');
    return;
  }

  if (intent === 'prices') {
    await reply(phone,
      `💳 *Valores de atendimento*\n\n• Consulta online: R$ ${config.priceOnline}\n• Atendimento domiciliar: R$ ${config.priceHome}\n• Valor especial/social, quando previamente aplicável: R$ ${config.priceSpecial}\n\nCondições e elegibilidade para valor especial são confirmadas pela equipe.`,
      'prices');
    return;
  }

  if (intent === 'patient') {
    await createTicket({ phone, category: 'existing_patient', priority: 'normal', note: text || replyId });
    contact.bot_paused = true;
    contact.state = 'human';
    await saveContact(contact);
    await reply(phone,
      `Certo. Vou encaminhar você para a ${config.teamLabel}.\n\nSe possível, informe apenas se a demanda é: retorno, documento/exame, receita/documentação ou dúvida administrativa. Evite enviar dados clínicos sensíveis até que sejam solicitados.`,
      'patient');
    return;
  }

  if (intent === 'info') {
    await reply(phone,
      `ℹ️ *${config.brand}*\n${config.crm}\n\nSite: ${config.site}\n\nAtendimento por consulta online e modalidades presenciais/domiciliares conforme disponibilidade. Para agendar, digite *1* ou escreva “agendar”.`,
      'info');
    return;
  }

  if (intent === 'human') {
    await createTicket({ phone, category: 'human_request', priority: 'normal', note: text || replyId });
    contact.bot_paused = true;
    contact.state = 'human';
    await saveContact(contact);
    await reply(phone, `Tudo certo. A conversa foi encaminhada para a ${config.teamLabel}. A partir de agora o bot não responderá automaticamente até o atendimento ser liberado novamente.`, 'human');
  }
}
