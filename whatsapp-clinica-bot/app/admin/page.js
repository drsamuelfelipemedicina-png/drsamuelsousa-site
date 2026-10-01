'use client';

import { useEffect, useState } from 'react';

function Status({ value }) { return <span className={`pill ${value}`}>{value}</span>; }

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { setToken(sessionStorage.getItem('admin_token') || ''); }, []);

  async function api(path, options={}) {
    const r = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return r.json();
  }

  async function load() {
    try {
      setError('');
      sessionStorage.setItem('admin_token', token);
      const [a,t,c] = await Promise.all([
        api('/api/admin/appointments'), api('/api/admin/tickets'), api('/api/admin/conversations')
      ]);
      setAppointments(a); setTickets(t); setConversations(c);
    } catch (e) { setError(e.message); }
  }

  async function action(body) {
    try { await api('/api/admin/action', { method: 'POST', body: JSON.stringify(body) }); await load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <main className="admin">
      <header>
        <div>
          <span className="eyebrow">Painel administrativo</span>
          <h1>WhatsApp — Dr. Samuel Sousa</h1>
        </div>
        <div className="tokenBox">
          <input type="password" placeholder="ADMIN_TOKEN" value={token} onChange={e=>setToken(e.target.value)} />
          <button onClick={load}>Entrar / atualizar</button>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <section>
        <h2>Solicitações de consulta</h2>
        <div className="grid">
          {appointments.map(a => <article className="card" key={a.id}>
            <div className="row"><strong>{a.profile_name || a.phone}</strong><Status value={a.status}/></div>
            <p>{a.modality} · {a.reason_category}</p>
            <p><b>Preferência:</b> {a.preferred_time}</p>
            <small>{a.phone}</small>
            <div className="actions">
              <button onClick={()=>action({type:'appointment', id:a.id, status:'confirmed'})}>Confirmar</button>
              <button className="secondary" onClick={()=>action({type:'appointment', id:a.id, status:'contacted'})}>Contato feito</button>
              <button className="ghost" onClick={()=>action({type:'appointment', id:a.id, status:'cancelled'})}>Cancelar</button>
            </div>
          </article>)}
          {!appointments.length && <p className="muted">Nenhuma solicitação carregada.</p>}
        </div>
      </section>

      <section>
        <h2>Fila humana</h2>
        <div className="grid">
          {tickets.map(t => <article className="card" key={t.id}>
            <div className="row"><strong>{t.category}</strong><Status value={t.priority}/></div>
            <p>{t.note || 'Sem observação'}</p>
            <small>{t.phone}</small>
            <div className="actions">
              <button onClick={()=>action({type:'ticket', id:t.id, status:'closed'})}>Concluir</button>
            </div>
          </article>)}
          {!tickets.length && <p className="muted">Nenhum chamado carregado.</p>}
        </div>
      </section>

      <section>
        <h2>Conversas</h2>
        <div className="tableWrap">
          <table><thead><tr><th>Paciente</th><th>Telefone</th><th>Bot</th><th>Estado</th><th>Ação</th></tr></thead>
            <tbody>{conversations.map(c => <tr key={c.phone}>
              <td>{c.profile_name || '—'}</td><td>{c.phone}</td><td>{c.bot_paused ? 'Humano' : 'Ativo'}</td><td>{c.state || '—'}</td>
              <td>{c.bot_paused
                ? <button onClick={()=>action({type:'conversation', phone:c.phone, action:'resume'})}>Reativar bot</button>
                : <button className="secondary" onClick={()=>action({type:'conversation', phone:c.phone, action:'pause'})}>Assumir conversa</button>}
              </td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
