'use client';
import {ClipboardCheck,Database,LayoutDashboard,Tags,UsersRound,type LucideIcon} from 'lucide-react';
import {Dashboard} from './dashboard';
import {ReviewQueue} from './review-queue';
import {People} from './people';
import {PersonPage} from './person-page';
import {TradesAdmin} from './trades-admin';
import {DataTools} from './data-tools';
import type {Api} from './shared';

type Section={key:string;label:string;group:string;Icon:LucideIcon;intro:string};
// Admin sections in menu order; the key is the address (/admin/<key>).
export const sections:Section[]=[
  {key:'tablero',label:'Tablero',group:'Operación',Icon:LayoutDashboard,intro:'Lo que necesita tu atención y cómo va la plataforma.'},
  {key:'por-revisar',label:'Por revisar',group:'Operación',Icon:ClipboardCheck,intro:'Registros de proveedores y recuperaciones de contraseña pendientes.'},
  {key:'personas',label:'Personas',group:'Operación',Icon:UsersRound,intro:'Clientes, proveedores y administradores. Abre una ficha para ver todo de una persona.'},
  {key:'oficios',label:'Oficios',group:'Catálogo',Icon:Tags,intro:'Los oficios que se ofrecen en Trade. Renombrar actualiza perfiles y solicitudes.'},
  {key:'datos',label:'Datos',group:'Sistema',Icon:Database,intro:'Descarga la información en CSV o importa oficios.'},
];

// /admin: the admin's whole workspace, one section at a time.
export function AdminPortal({api,tab,personId,me,onTab,onPerson,onTradesChanged}:{api:Api;tab:string;personId:string;me:string;onTab:(tab:string)=>void;onPerson:(id:string)=>void;onTradesChanged:()=>void}){
  const current=sections.find(s=>s.key===tab)||sections[0];
  const groups=[...new Set(sections.map(s=>s.group))];
  return <div className="admin-portal">
    <nav className="admin-nav" aria-label="Secciones de administración">
      {groups.map(group=><div key={group} className="admin-nav-group"><span>{group}</span>{sections.filter(s=>s.group===group).map(s=><button key={s.key} type="button" aria-current={s.key===current.key?'page':undefined} onClick={()=>onTab(s.key)}><s.Icon size={17} aria-hidden="true"/>{s.label}</button>)}</div>)}
      <label className="admin-nav-select">Sección<select value={current.key} onChange={e=>onTab(e.target.value)}>{groups.map(group=><optgroup key={group} label={group}>{sections.filter(s=>s.group===group).map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</optgroup>)}</select></label>
    </nav>
    <div className="admin-main">
      {personId?<PersonPage api={api} id={personId} me={me} onBack={()=>onTab('personas')}/>:<>
        <div className="admin-heading"><p className="eyebrow">ADMINISTRACIÓN · {current.group.toUpperCase()}</p><h1>{current.label}</h1><p>{current.intro}</p></div>
        {current.key==='tablero'&&<Dashboard api={api} onTab={onTab}/>}
        {current.key==='por-revisar'&&<ReviewQueue api={api} onPerson={onPerson}/>}
        {current.key==='personas'&&<People api={api} onPerson={onPerson} onReview={()=>onTab('por-revisar')}/>}
        {current.key==='oficios'&&<TradesAdmin api={api} onChanged={onTradesChanged}/>}
        {current.key==='datos'&&<DataTools api={api} onChanged={onTradesChanged}/>}
      </>}
    </div>
  </div>;
}
