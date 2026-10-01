import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

const mem = globalThis.__clinicBotMem || {
  contacts: new Map(),
  messages: [],
  appointments: [],
  tickets: []
};
if (!globalThis.__clinicBotMem) globalThis.__clinicBotMem = mem;

let initialized = false;

async function initDb() {
  if (!pool || initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      phone TEXT PRIMARY KEY,
      profile_name TEXT,
      state TEXT,
      state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      bot_paused BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      direction TEXT NOT NULL,
      message_text TEXT,
      intent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id UUID PRIMARY KEY,
      phone TEXT NOT NULL,
      profile_name TEXT,
      modality TEXT,
      preferred_time TEXT,
      reason_category TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id UUID PRIMARY KEY,
      phone TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'open',
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  initialized = true;
}

function defaultContact(phone, profileName = '') {
  return {
    phone,
    profile_name: profileName,
    state: null,
    state_data: {},
    bot_paused: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export async function getContact(phone) {
  await initDb();
  if (!pool) return mem.contacts.get(phone) || defaultContact(phone);
  const { rows } = await pool.query('SELECT * FROM contacts WHERE phone=$1', [phone]);
  return rows[0] || defaultContact(phone);
}

export async function saveContact(contact) {
  await initDb();
  const merged = { ...defaultContact(contact.phone), ...contact, updated_at: new Date().toISOString() };
  if (!pool) {
    mem.contacts.set(contact.phone, merged);
    return merged;
  }
  const { rows } = await pool.query(`
    INSERT INTO contacts (phone, profile_name, state, state_data, bot_paused, updated_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT (phone) DO UPDATE SET
      profile_name=EXCLUDED.profile_name,
      state=EXCLUDED.state,
      state_data=EXCLUDED.state_data,
      bot_paused=EXCLUDED.bot_paused,
      updated_at=NOW()
    RETURNING *
  `, [merged.phone, merged.profile_name, merged.state, JSON.stringify(merged.state_data || {}), !!merged.bot_paused]);
  return rows[0];
}

export async function logMessage(phone, direction, text, intent = null) {
  await initDb();
  if (!pool) {
    mem.messages.unshift({ id: mem.messages.length + 1, phone, direction, message_text: text, intent, created_at: new Date().toISOString() });
    return;
  }
  await pool.query('INSERT INTO messages (phone,direction,message_text,intent) VALUES ($1,$2,$3,$4)', [phone, direction, text, intent]);
}

export async function createAppointment(data) {
  await initDb();
  const row = { id: crypto.randomUUID(), status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data };
  if (!pool) {
    mem.appointments.unshift(row);
    return row;
  }
  const { rows } = await pool.query(`
    INSERT INTO appointments (id, phone, profile_name, modality, preferred_time, reason_category, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
  `, [row.id, row.phone, row.profile_name, row.modality, row.preferred_time, row.reason_category, row.status]);
  return rows[0];
}

export async function createTicket(data) {
  await initDb();
  const row = { id: crypto.randomUUID(), status: 'open', priority: 'normal', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data };
  if (!pool) {
    mem.tickets.unshift(row);
    return row;
  }
  const { rows } = await pool.query(`
    INSERT INTO tickets (id, phone, category, priority, status, note)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
  `, [row.id, row.phone, row.category, row.priority, row.status, row.note || null]);
  return rows[0];
}

export async function listAppointments(limit = 100) {
  await initDb();
  if (!pool) return mem.appointments.slice(0, limit);
  const { rows } = await pool.query('SELECT * FROM appointments ORDER BY created_at DESC LIMIT $1', [limit]);
  return rows;
}

export async function listTickets(limit = 100) {
  await initDb();
  if (!pool) return mem.tickets.slice(0, limit);
  const { rows } = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC LIMIT $1', [limit]);
  return rows;
}

export async function listConversations(limit = 100) {
  await initDb();
  if (!pool) {
    return Array.from(mem.contacts.values()).sort((a,b) => new Date(b.updated_at)-new Date(a.updated_at)).slice(0, limit);
  }
  const { rows } = await pool.query('SELECT * FROM contacts ORDER BY updated_at DESC LIMIT $1', [limit]);
  return rows;
}

export async function updateAppointmentStatus(id, status) {
  await initDb();
  if (!pool) {
    const item = mem.appointments.find(x => x.id === id);
    if (item) { item.status = status; item.updated_at = new Date().toISOString(); }
    return item || null;
  }
  const { rows } = await pool.query('UPDATE appointments SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *', [id, status]);
  return rows[0] || null;
}

export async function updateTicketStatus(id, status) {
  await initDb();
  if (!pool) {
    const item = mem.tickets.find(x => x.id === id);
    if (item) { item.status = status; item.updated_at = new Date().toISOString(); }
    return item || null;
  }
  const { rows } = await pool.query('UPDATE tickets SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *', [id, status]);
  return rows[0] || null;
}
