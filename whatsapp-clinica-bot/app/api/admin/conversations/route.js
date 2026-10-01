import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../lib/admin';
import { listConversations } from '../../../../lib/store';
export const runtime = 'nodejs';
export async function GET(request) {
  if (!isAdmin(request)) return new Response('Unauthorized', { status: 401 });
  return NextResponse.json(await listConversations());
}
