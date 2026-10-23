'use client';
import { ArrowRight, BriefcaseBusiness, ChevronLeft, MapPin, ShieldCheck, Star } from 'lucide-react';
import { providerImage } from '../../lib/design-images';
import { RemoteImage } from './remote-image';

type WorkFile = { id: string; kind: 'before' | 'after'; request: string };
type Review = { stars?: number; comment?: string };
type Provider = {
  id: string; name: string; photo?: string; trade: string; zone: string;
  experience: string; description: string; works: WorkFile[]; reviews: Review[];
};

export function ProfilePage({ provider, onBack, onRequest }: {
  provider: Provider; onBack: () => void; onRequest: () => void;
}) {
  const photo = providerImage(provider);
  const demo = provider.id.startsWith('catalog-provider-') || provider.id === 'demo-proveedor' || provider.id === 'presentation-provider-login';
  const works = Object.values(provider.works.reduce<Record<string, { request: string; before?: WorkFile; after?: WorkFile }>>((acc, file) => {
    const group = acc[file.request] ||= { request: file.request };
    group[file.kind] = file;
    return acc;
  }, {}));
  const ratings = provider.reviews.map(review => review.stars).filter((n): n is number => typeof n === 'number');
  const rating = ratings.length ? (ratings.reduce((sum, n) => sum + n, 0) / ratings.length).toFixed(1) : null;
  return <div className="profile-page">
    <button className="back" onClick={onBack}><ChevronLeft size={18}/> Volver a profesionales</button>
    <section className="profile-intro">
      <figure className="profile-portrait"><RemoteImage className="profile-photo" src={photo.src} alt={photo.illustrative ? 'Imagen ilustrativa del oficio' : demo ? 'Imagen ilustrativa del perfil ficticio' : `Fotografía de ${provider.name}`} width={400} height={500}/>{(photo.illustrative || demo) && <figcaption>{demo ? 'Perfil ficticio de demostración' : 'Imagen ilustrativa · No es una fotografía del profesional'}</figcaption>}</figure>
      <div className="profile-summary">
        <span className="verified"><ShieldCheck size={15}/> Perfil aprobado por Trade</span>
        <p className="approval-note">Aprobación administrativa interna de Trade.</p>
        <h1>{provider.name} <span>· {provider.trade}</span></h1>
        <p className="profile-zone"><MapPin size={18}/>{provider.zone}</p>
        <p className="profile-rating"><Star size={19} fill={rating ? 'currentColor' : 'none'}/>{rating ? <><strong>{rating}</strong> ({ratings.length} {ratings.length === 1 ? 'reseña' : 'reseñas'})</> : 'Sin reseñas'}</p>
        <p className="profile-description">{provider.description}</p>
        <button className="primary" onClick={onRequest}>Publicar solicitud <ArrowRight size={18}/></button>
      </div>
      <aside className="profile-facts"><h2>Sobre su trabajo</h2><div><BriefcaseBusiness size={22}/><span><strong>Experiencia</strong>{provider.experience}</span></div><div><MapPin size={22}/><span><strong>Zona de servicio</strong>{provider.zone}</span></div><div><ShieldCheck size={22}/><span><strong>Oficio</strong>{provider.trade}</span></div></aside>
    </section>
    <section className="profile-section" aria-labelledby="profile-work-title"><div className="section-head"><div><h2 id="profile-work-title">Trabajos completados</h2><p>Fotografías compartidas en servicios completados de Trade.</p></div></div>
      {works.length ? <div className="profile-work-grid">{works.map(work => <article className="work-card" key={work.request}><div className="work-pair">{(['before', 'after'] as const).map(kind => <figure key={kind}>{work[kind] ? <RemoteImage src={'/api/files/' + encodeURIComponent(work[kind].id)} alt={kind === 'before' ? 'Evidencia antes del trabajo' : 'Evidencia después del trabajo'} loading="lazy"/> : <span className="work-missing">Sin foto</span>}<figcaption>{kind === 'before' ? 'Antes' : 'Después'}</figcaption></figure>)}</div><p>{provider.trade} · Servicio completado{demo ? ' · Ejemplo ficticio' : ''}</p></article>)}</div>
        : <div className="empty profile-empty"><BriefcaseBusiness size={32}/><h3>Aún no hay trabajos publicados</h3><p>Las evidencias aparecerán cuando se complete un servicio y se compartan fotografías.</p></div>}
    </section>
    <section className="profile-section" aria-labelledby="profile-reviews-title"><div className="section-head"><div><h2 id="profile-reviews-title">Reseñas</h2><p>Opiniones registradas por clientes de servicios completados.</p></div></div>
      {provider.reviews.length ? <div className="profile-reviews">{provider.reviews.map((review, i) => <article className="review-card" key={i}><p className="review-stars">{review.stars ? <><Star size={19} fill="currentColor"/> {review.stars}/5</> : 'Sin calificación'}</p><p>{review.comment || 'Sin comentario'}</p>{demo && <small>Reseña ficticia de demostración</small>}</article>)}</div>
        : <div className="empty profile-empty"><Star size={32}/><h3>Aún no hay reseñas</h3><p>Las reseñas aparecerán después de que un cliente evalúe un servicio completado.</p></div>}
    </section>
  </div>;
}
