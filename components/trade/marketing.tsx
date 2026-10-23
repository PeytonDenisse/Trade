'use client';
import { ArrowRight, ChevronRight, Droplets, Hammer, ShieldCheck, Star, MapPin, Zap, KeyRound, PaintRoller, BrickWall, Wrench } from 'lucide-react';
import { designImages, providerImage, tradeImage } from '../../lib/design-images';
import { tradesOf } from '../../lib/rules';
import { RemoteImage } from './remote-image';
import { useTrades } from './trades-context';

export function Hero({ onExplore }: { onExplore: () => void }) {
  return <section className="landing-hero hero-highlight">
    <div className="hero-content">
      <p className="eyebrow hero-label">OFICIOS PARA TU HOGAR</p>
      <h1>Encuentra a la persona indicada para <em>tu próximo proyecto</em></h1>
      <p>Compara profesionales, revisa su experiencia y recibe cotizaciones para tus proyectos en casa.</p>
      <button className="primary" onClick={onExplore}>Explorar profesionales <ArrowRight size={19}/></button>
      <div className="hero-assurance"><ShieldCheck size={18}/> Perfiles aprobados mediante revisión interna de Trade</div>
    </div>
    <figure className="hero-collage">
      <RemoteImage className="collage-main" src={designImages.plumbing} alt="Trabajo de plomería en una vivienda" width={600} height={760} fetchPriority="high"/>
      <RemoteImage src={designImages.electrical} alt="Trabajo de electricidad en una vivienda" width={400} height={360}/>
      <RemoteImage src={designImages.carpentry} alt="Trabajo de carpintería" width={400} height={360}/>
      <figcaption>Fotografías ilustrativas de los oficios</figcaption>
    </figure>
  </section>;
}

const tradeCards = [
  { name: 'Plomería', description: 'Fugas, instalaciones y mantenimiento.', Icon: Droplets },
  { name: 'Electricidad', description: 'Instalaciones y reparaciones eléctricas.', Icon: Zap },
  { name: 'Carpintería', description: 'Muebles y proyectos en madera.', Icon: Hammer },
  { name: 'Cerrajería', description: 'Cerraduras y ajustes de puertas.', Icon: KeyRound },
  { name: 'Pintura', description: 'Interiores, exteriores y acabados.', Icon: PaintRoller },
  { name: 'Albañilería', description: 'Muros, pisos y reparaciones.', Icon: BrickWall },
  { name: 'Mantenimiento', description: 'Ajustes y cuidado de espacios.', Icon: Wrench },
];

export function PopularTrades({ onSelect }: { onSelect: (trade: string) => void }) {
  // Active trades in admin order; ones added by administration get a generic card.
  const cards = useTrades().map(name => tradeCards.find(card => card.name === name) || { name, description: `Profesionales de ${name.toLowerCase()}.`, Icon: Wrench });
  return <section className="popular-trades" aria-labelledby="popular-title">
    <div className="section-head"><div><h2 id="popular-title">Explora los oficios</h2><p>{cards.length} oficios para encontrar ayuda en tu proyecto.</p></div>
      <button className="secondary" onClick={() => onSelect('')}>Ver profesionales <ArrowRight size={16}/></button></div>
    <div className="trade-grid">{cards.map(({ name, description, Icon }, index) =>
      <button className={index < 3 ? 'trade-card' : 'trade-card trade-card-compact'} key={name} onClick={() => onSelect(name)}>
        {index < 3 && <RemoteImage src={tradeImage(name)} alt={`Fotografía ilustrativa de ${name.toLowerCase()}`} loading="lazy" width={600} height={380}/>}
        <span className="trade-card-icon"><Icon size={24}/></span>
        <span className="trade-card-copy"><strong>{name}</strong><span>{description}</span></span>
        <span className="trade-card-arrow"><ChevronRight size={18}/></span>
      </button>)}</div>
    <p className="image-disclosure">Las imágenes de los oficios son ilustrativas.</p>
  </section>;
}

type CatalogProvider = { id: string; name: string; photo?: string; trade: string; trades?: string[]; zone: string; rating?: number; description: string };
export function ProfessionalCard({ provider, onOpen }: { provider: CatalogProvider; onOpen: () => void }) {
  const photo = providerImage(provider);
  const demo = String(provider.id).startsWith('catalog-provider-') || provider.id === 'demo-proveedor' || provider.id === 'presentation-provider-login';
  return <article className="professional-card">
    <div className="professional-photo"><RemoteImage src={photo.src} alt={photo.illustrative ? `Fotografía ilustrativa de ${provider.trade}` : demo ? `Imagen ilustrativa de ${provider.name}` : `Fotografía de ${provider.name}`} loading="lazy" width={600} height={440}/>
      {(photo.illustrative || demo) && <span>{demo ? 'Perfil de demostración' : 'Imagen ilustrativa'}</span>}</div>
    <div className="professional-info"><span className="verified"><ShieldCheck size={14}/> Aprobado por Trade</span>
      <h3>{provider.name}</h3><p className="professional-trade">{tradesOf(provider).join(' · ')}</p>
      <p className="professional-zone"><MapPin size={15}/>{provider.zone}</p>
      <p className="professional-rating"><Star size={16} fill={provider.rating ? 'currentColor' : 'none'}/><strong>{provider.rating ? Number(provider.rating).toFixed(1) : 'Sin reseñas'}</strong></p>
      <p className="professional-description">{provider.description}</p>
      <button className="primary" onClick={onOpen}>Ver perfil <ArrowRight size={17}/></button>
    </div>
  </article>;
}

export function HomeBanner({ onExplore, label = 'Explorar profesionales' }: { onExplore: () => void; label?: string }) {
  return <section className="home-banner"><RemoteImage src={designImages.home} alt="Interior de una vivienda, imagen ilustrativa" loading="lazy" width={1400} height={500}/>
    <div><h2>Haz realidad tus proyectos<br/>con profesionales de oficios.</h2><p>Encuentra, compara y da el primer paso.</p>
      <button className="primary" onClick={onExplore}>{label} <ArrowRight size={18}/></button></div>
  </section>;
}

export function HowItWorks({ onExplore, onGuide }: { onExplore: () => void; onGuide: () => void }) {
  const steps = [
    { title: 'Publica tu solicitud', description: 'Describe qué necesitas y añade fotos si lo deseas.', image: designImages.planning },
    { title: 'Recibe cotizaciones', description: 'Compara el precio y el alcance de las propuestas.', image: designImages.electrical },
    { title: 'Confirma el trabajo', description: 'Revisa las evidencias, confirma y comparte tu experiencia.', image: designImages.carpentry },
  ];
  return <><section className="how-it-works"><div className="how-heading"><div><h2>Así funciona</h2><p>De una idea a un proyecto resuelto, paso a paso.</p></div><button className="secondary" onClick={onGuide}>Ver cómo funciona <ArrowRight size={17}/></button></div>
    <div className="how-grid">{steps.map((step, i) => <article key={step.title}>
      <div className="how-photo"><RemoteImage src={step.image} alt="Fotografía ilustrativa del proceso" loading="lazy" width={500} height={300}/><span>{i + 1}</span></div>
      <h3>{step.title}</h3><p>{step.description}</p>
    </article>)}</div></section><HomeBanner onExplore={onExplore}/></>;
}

const guideSteps = [
  ['Busca un profesional', 'Explora los siete oficios y consulta perfiles aprobados por Trade.', designImages.plumbing],
  ['Cuéntanos el problema', 'Publica tu solicitud con la fecha que necesitas y, si lo deseas, agrega fotos.', designImages.planning],
  ['Elige una propuesta', 'Compara el precio total y el trabajo incluido en las cotizaciones que recibas.', designImages.carpentry],
  ['Acompaña el trabajo', 'Revisa las fotografías de antes y después que comparta el proveedor.', designImages.plumbing],
  ['Confirma y comparte', 'Confirma que el trabajo se completó y deja tu calificación y comentario.', designImages.home],
] as const;

export function GuidePage({ onExplore }: { onExplore: () => void }) {
  return <div className="guide-page">
    <section className="guide-hero"><div><p className="eyebrow">CÓMO FUNCIONA TRADE</p><h1>De una necesidad a un <em>trabajo resuelto</em></h1><p>Encuentra profesionales de oficios, compara propuestas y sigue tu proyecto desde una misma plataforma.</p><button className="primary" onClick={onExplore}>Explorar oficios <ArrowRight size={18}/></button></div><figure><RemoteImage src={designImages.plumbing} alt="Trabajo de plomería, fotografía ilustrativa" width={640} height={440}/><figcaption>Imagen ilustrativa</figcaption></figure></section>
    <section className="guide-process"><p className="eyebrow">CÓMO FUNCIONA</p><h2>En solo cinco pasos</h2><p>Desde la búsqueda hasta la reseña final.</p><div className="guide-process-list">{guideSteps.map(([title, description, image], i) => <article className="guide-process-step" key={title}><div className="guide-process-copy"><span className="step-number">{i + 1}</span><h3>{title}</h3><p>{description}</p></div><RemoteImage src={image} alt={`Imagen ilustrativa del paso ${i + 1}`} loading="lazy" width={560} height={340}/></article>)}</div></section>
    <HomeBanner onExplore={onExplore} label="Explorar oficios"/>
  </div>;
}
