import Link from 'next/link';
export default function Home() {
  return (
    <main className="center">
      <div className="card hero">
        <span className="eyebrow">WhatsApp Business</span>
        <h1>Assistente do Dr. Samuel Sousa</h1>
        <p>Bot administrativo para agendamentos, informações, triagem de urgência e transferência para atendimento humano.</p>
        <Link className="button" href="/admin">Abrir painel</Link>
      </div>
    </main>
  );
}
