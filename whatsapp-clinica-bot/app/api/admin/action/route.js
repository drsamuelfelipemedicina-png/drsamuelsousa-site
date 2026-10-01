import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../lib/admin';
import { getContact, saveContact, updateAppointmentStatus, updateTicketStatus } from '../../../../lib/store';
export const runtime = 'nodejs';

export async function POST(request) {
  if (!isAdmin(request)) return new Response('Unauthorized', { status: 401 });
  const body = await request.json();

  if (body.type === 'conversation') {
    const contact = await getContact(body.phone);
    contact.bot_paused = body.action === 'pause';
    if (!contact.bot_paused) contact.state = null;
    const saved = await saveContact(contact);
    return NextResponse.json(saved);
  }

  if (body.type === 'appointment') {
    const saved = await updateAppointmentStatus(body.id, body.status);
    return NextResponse.json(saved || {}, { status: saved ? 200 : 404 });
  }

  if (body.type === 'ticket') {
    const saved = await updateTicketStatus(body.id, body.status);
    return NextResponse.json(saved || {}, { status: saved ? 200 : 404 });
  }

  return new Response('Bad request', { status: 400 });
}
