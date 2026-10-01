export const config = {
  brand: process.env.BOT_BRAND_NAME || 'Dr. Samuel Sousa',
  crm: process.env.BOT_CRM || 'CRM-RN 12780',
  site: process.env.BOT_SITE || 'https://drsamuelsousa.com.br',
  priceOnline: process.env.PRICE_ONLINE || '270',
  priceHome: process.env.PRICE_HOME || '400',
  priceSpecial: process.env.PRICE_SPECIAL || '170',
  teamLabel: process.env.TEAM_LABEL || 'equipe do Dr. Samuel',
  verifyToken: process.env.META_VERIFY_TOKEN || '',
  accessToken: process.env.META_ACCESS_TOKEN || '',
  phoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
  appSecret: process.env.META_APP_SECRET || '',
  graphVersion: process.env.META_GRAPH_API_VERSION || 'v23.0',
  adminToken: process.env.ADMIN_TOKEN || ''
};
