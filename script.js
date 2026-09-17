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
