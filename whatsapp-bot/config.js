export const clinicConfig = {
  doctorName: process.env.DOCTOR_NAME || "Dr. Samuel Felipe Barbosa de Sousa",
  crm: process.env.CRM || "CRM-RN 12780",
  siteUrl: process.env.SITE_URL || "https://drsamuelsousa.com.br",
  bookingUrl: process.env.BOOKING_URL || "",
  onlinePrice: process.env.ONLINE_PRICE || "270",
  homePrice: process.env.HOME_PRICE || "400",
  specialPrice: process.env.SPECIAL_PRICE || "170",
  specialEligibility: "beneficiários do Programa Bolsa Família, mediante comprovação, e pacientes atendidos na Clínica Fisionutri, em Goianinha/RN",
  pixKey: process.env.PIX_KEY || "",
  audiences: "crianças, gestantes, adultos e idosos",
  scope:
    "atendimento clínico e de Medicina de Família, com consulta online e consulta domiciliar conforme disponibilidade"
};
