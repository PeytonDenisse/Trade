'use client';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Eye, EyeOff, FileText, ShieldCheck } from 'lucide-react';
import { trades } from '../../lib/rules';
import { designImages } from '../../lib/design-images';
import { RemoteImage } from './remote-image';

type AuthMode = 'login' | 'register';
type AuthValues = { name?: string; email: string; password: string };
type AuthField = keyof AuthValues;

function AuthCard({ mode, onSubmit }: { mode: AuthMode; onSubmit: (mode: AuthMode, values: AuthValues) => Promise<void> }) {
  const id = useId();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<AuthField, string>>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fields: AuthField[] = mode === 'register' ? ['name', 'email', 'password'] : ['email', 'password'];
  function validate(field: AuthField, value: string) {
    if (field === 'name') return !value.trim() ? 'Escribe tu nombre.' : value.length > 100 ? 'Usa como máximo 100 caracteres.' : '';
    if (field === 'email') return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? 'Escribe un correo electrónico válido.' : '';
    if (!value) return 'Escribe tu contraseña.';
    if (mode === 'register' && value.length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
    return '';
  }
  function update(field: AuthField, value: string) {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: '' }));
    setFormError('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = Object.fromEntries(fields.map(field => [field, validate(field, values[field])])) as Partial<Record<AuthField, string>>;
    setErrors(next);
    const firstInvalid = fields.find(field => next[field]);
    if (firstInvalid) { document.getElementById(id + '-' + firstInvalid)?.focus(); return; }
    setBusy(true); setFormError('');
    try {
      await onSubmit(mode, { ...values, name: values.name.trim(), email: values.email.trim() });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la operación.';
      if (/correo o contraseña incorrectos/i.test(message)) setErrors({ password: message });
      else if (/correo|cuenta/i.test(message)) setErrors({ email: message });
      else if (/contraseña/i.test(message)) setErrors({ password: message });
      else if (/nombre/i.test(message)) setErrors({ name: message });
      else setFormError(message);
    } finally { setBusy(false); }
  }
  return <section className="access-card" aria-labelledby={id + '-title'}>
    <h2 id={id + '-title'}>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
    <p>{mode === 'login' ? 'Accede a tu cuenta para continuar.' : 'Crea tu cuenta para publicar solicitudes y recibir cotizaciones.'}</p>
    <form onSubmit={submit} noValidate>
      {formError && <p className="error" role="alert">{formError}</p>}
      {fields.map(field => <div className="access-field" key={field}>
        <label htmlFor={id + '-' + field}>{field === 'name' ? 'Nombre' : field === 'email' ? 'Correo electrónico' : 'Contraseña'}</label>
        <div className={field === 'password' ? 'password-control' : ''}>
          <input id={id + '-' + field} name={field} type={field === 'password' ? showPassword ? 'text' : 'password' : field === 'email' ? 'email' : 'text'}
            autoComplete={field === 'name' ? 'name' : field === 'email' ? 'email' : mode === 'register' ? 'new-password' : 'current-password'}
            placeholder={field === 'name' ? 'Tu nombre completo' : field === 'email' ? 'correo@ejemplo.com' : undefined}
            maxLength={field === 'name' ? 100 : field === 'email' ? 254 : 128}
            value={values[field]} onChange={event => update(field, event.target.value)}
            onBlur={() => { if (values[field]) setErrors(current => ({ ...current, [field]: validate(field, values[field]) })); }}
            aria-invalid={!!errors[field]} aria-describedby={field === 'password' && mode === 'register' ? id + '-password-help ' + (errors[field] ? id + '-password-error' : '') : errors[field] ? id + '-' + field + '-error' : undefined}/>
          {field === 'password' && <button type="button" className="password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button>}
        </div>
        {field === 'password' && mode === 'register' && <small id={id + '-password-help'}>Mínimo 10 caracteres.</small>}
        {errors[field] && <p className="field-error" id={id + '-' + field + '-error'} role="alert">{errors[field]}</p>}
      </div>)}
      <button type="submit" className="primary access-submit" disabled={busy}>{busy ? 'Enviando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'} <ArrowRight size={18}/></button>
    </form>
  </section>;
}

export function AccessPage({ onSubmit, onExplore }: {
  onSubmit: (mode: AuthMode, values: AuthValues) => Promise<void>; onExplore: () => void;
}) {
  return <div className="access-page">
    <section className="access-intro"><div><p className="eyebrow">BIENVENIDO A TRADE</p><h1>Tu próximo proyecto <em>empieza aquí</em></h1><p>Encuentra profesionales de oficios, revisa su experiencia y recibe cotizaciones para tu hogar.</p><button className="secondary" onClick={onExplore}>Explorar profesionales <ArrowRight size={18}/></button></div><figure><RemoteImage src={designImages.plumbing} alt="Trabajo de plomería, fotografía ilustrativa" width={650} height={380}/><figcaption>Imagen ilustrativa</figcaption></figure></section>
    <div className="access-grid"><AuthCard mode="login" onSubmit={onSubmit}/><AuthCard mode="register" onSubmit={onSubmit}/></div>
  </div>;
}

type RequestValues = { trade: string; description: string; date: string };
type RequestField = keyof RequestValues;
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export function CreateRequestPage({ onSubmit }: { onSubmit: (values: RequestValues) => Promise<void> }) {
  const id = useId();
  const [values, setValues] = useState<RequestValues>({ trade: '', description: '', date: '' });
  const [errors, setErrors] = useState<Partial<Record<RequestField, string>>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  function update(field: RequestField, value: string) { setValues(current => ({ ...current, [field]: value })); setErrors(current => ({ ...current, [field]: '' })); setFormError(''); }
  function validate(field: RequestField, value: string) {
    if (field === 'trade') return trades.includes(value) ? '' : 'Selecciona un oficio.';
    if (field === 'description') return !value.trim() ? 'Describe qué necesitas.' : value.length > 2000 ? 'Usa como máximo 2000 caracteres.' : '';
    return !value ? 'Selecciona una fecha.' : value < today() ? 'Selecciona una fecha de hoy o futura.' : '';
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields: RequestField[] = ['trade', 'description', 'date'];
    const next = Object.fromEntries(fields.map(field => [field, validate(field, values[field])])) as Partial<Record<RequestField, string>>;
    setErrors(next);
    const firstInvalid = fields.find(field => next[field]);
    if (firstInvalid) { document.getElementById(id + '-' + firstInvalid)?.focus(); return; }
    setBusy(true); setFormError('');
    try { await onSubmit({ ...values, description: values.description.trim() }); }
    catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo publicar la solicitud.';
      const field = /oficio/i.test(message) ? 'trade' : /descripci/i.test(message) ? 'description' : /fecha/i.test(message) ? 'date' : null;
      if (field) setErrors(current => ({ ...current, [field]: message })); else setFormError(message);
    } finally { setBusy(false); }
  }
  return <div className="request-create-page">
    <section className="request-create-intro"><div><p className="eyebrow">TU PROYECTO EMPIEZA AQUÍ</p><h1>Publica tu solicitud y encuentra ayuda para <em>tu proyecto</em></h1><p>Describe qué necesitas y elige una fecha. Después de publicar podrás añadir una foto del problema si quieres dar más contexto.</p></div><figure><RemoteImage src={designImages.plumbing} alt="Trabajo de plomería, fotografía ilustrativa" width={600} height={340}/><figcaption>Imagen ilustrativa</figcaption></figure></section>
    <section className="request-form-card" aria-labelledby={id + '-title'}><div className="request-form-heading"><span><FileText size={25}/></span><div><h2 id={id + '-title'}>Crea tu solicitud de servicio</h2><p>Elige el oficio, explica el trabajo y señala cuándo lo necesitas.</p></div></div>
      <form onSubmit={submit} noValidate>
        {formError && <p className="error" role="alert">{formError}</p>}
        <div className="request-form-grid"><div className="access-field"><label htmlFor={id + '-trade'}>Oficio</label><select id={id + '-trade'} value={values.trade} onChange={event => update('trade', event.target.value)} aria-invalid={!!errors.trade} aria-describedby={errors.trade ? id + '-trade-error' : undefined}><option value="">Selecciona un oficio</option>{trades.map(trade => <option key={trade} value={trade}>{trade}</option>)}</select>{errors.trade && <p className="field-error" id={id + '-trade-error'} role="alert">{errors.trade}</p>}</div>
          <div className="access-field request-description"><label htmlFor={id + '-description'}>Descripción</label><textarea id={id + '-description'} value={values.description} onChange={event => update('description', event.target.value)} maxLength={2000} placeholder="Por ejemplo: hay una fuga bajo el lavabo y necesito revisar la tubería." aria-invalid={!!errors.description} aria-describedby={id + '-description-help' + (errors.description ? ' ' + id + '-description-error' : '')}/><div className="field-meta"><small id={id + '-description-help'}>Describe el problema sin compartir datos personales.</small><small>{values.description.length}/2000</small></div>{errors.description && <p className="field-error" id={id + '-description-error'} role="alert">{errors.description}</p>}</div>
          <div className="access-field"><label htmlFor={id + '-date'}>Fecha solicitada</label><div className="date-control"><input id={id + '-date'} type="date" min={today()} value={values.date} onChange={event => update('date', event.target.value)} aria-invalid={!!errors.date} aria-describedby={id + '-date-help' + (errors.date ? ' ' + id + '-date-error' : '')}/><CalendarDays size={19} aria-hidden="true"/></div><small id={id + '-date-help'}>Hoy o una fecha futura.</small>{errors.date && <p className="field-error" id={id + '-date-error'} role="alert">{errors.date}</p>}</div></div>
        <button className="primary request-submit" type="submit" disabled={busy}>{busy ? 'Publicando…' : 'Publicar solicitud'} <ArrowRight size={18}/></button>
      </form>
    </section>
    <p className="request-after-note"><ShieldCheck size={18}/> La foto es opcional y se añade después de publicar, en el detalle de tu solicitud.</p>
  </div>;
}

export function PublishedNotice({ onViewList, hasPhoto, children }: { onViewList: () => void; hasPhoto: boolean; children: ReactNode }) {
  return <section className="published-notice" role="status"><div className="published-icon"><CheckCircle2 size={30}/></div><div className="published-body"><div className="published-title"><h2>Solicitud publicada</h2><span className="status" data-status="Activa">Activa</span></div><p>Tu solicitud está disponible para recibir cotizaciones. {hasPhoto ? 'La foto del problema ya quedó adjunta.' : 'Ahora puedes añadir una foto del problema si deseas dar más contexto.'}</p>{!hasPhoto && children}<button className="text-button" onClick={onViewList}>Ver mis solicitudes <ArrowRight size={16}/></button></div></section>;
}
