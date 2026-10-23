// Address ↔ screen map (design PDF, section 10.1). The app keeps its screen in React state;
// these two functions keep the browser address in sync so Back, reload and shared links work.
export type Route = {
  page: string;            // explore, guide, login, register, forgot, reset, home, mine, create, apply, available, assigned, account, saved, admin
  trade?: string;          // catalog filtered by trade (/oficios/:slug)
  providerId?: string;     // public profile
  requestId?: string;      // opened request (client) or opportunity / job (provider)
  adminTab?: string;       // /admin/:tab
  personId?: string;       // /admin/personas/:id
  token?: string;          // /restablecer/:token
};

export const slug = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const simple: Record<string, string> = {
  guide: '/como-funciona', login: '/entrar', register: '/registro', forgot: '/recuperar', home: '/inicio',
  mine: '/solicitudes', create: '/solicitudes/nueva', apply: '/mi-perfil-proveedor', available: '/oportunidades',
  assigned: '/trabajos', account: '/cuenta', saved: '/guardados',
};

export function pathFor(r: Route): string {
  if (r.providerId) return '/proveedores/' + encodeURIComponent(r.providerId);
  if (r.page === 'admin') {
    if (r.personId) return '/admin/personas/' + encodeURIComponent(r.personId);
    return r.adminTab && r.adminTab !== 'tablero' ? '/admin/' + r.adminTab : '/admin';
  }
  if (r.page === 'reset' && r.token) return '/restablecer/' + encodeURIComponent(r.token);
  if (r.requestId) {
    const base = r.page === 'available' ? '/oportunidades/' : r.page === 'assigned' ? '/trabajos/' : '/solicitudes/';
    return base + encodeURIComponent(r.requestId);
  }
  if (r.page === 'explore') return r.trade ? '/oficios/' + slug(r.trade) : '/';
  return simple[r.page] || '/';
}

export function parsePath(pathname: string, tradeNames: string[]): Route {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const [first, second, third] = parts;
  if (!first) return { page: 'explore' };
  if (first === 'oficios') return { page: 'explore', trade: tradeNames.find(t => slug(t) === second) };
  if (first === 'proveedores' && second) return { page: 'explore', providerId: second };
  if (first === 'restablecer' && second) return { page: 'reset', token: second };
  if (first === 'admin') {
    if (second === 'personas' && third) return { page: 'admin', adminTab: 'personas', personId: third };
    return { page: 'admin', adminTab: second || 'tablero' };
  }
  if (first === 'solicitudes' && second === 'nueva') return { page: 'create' };
  if (first === 'solicitudes' && second) return { page: 'mine', requestId: second };
  if (first === 'oportunidades' && second) return { page: 'available', requestId: second };
  if (first === 'trabajos' && second) return { page: 'assigned', requestId: second };
  const page = Object.entries(simple).find(([, p]) => p === '/' + first)?.[0];
  return { page: page || 'explore' };
}
