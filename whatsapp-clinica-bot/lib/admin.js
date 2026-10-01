import { config } from './config';

export function isAdmin(request) {
  if (!config.adminToken) return false;
  const auth = request.headers.get('authorization') || '';
  return auth === `Bearer ${config.adminToken}`;
}
