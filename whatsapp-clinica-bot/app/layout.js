import './globals.css';

export const metadata = {
  title: 'Painel WhatsApp — Dr. Samuel Sousa',
  description: 'Painel administrativo do chatbot de WhatsApp'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
