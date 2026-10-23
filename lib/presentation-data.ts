import { Binary, type Db } from 'mongodb';
import { catalog } from './catalog-seed';
import { passwordHash } from './rules';

export const presentationIds = ['presentation-active', 'presentation-assigned', 'presentation-finished', 'presentation-completed', 'presentation-new'];
type Assets = { profile: Uint8Array; document: Uint8Array; before: Uint8Array; after: Uint8Array; trades: Record<string, Uint8Array> };

// Only these reserved fixture IDs are updated. No user-created records are deleted.
export async function preparePresentation(db: Db, assets: Assets) {
  const save = (collection: string, key: string, doc: any) => db.collection(collection).updateOne({ [key]: doc[key] }, { $set: doc }, { upsert: true });
  const user = async (id: string, name: string, role: string) => {
    const salt = crypto.randomUUID();
    await db.collection('users').updateOne({ id }, { $set: { name, role }, $setOnInsert: { id, email: `${id}@trade.example`, active: true, salt, hash: await passwordHash(crypto.randomUUID(), salt) } }, { upsert: true });
  };
  const file = async (id: string, owner: string, kind: string, bytes: Uint8Array, request: string | null = null, mime = 'image/png') => {
    await db.collection('file_objects').updateOne({ _id: id as any }, { $set: { data: new Binary(bytes) } }, { upsert: true });
    await save('files', 'id', { id, owner, kind, request, mime });
    return id;
  };
  const now = new Date();
  const day = (offset: number) => new Date(now.getTime() + offset * 86400000).toISOString().slice(0, 10);
  await user('demo-cliente', 'Ana López · Cliente demo', 'cliente');
  await user('demo-proveedor', 'Luis Ramírez · Proveedor demo', 'proveedor');
  await user('demo-admin', 'Administración · Demo', 'admin');
  await user('catalog-client', 'Cliente ficticio · Catálogo', 'cliente');
  // Rerunning this explicit preparation resets only the five presentation cases.
  await db.collection('quotes').deleteMany({ request: { $in: presentationIds } });
  await db.collection('reviews').deleteMany({ request: { $in: presentationIds } });

  for (let i = 0; i < catalog.length; i++) {
    const [name, trade, experience, zone, description, , stars, job] = catalog[i];
    const id = `catalog-provider-${i + 1}`, request = `${id}-service`, quote = `${id}-quote`;
    await user(id, `${name} · Demo`, 'proveedor');
    const photo = await file(`${id}-avatar`, id, 'photo', assets.trades[trade] || assets.profile);
    const document = await file(`${id}-document`, id, 'document', assets.document);
    await save('providers', 'id', { id, trade, experience, zone, description: `${description} Perfil e imágenes ficticios para demostración.`, photo, document, status: 'Aprobada', active: true });
    await save('requests', 'id', { id: request, owner: 'catalog-client', trade, description: `${job} · Ejemplo ficticio de catálogo`, date: day(-3), status: 'Completado', provider: id, quote, created: new Date(now.getTime() - 4 * 86400000).toISOString() });
    await save('quotes', 'id', { id: quote, request, provider: id, price: 650 + i * 125, description: `Ejemplo ficticio: diagnóstico, mano de obra y limpieza para ${job.toLowerCase()}. Sin pagos reales.`, status: 'Aceptada' });
    await save('reviews', 'request', { request, provider: id, owner: 'catalog-client', stars, comment: `Reseña ficticia: ${job} realizado según lo acordado. Buena comunicación y área de trabajo limpia.` });
    // The existing before/after artwork specifically illustrates plumbing. Other trades get
    // clearly labelled schematic evidence matching their own job, never unrelated photographs.
    for (const kind of ['before', 'after'] as const) {
      const before = kind === 'before';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600"><rect width="960" height="600" rx="28" fill="#fbf7f2"/><rect x="30" y="30" width="900" height="540" rx="20" fill="#f4e9de"/><text x="70" y="110" font-family="Arial" font-size="22" fill="#6c625c">EVIDENCIA FICTICIA · ${trade.toUpperCase()}</text><text x="70" y="190" font-family="Arial" font-size="42" font-weight="bold" fill="#1d1b19">${before ? 'Antes del servicio' : 'Después del servicio'}</text><path d="${before ? 'M110 330h190m-70-70v140m90-70h100' : 'M110 330l65 65 135-145'}" fill="none" stroke="${before ? '#b94f34' : '#2d6a4f'}" stroke-width="18" stroke-linecap="round"/><text x="70" y="465" font-family="Arial" font-size="28" fill="#1d1b19">${job}</text><text x="70" y="515" font-family="Arial" font-size="22" fill="#6c625c">${before ? 'Situación inicial registrada para la presentación.' : 'Resultado revisado y confirmado por el cliente de ejemplo.'}</text></svg>`;
      await file(`${request}-${kind}`, id, kind, trade === 'Plomería' ? assets[kind] : new TextEncoder().encode(svg), request, trade === 'Plomería' ? 'image/png' : 'image/svg+xml');
    }
  }
  for (const id of ['demo-proveedor', 'presentation-applicant']) {
    if (id === 'presentation-applicant') await user(id, 'Sofía Méndez · Solicitud demo', 'cliente');
    const photo = await file(`${id}-photo`, id, 'photo', assets.trades['Plomería'] || assets.profile);
    const document = await file(`${id}-document`, id, 'document', assets.document);
    await save('providers', 'id', { id, trade: 'Plomería', experience: '8 años en reparaciones e instalaciones residenciales.', zone: 'León Centro, Guanajuato', description: 'Diagnóstico y reparación de fugas, cambio de conexiones y mantenimiento de lavabos. Perfil ficticio preparado para explicar el flujo de Trade.', photo, document, status: id === 'demo-proveedor' ? 'Aprobada' : 'Pendiente', active: true });
  }
  const scenarios = [
    ['Activa', 'Fuga debajo del lavabo · Recibir cotizaciones', 'El sifón del lavabo tiene una fuga y moja el mueble. Necesito revisar las conexiones y conocer qué piezas deben reemplazarse.'],
    ['Asignada', 'Cambio de mezcladora · Trabajo en curso', 'Cambiar la mezcladora del lavabo y revisar que las conexiones queden selladas. La cotización ya fue aceptada por Ana.'],
    ['Terminado', 'Reparación de tubería · Confirmar resultado', 'La fuga fue reparada y Luis cargó las evidencias. Ana debe revisar el resultado y confirmar que el servicio quedó completado.'],
    ['Completado', 'Mantenimiento de lavabo · Servicio evaluado', 'Se reemplazó el sifón, se sellaron las conexiones y se verificó que no hubiera fugas. El cliente confirmó y dejó su reseña.'],
  ];
  for (let i = 0; i < scenarios.length; i++) {
    const [status, title, description] = scenarios[i], id = presentationIds[i], quote = `${id}-quote`, assigned = i > 0;
    await save('requests', 'id', { id, owner: 'demo-cliente', trade: 'Plomería', description: `${title}. ${description} Caso ficticio de presentación.`, date: day(i === 3 ? -1 : 1), status, provider: assigned ? 'demo-proveedor' : null, quote: assigned ? quote : null, created: new Date(now.getTime() + i * 1000).toISOString() });
    await save('quotes', 'id', { id: quote, request: id, provider: 'demo-proveedor', price: [950, 1250, 780, 650][i], description: 'Incluye diagnóstico, mano de obra, conexiones de ejemplo, prueba de fugas y limpieza. Cotización en MXN; la demo no procesa pagos.', status: assigned ? 'Aceptada' : 'Pendiente' });
    await file(`${id}-problem`, 'demo-cliente', 'problem', assets.before, id);
    if (assigned) for (const kind of ['before', 'after'] as const) await file(`${id}-${kind}`, 'demo-proveedor', kind, assets[kind], id);
    if (i === 3) await save('reviews', 'request', { request: id, provider: 'demo-proveedor', owner: 'demo-cliente', stars: 5, comment: 'Reseña ficticia: Luis explicó la reparación, terminó lo acordado y dejó el área limpia. El lavabo funciona sin fugas.' });
  }
  await save('requests', 'id', { id: 'presentation-new', owner: 'demo-cliente', trade: 'Plomería', description: 'Solicitud nueva · Cotizar en vivo. Hay una fuga en la conexión del lavabo. Solicito diagnóstico y reparación de la conexión. Caso ficticio, sin cotizaciones todavía.', date: day(1), status: 'Activa', provider: null, quote: null, created: new Date(now.getTime() + 5000).toISOString() });
  await file('presentation-new-problem', 'demo-cliente', 'problem', assets.before, 'presentation-new');
  return { preparedRequests: presentationIds.length, catalogProviders: catalog.length, pendingApplication: 'presentation-applicant', note: 'Solo se actualizaron los ejemplos identificados de presentación; los registros creados por usuarios se conservaron.' };
}
