'use client';
import { ArrowRight, ChevronRight, Droplets, Hammer, ShieldCheck, Star, MapPin, Zap } from 'lucide-react';
import { designImages, providerImage, tradeImage } from '../../lib/design-images';
import { RemoteImage } from './remote-image';

export function Hero({ onExplore }: { onExplore: () => void }) {
  return <section className="landing-hero hero-highlight">
    <div className="hero-content">
      <p className="eyebrow hero-label">UN NUEVO COMIENZO PARA TU HOGAR</p>
      <h1>Tu hogar tiene planes.<br/><em>Hagámoslos realidad.</em></h1>
      <p>Compara profesionales de confianza, revisa su experiencia y recibe cotizaciones para hacer realidad tus proyectos en casa.</p>
      <button className="primary" onClick={onExplore}>Explorar profesionales <ArrowRight size={19}/></button>
      <div className="hero-assurance"><ShieldCheck size={18}/> Perfiles revisados · Cotizaciones claras</div>
    </div>
    <figure className="hero-collage">
      <RemoteImage className="collage-main" src={designImages.electrical} alt="Profesional realizando una instalación eléctrica" width={600} height={760} fetchPriority="high"/>
      <RemoteImage src={designImages.plumbing} alt="Instalaciones de plomería" width={400} height={360}/>
      <RemoteImage src={designImages.carpentry} alt="Herramientas para un proyecto de carpintería" width={400} height={360}/>
      <figcaption>Fotografías ilustrativas de oficios</figcaption>
    </figure>
  </section>;
}

const popularTrades = [
  { name: 'Plomería', description: 'Instalaciones, reparaciones y mantenimiento.', Icon: Droplets },
  { name: 'Electricidad', description: 'Instalaciones, reparaciones y mejoras.', Icon: Zap },
  { name: 'Carpintería', description: 'Muebles, reparaciones y proyectos en madera.', Icon: Hammer },
];

export function PopularTrades({ onSelect }: { onSelect: (trade: string) => void }) {
  return <section className="popular-trades" aria-labelledby="popular-title">
    <div className="section-head"><div><h2 id="popular-title">Oficios populares</h2><p>Encuentra ayuda para esos proyectos que hacen hogar.</p></div>
      <button className="secondary" onClick={() => onSelect('')}>Ver todos los oficios <ArrowRight size={16}/></button></div>
    <div className="trade-grid">{popularTrades.map(({ name, description, Icon }) =>
      <button className="trade-card" key={name} onClick={() => onSelect(name)}>
        <RemoteImage src={tradeImage(name)} alt={`Imagen ilustrativa de ${name.toLowerCase()}`} loading="lazy" width={600} height={380}/>
        <span className="trade-card-icon"><Icon size={24}/></span>
        <span className="trade-card-copy"><strong>{name}</strong><span>{description}</span></span>
        <span className="trade-card-arrow"><ChevronRight size={18}/></span>
      </button>)}</div>
  </section>;
}

export function ProfessionalCard({ provider, onOpen }: { provider: any; onOpen: () => void }) {
  const photo = providerImage(provider);
  return <article className="professional-card">
    <div className="professional-photo"><RemoteImage src={photo.src} alt={photo.illustrative ? `Imagen ilustrativa de ${provider.trade}` : `Fotografía de ${provider.name}`} loading="lazy" width={600} height={440}/>
      {photo.illustrative && <span>Imagen ilustrativa</span>}</div>
    <div className="professional-info"><span className="verified"><ShieldCheck size={14}/> Perfil aprobado</span>
      <h3>{provider.name}</h3><p className="professional-trade">{provider.trade}</p>
      <p className="professional-zone"><MapPin size={15}/>{provider.zone}</p>
      <p className="professional-rating"><Star size={16} fill="currentColor"/><strong>{provider.rating ? Number(provider.rating).toFixed(1) : 'Sin reseñas'}</strong></p>
      <p className="professional-description">{provider.description}</p>
      <button className="primary" onClick={onOpen}>Ver perfil <ArrowRight size={17}/></button>
    </div>
  </article>;
}

export function HowItWorks({ onExplore }: { onExplore: () => void }) {
  const steps = [
    { title: 'Publica tu solicitud', description: 'Cuéntanos qué necesitas y cuándo quieres resolverlo.', image: designImages.planning },
    { title: 'Recibe cotizaciones', description: 'Compara lo que incluye cada propuesta y elige con información.', image: designImages.electrical },
    { title: 'Confirma el resultado', description: 'Da seguimiento al trabajo y comparte tu experiencia.', image: designImages.carpentry },
  ];
  return <><section className="how-it-works"><h2>Así funciona</h2><p>De una idea a un proyecto resuelto, paso a paso.</p>
    <div className="how-grid">{steps.map((step, i) => <article key={step.title}>
      <div className="how-photo"><RemoteImage src={step.image} alt="Fotografía ilustrativa del proceso" loading="lazy" width={500} height={300}/><span>{i + 1}</span></div>
      <h3>{step.title}</h3><p>{step.description}</p>
    </article>)}</div></section>
    <section className="home-banner"><RemoteImage src={designImages.home} alt="Espacio interior de referencia" loading="lazy" width={1400} height={500}/>
      <div><h2>Haz realidad tus proyectos<br/>con personas que saben.</h2><p>Encuentra, compara y da el primer paso.</p>
        <button className="primary" onClick={onExplore}>Explorar profesionales <ArrowRight size={18}/></button></div>
    </section></>;
}
