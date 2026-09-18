# Chatbot administrativo para WhatsApp Business

Backend inicial para o atendimento do Dr. Samuel Felipe Barbosa de Sousa, integrado à **WhatsApp Business Platform / Cloud API** da Meta e, opcionalmente, à **OpenAI Responses API**.

## O que já está implementado

- Verificação de webhook da Meta.
- Recebimento de mensagens do WhatsApp.
- Envio de respostas pela Cloud API.
- Menu administrativo.
- Informações de consulta online e domiciliar.
- Valores e PIX configuráveis.
- Orientação de agendamento.
- Perguntas administrativas em linguagem natural usando OpenAI.
- Bloqueio de respostas clínicas pelo assistente automatizado.
- Mensagem específica para possíveis urgências.
- Pausa automática do bot quando o usuário solicita atendimento humano.
- Verificação opcional da assinatura `X-Hub-Signature-256`.
- `store: false` nas chamadas da Responses API.

## 1. Configuração local

Requer Node.js 20 ou superior.

```bash
cd whatsapp-bot
cp .env.example .env
npm install
npm start
```

Acesse:

```
http://localhost:3000/health
```

## 2. Variáveis da Meta

Preencha no `.env`:

- `META_VERIFY_TOKEN`: token definido por você para validar o webhook.
- `META_ACCESS_TOKEN`: token da WhatsApp Business Platform.
- `META_PHONE_NUMBER_ID`: ID do número no painel da Meta.
- `META_APP_SECRET`: segredo do aplicativo Meta; recomendado para validar a assinatura do webhook.
- `META_GRAPH_VERSION`: versão vigente da Graph API exibida/documentada pela Meta.

Nunca publique o arquivo `.env` no GitHub.

## 3. OpenAI

Para respostas administrativas em linguagem natural:

```
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
```

Sem uma chave OpenAI o menu principal continua funcionando; apenas a resposta livre por IA fica desativada.

## 4. Agenda

A forma mais simples para a primeira versão é preencher:

```
BOOKING_URL=https://...
```

Pode ser um link de agendamento que mostre somente horários disponíveis. Assim o bot não precisa armazenar dados clínicos nem manter uma agenda própria.

Uma integração direta com Google Calendar pode ser acrescentada em uma segunda etapa.

## 5. Configuração do webhook na Meta

Depois de hospedar o servidor em HTTPS, use:

```
https://SEU-SERVIDOR/webhook
```

como URL de callback e informe o mesmo valor de `META_VERIFY_TOKEN` como token de verificação.

Inscreva o aplicativo nos eventos de mensagens do WhatsApp.

Documentação oficial da Meta:
- https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started
- https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages
- https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages

## 6. Hospedagem

O projeto inclui um `Dockerfile` e pode ser hospedado em um serviço que execute contêineres/Node.js e forneça HTTPS público.

Defina todas as variáveis do `.env` como secrets/variáveis privadas do provedor de hospedagem.

## 7. Atendimento humano

Quando o usuário digita `6`, `ATENDENTE` ou `HUMANO`, o bot pausa respostas para aquele telefone por 12 horas. A palavra `MENU` reativa o bot.

Para produção, use uma caixa de entrada compatível com a WhatsApp Business Platform para que a equipe possa assumir a conversa. O estado de handoff deve ser migrado para um banco/Redis caso o serviço rode em múltiplas instâncias.

## 8. Segurança e contexto médico

O bot foi desenhado como **assistente administrativo**, não como substituto de consulta médica.

Ele não deve:

- diagnosticar;
- sugerir tratamento;
- prescrever ou ajustar medicamentos;
- interpretar exames;
- realizar triagem clínica automatizada;
- solicitar história clínica detalhada.

A mensagem inicial informa que há automação/IA. Mensagens clínicas são direcionadas para consulta ou atendimento humano.

A Resolução CFM nº 2.454/2026 deve ser considerada na implantação e governança do uso de IA em contexto médico.

## 9. Próximos passos para produção

1. Criar/configurar o aplicativo no Meta for Developers.
2. Vincular o número profissional à WhatsApp Business Platform.
3. Hospedar este backend em HTTPS.
4. Cadastrar as variáveis privadas.
5. Configurar e validar o webhook.
6. Testar com o número de teste da Meta.
7. Definir o link de agenda.
8. Testar o handoff para atendimento humano.
9. Só então ativar no número profissional.
