const menuButton = document.querySelector('.menu-button');
const menu = document.querySelector('.main-menu');

menuButton?.addEventListener('click', () => {
  const isOpen = menu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.main-menu a').forEach((link) => {
  link.addEventListener('click', () => {
    menu.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}

const copyPixButton = document.querySelector('#copy-pix');
copyPixButton?.addEventListener('click', async () => {
  const status = document.querySelector('#pix-status');
  const keyElement = document.querySelector('#pix-key');
  const key = keyElement.textContent.replace(/\D/g, '');
  try {
    await navigator.clipboard.writeText(key);
    status.textContent = 'Chave Pix copiada!';
  } catch {
    status.textContent = 'Selecione a chave acima e copie para usar no aplicativo do banco.';
  }
});


const bookingForm = document.querySelector('#booking-form');
const bookingModality = document.querySelector('#booking-modality');

document.querySelectorAll('.js-open-booking').forEach((link) => {
  link.addEventListener('click', () => {
    const modality = link.dataset.modality;
    if (bookingModality && modality) {
      bookingModality.value = modality;
    }
    setTimeout(() => document.querySelector('#booking-name')?.focus(), 450);
  });
});

bookingForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.querySelector('#booking-name')?.value.trim();
  const age = document.querySelector('#booking-age')?.value.trim();
  const modality = bookingModality?.value;
  const reason = document.querySelector('#booking-reason')?.value.trim();
  const status = document.querySelector('#booking-status');

  const modalityLabels = {
    online: 'Consulta on-line',
    domiciliar: 'Consulta domiciliar',
    presencial: 'Consulta presencial / outra modalidade',
    especial: 'Condição especial de atendimento'
  };

  if (!name || !age || !modality) {
    if (status) status.textContent = 'Preencha nome, idade e modalidade para continuar.';
    return;
  }

  const lines = [
    'Olá! Gostaria de solicitar um agendamento com o Dr. Samuel Sousa.',
    '',
    `Nome: ${name}`,
    `Idade: ${age} anos`,
    `Modalidade: ${modalityLabels[modality] || modality}`
  ];

  if (reason) {
    lines.push(`Motivo da consulta: ${reason}`);
  }

  lines.push('', 'Aguardo informações sobre disponibilidade de horário. Obrigado(a)!');

  const whatsappUrl = `https://wa.me/5584921866240?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

  if (status) status.textContent = 'Abrindo o WhatsApp com sua mensagem preenchida...';
});
