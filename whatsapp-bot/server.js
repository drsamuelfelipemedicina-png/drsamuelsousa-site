import "dotenv/config";
import express from "express";
import crypto from "crypto";
import OpenAI from "openai";
import { clinicConfig } from "./config.js";

const app = express();
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);

const PORT = Number(process.env.PORT || 3000);
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const states = new Map();
const processedIds = new Set();

const MENU = `Olá! 👋
Sou o assistente virtual do ${clinicConfig.doctorName} (${clinicConfig.crm}).

Uso automação e IA apenas para informações administrativas. Este canal não realiza diagnóstico, prescrição ou atendimento de urgência.

Como posso ajudar?

1️⃣ Agendar consulta
2️⃣ Consulta online
3️⃣ Consulta domiciliar
4️⃣ Valores e pagamento
5️⃣ Informações sobre atendimento
6️⃣ Falar com a equipe

Digite o número da opção ou escreva sua dúvida.`;

const EMERGENCY_MESSAGE = `⚠️ Este canal não realiza atendimento de urgência.

Se houver dor no peito intensa, falta de ar importante, desmaio, convulsão, sangramento intenso, alteração súbita da consciência, risco de autoagressão ou outra situação potencialmente grave, procure imediatamente um serviço de urgência ou acione o SAMU pelo 192.

Para assuntos não urgentes, digite MENU.`;

function normalize(text = "") {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isEmergency(text) {
  const t = normalize(text);
  const patterns = [
    "dor no peito intensa",
    "dor forte no peito",
    "falta de ar intensa",
    "nao consigo respirar",
    "desmaiei",
    "desmaio",
    "convulsao",
    "sangramento intenso",
    "muito sangue",
    "inconsciente",
    "nao acorda",
    "tentativa de suicidio",
    "quero me matar",
    "vou me matar",
    "autoagressao"
  ];
  return patterns.some((p) => t.includes(p));
}

function seemsClinical(text) {
  const t = normalize(text);

  const administrativePatterns = [
    "atende crianca",
    "atende criancas",
    "atende gestante",
    "atende idoso",
    "atende idosos",
    "qual o valor",
    "quanto custa",
    "consulta online",
    "consulta domiciliar",
    "como agendar",
    "quero agendar",
    "forma de pagamento",
    "chave pix"
  ];
  if (administrativePatterns.some((p) => t.includes(p))) return false;

  const clinicalTerms = [
    "sintoma",
    "diagnostico",
    "remedio",
    "medicamento",
    "receita",
    "dose",
    "posologia",
    "exame",
    "resultado",
    "tratamento",
    "febre",
    "dor ",
    "pressao",
    "glicemia",
    "vomito",
    "diarreia",
    "sangramento",
    "ferida",
    "alergia",
    "antibiotico"
  ];
  return clinicalTerms.some((p) => t.includes(p));
}

function extractIncomingMessage(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const msg = value?.messages?.[0];
  if (!msg) return null;

  let text = "";
  if (msg.type === "text") text = msg.text?.body || "";
  if (msg.type === "button") text = msg.button?.text || msg.button?.payload || "";
  if (msg.type === "interactive") {
    text =
      msg.interactive?.button_reply?.id ||
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.id ||
      msg.interactive?.list_reply?.title ||
      "";
  }

  return {
    id: msg.id,
    from: msg.from,
    text,
    type: msg.type
  };
}

function verifyMetaSignature(req) {
  if (!APP_SECRET) return true;
  const signature = req.headers["x-hub-signature-256"];
  if (!signature || !req.rawBody) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", APP_SECRET).update(req.rawBody).digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function sendText(to, body) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID || !GRAPH_VERSION) {
    throw new Error(
      "Configure META_ACCESS_TOKEN, META_PHONE_NUMBER_ID e META_GRAPH_VERSION."
    );
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body
        }
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Meta API ${response.status}: ${detail}`);
  }
}

function setHumanMode(phone) {
  states.set(phone, {
    mode: "human",
    expiresAt: Date.now() + 12 * 60 * 60 * 1000
  });
}

function inHumanMode(phone) {
  const state = states.get(phone);
  if (!state) return false;
  if (state.expiresAt && state.expiresAt < Date.now()) {
    states.delete(phone);
    return false;
  }
  return state.mode === "human";
}

function priceMessage() {
  const pix = clinicConfig.pixKey
    ? `\nPIX: ${clinicConfig.pixKey}`
    : "";

  return `💳 Valores

• Consulta online: R$ ${clinicConfig.onlinePrice},00
• Consulta domiciliar: R$ ${clinicConfig.homePrice},00

${pix}

A confirmação do horário e do pagamento é feita conforme a disponibilidade da agenda.`;
}

function bookingMessage(kind = "") {
  const label = kind ? ` para consulta ${kind}` : "";
  if (clinicConfig.bookingUrl) {
    return `📅 Para agendar${label}, acesse:
${clinicConfig.bookingUrl}

Se preferir atendimento humano, digite ATENDENTE.`;
  }

  return `📅 Para agendar${label}, digite ATENDENTE. A equipe dará continuidade nesta conversa conforme a disponibilidade da agenda.`;
}

function infoMessage() {
  return `ℹ️ ${clinicConfig.doctorName} — ${clinicConfig.crm}

Atendimento: ${clinicConfig.scope}.
Público atendido: ${clinicConfig.audiences}.

Site: ${clinicConfig.siteUrl}

Para valores, digite 4. Para agendar, digite 1.`;
}

async function answerAdministrativeQuestion(text) {
  if (!openai) {
    return `Posso ajudar com agendamento, modalidades de consulta, valores e informações administrativas. Digite MENU para ver as opções.`;
  }

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    store: false,
    instructions: `Você é o assistente virtual administrativo do ${clinicConfig.doctorName}, ${clinicConfig.crm}.

REGRAS OBRIGATÓRIAS:
- Responda em português do Brasil, de forma curta, cordial e profissional.
- Atue SOMENTE em assuntos administrativos: agendamento, modalidades, valores, formas de pagamento, público atendido e site.
- Nunca faça diagnóstico, triagem clínica, prognóstico, prescrição, ajuste de medicamento, interpretação de exames ou recomendação terapêutica.
- Não solicite história clínica detalhada, documentos médicos, exames ou outros dados de saúde.
- Se a mensagem exigir avaliação clínica, diga que o canal automatizado não realiza orientação clínica e ofereça agendamento ou atendimento humano.
- Se parecer urgência, oriente serviço de urgência/SAMU 192.
- Não invente horários disponíveis.
- Não invente políticas, endereços ou serviços não informados.

DADOS ADMINISTRATIVOS:
Nome: ${clinicConfig.doctorName}
Registro: ${clinicConfig.crm}
Consulta online: R$ ${clinicConfig.onlinePrice},00
Consulta domiciliar: R$ ${clinicConfig.homePrice},00
Público: ${clinicConfig.audiences}
Escopo: ${clinicConfig.scope}
Site: ${clinicConfig.siteUrl}
PIX: ${clinicConfig.pixKey || "informado pela equipe"}
Agendamento: ${clinicConfig.bookingUrl || "por atendimento humano nesta conversa"}`,
    input: text
  });

  return (
    response.output_text?.trim() ||
    "Digite MENU para consultar as opções de atendimento."
  );
}

async function routeMessage(phone, rawText) {
  const text = rawText || "";
  const t = normalize(text);

  if (t === "menu" || t === "inicio" || t === "voltar") {
    states.delete(phone);
    return MENU;
  }

  if (inHumanMode(phone)) {
    return null;
  }

  if (isEmergency(text)) {
    setHumanMode(phone);
    return EMERGENCY_MESSAGE;
  }

  if (["6", "atendente", "humano", "falar com a equipe"].includes(t)) {
    setHumanMode(phone);
    return `👤 Atendimento humano solicitado.

O assistente automático ficará pausado nesta conversa por algumas horas para permitir a continuidade pela equipe.

Se quiser reativar o menu automático, digite MENU.`;
  }

  if (t === "1" || t.includes("agendar") || t.includes("marcar consulta")) {
    return bookingMessage();
  }

  if (t === "2" || t.includes("consulta online") || t.includes("teleconsulta")) {
    return `💻 Consulta online: R$ ${clinicConfig.onlinePrice},00.

${bookingMessage("online")}`;
  }

  if (t === "3" || t.includes("consulta domiciliar") || t.includes("domicilio")) {
    return `🏠 Consulta domiciliar: R$ ${clinicConfig.homePrice},00, conforme disponibilidade e localidade.

${bookingMessage("domiciliar")}`;
  }

  if (
    t === "4" ||
    t.includes("valor") ||
    t.includes("preco") ||
    t.includes("pagamento") ||
    t.includes("pix")
  ) {
    return priceMessage();
  }

  if (
    t === "5" ||
    t.includes("atende crianca") ||
    t.includes("atende gestante") ||
    t.includes("atende adulto") ||
    t.includes("atende idoso") ||
    t.includes("informacoes")
  ) {
    return infoMessage();
  }

  if (seemsClinical(text)) {
    return `Este assistente é apenas administrativo e não realiza orientação clínica, diagnóstico, prescrição ou interpretação de exames.

Para avaliação médica, digite 1 para agendar. Para falar com a equipe, digite 6.

Em caso de urgência, procure um serviço de urgência ou acione o SAMU pelo 192.`;
  }

  return answerAdministrativeQuestion(text);
}

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "WhatsApp Bot - Dr. Samuel",
    webhook: "/webhook"
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  if (!verifyMetaSignature(req)) {
    return res.sendStatus(401);
  }

  // Confirma rapidamente o recebimento do webhook para a Meta.
  res.sendStatus(200);

  const incoming = extractIncomingMessage(req.body);
  if (!incoming?.from || !incoming?.text) return;

  if (incoming.id) {
    if (processedIds.has(incoming.id)) return;
    processedIds.add(incoming.id);
    if (processedIds.size > 5000) processedIds.clear();
  }

  try {
    const reply = await routeMessage(incoming.from, incoming.text);
    if (reply) await sendText(incoming.from, reply);
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
    try {
      await sendText(
        incoming.from,
        "Tivemos uma instabilidade no atendimento automático. Digite MENU para tentar novamente ou ATENDENTE para falar com a equipe."
      );
    } catch (sendError) {
      console.error("Erro ao enviar fallback:", sendError);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
