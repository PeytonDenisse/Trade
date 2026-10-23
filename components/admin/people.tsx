'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowDown,ArrowUp,ArrowUpDown,Search,X} from 'lucide-react';
import {tradesOf} from '../../lib/rules';
import {useConfirm,useToast} from '../feedback/feedback-provider';
import {errorText,roleLabel,type Api} from './shared';

type Role='cliente'|'proveedor'|'admin';
type Row={id:string;name:string;email:string;role:Role;status?:string;trade?:string;zone?:string;requests:number;active:boolean;providerActive:boolean};
type View=''|'cliente'|'pending'|'approved'|'rejected'|'admin'|'inactive';
// One dropdown replaces separate role, status and account filters.
const views:{key:View;label:string;match:(row:Row)=>boolean}[]=[
  {key:'',label:'Todas las personas',match:()=>true},
  {key:'pending',label:'Proveedores pendientes',match:row=>row.status==='Pendiente'},
  {key:'approved',label:'Proveedores aprobados',match:row=>row.status==='Aprobada'},
  {key:'rejected',label:'Proveedores rechazados',match:row=>row.status==='Rechazada'},
  {key:'cliente',label:'Clientes',match:row=>row.role==='cliente'},
  {key:'admin',label:'Administradores',match:row=>row.role==='admin'},
  {key:'inactive',label:'Cuentas desactivadas',match:row=>!row.active||!row.providerActive},
];
type SortKey='name'|'role'|'trade'|'status'|'requests';
const byName=(a:Row,b:Row)=>a.name.localeCompare(b.name,'es');
const first=(pick:(row:Row)=>boolean)=>(a:Row,b:Row)=>Number(pick(b))-Number(pick(a))||byName(a,b);
const text=(value?:string)=>value||'￿';
// Each column cycles through its orders; one more click returns to the default (pending first, then name).
const sorts:Record<SortKey,{label:string;modes:{label:string;cmp:(a:Row,b:Row)=>number}[]}>={
  name:{label:'Persona',modes:[{label:'A → Z',cmp:byName},{label:'Z → A',cmp:(a,b)=>byName(b,a)}]},
  role:{label:'Rol',modes:[{label:'Proveedores primero',cmp:first(row=>row.role==='proveedor')},{label:'Clientes primero',cmp:first(row=>row.role==='cliente')},{label:'Administradores primero',cmp:first(row=>row.role==='admin')}]},
  trade:{label:'Oficio y zona',modes:[{label:'A → Z',cmp:(a,b)=>text(a.trade).localeCompare(text(b.trade),'es')||byName(a,b)},{label:'Z → A',cmp:(a,b)=>(b.trade||'').localeCompare(a.trade||'','es')||byName(a,b)}]},
  status:{label:'Estado',modes:[{label:'Pendientes primero',cmp:first(row=>row.status==='Pendiente')},{label:'Aprobados primero',cmp:first(row=>row.status==='Aprobada')},{label:'Rechazados primero',cmp:first(row=>row.status==='Rechazada')}]},
  requests:{label:'Solicitudes',modes:[{label:'Más primero',cmp:(a,b)=>b.requests-a.requests||byName(a,b)},{label:'Menos primero',cmp:(a,b)=>a.requests-b.requests||byName(a,b)}]},
};

// Personas: every account in one searchable table; the name opens the person's page.
export function People({api,onPerson,onReview}:{api:Api;onPerson:(id:string)=>void;onReview:()=>void}){
  const confirm=useConfirm(),toast=useToast();
  const [people,setPeople]=useState<any[]|null>(null),[applications,setApplications]=useState<any[]>([]),[error,setError]=useState('');
  const [view,setView]=useState<View>(''),[query,setQuery]=useState(''),[busyId,setBusyId]=useState('');
  const [sort,setSort]=useState<{key:SortKey;mode:number}|null>(null);
  const load=async()=>{try{const [users,apps]=await Promise.all([api('users'),api('applications')]);setPeople(users);setApplications(apps)}catch(e:any){setError(e.message)}};
  useEffect(()=>{load()},[]);
  const cycle=(key:SortKey)=>setSort(current=>!current||current.key!==key?{key,mode:0}:current.mode+1<sorts[key].modes.length?{key,mode:current.mode+1}:null);
  const rows=useMemo<Row[]>(()=>{const byId=new Map(applications.map(a=>[a.id,a]));return (people||[]).map(person=>{const app=byId.get(person.id);const r:Role=person.role==='admin'?'admin':app?'proveedor':'cliente';return {id:person.id,name:person.name,email:person.email,role:r,status:app?.status,trade:app?tradesOf(app).join(', '):undefined,zone:app?.zone,requests:person.requests,active:person.active!==false,providerActive:person.provider_active!==false}}).sort((a,b)=>Number(b.status==='Pendiente')-Number(a.status==='Pendiente')||byName(a,b))},[people,applications]);
  if(error)return <div className="admin-feedback error" role="alert">No se pudo cargar el directorio. {error}</div>;
  if(!people)return <div className="admin-feedback" role="status">Cargando personas…</div>;
  const needle=query.trim().toLowerCase();
  const current=views.find(v=>v.key===view)!;
  const shown=rows.filter(row=>current.match(row)&&(!needle||[row.name,row.email,row.trade,row.zone].some(t=>t?.toLowerCase().includes(needle))));
  const sorted=sort?[...shown].sort(sorts[sort.key].modes[sort.mode].cmp):shown;
  const clear=()=>{setView('');setQuery('')};
  async function toggle(row:Row){
    const answer=await confirm(row.active
      ?{title:`¿Desactivar la cuenta de ${row.name}?`,body:'No podrá iniciar sesión y se cerrarán sus sesiones abiertas. Verá el motivo al intentar entrar.',confirmLabel:'Desactivar cuenta',danger:true,reason:{label:'Motivo'}}
      :{title:`¿Reactivar la cuenta de ${row.name}?`,body:'Podrá volver a iniciar sesión.',confirmLabel:'Reactivar cuenta'});
    if(!answer)return;
    setBusyId(row.id);
    try{await api('account-active',{id:row.id,active:!row.active,reason:answer.reason||undefined});toast(`${row.name}: cuenta ${row.active?'desactivada':'reactivada'}.`);await load()}catch(cause){toast(errorText(cause),'error')}finally{setBusyId('')}
  }
  return <section className="people-directory" aria-label="Directorio de personas">
    <div className="people-filters">
      <label className="people-search"><Search size={18} aria-hidden="true"/><input type="search" aria-label="Buscar por nombre, correo, oficio o zona" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nombre, correo, oficio o zona"/></label>
      <label>Mostrar<select value={view} onChange={e=>setView(e.target.value as View)}>{views.map(v=><option key={v.key} value={v.key}>{v.label} ({rows.filter(v.match).length})</option>)}</select></label>
    </div>
    <div className="people-summary"><span role="status">Mostrando <strong>{shown.length}</strong> de {rows.length} personas</span>{(view||needle)&&<button type="button" className="text-button" onClick={clear}><X size={15}/> Limpiar filtros</button>}</div>
    {shown.length?<div className="admin-table-wrap"><table className="admin-table people-table"><thead><tr>{(Object.keys(sorts) as SortKey[]).map(key=>{const active=sort?.key===key,mode=active?sorts[key].modes[sort!.mode]:null,next=active?sorts[key].modes[sort!.mode+1]:sorts[key].modes[0];const Icon=!active?ArrowUpDown:sort!.mode%2?ArrowUp:ArrowDown;return <th key={key} scope="col" aria-sort={active?(sort!.mode%2?'descending':'ascending'):'none'}><button type="button" className={active?'sort-button active':'sort-button'} onClick={()=>cycle(key)} title={next?`Ordenar: ${next.label}`:'Quitar orden'}>{sorts[key].label}<Icon size={14} aria-hidden="true"/></button>{mode&&<small className="sort-mode">{mode.label}</small>}</th>})}<th scope="col">Acciones</th></tr></thead><tbody>{sorted.map(row=><tr key={row.id} className={row.status==='Pendiente'?'is-pending':undefined}>
      <td data-label="Persona"><button type="button" className="person-cell" onClick={()=>onPerson(row.id)}><span className="person-initial" aria-hidden="true">{row.name.slice(0,1)}</span><span><strong>{row.name}</strong><small>{row.email}</small></span></button></td>
      <td data-label="Rol"><span className="role-badge" data-role={row.role}>{roleLabel[row.role]}</span>{!row.active&&<span className="status" data-status="Desactivada">Cuenta desactivada</span>}</td>
      <td data-label="Oficio y zona">{row.trade?<span className="trade-cell">{row.trade}<small>{row.zone}</small></span>:<span className="muted-dash">—</span>}</td>
      <td data-label="Estado">{row.status?<span className="status" data-status={row.status}>{row.status}</span>:<span className="muted-dash">—</span>}{row.status==='Aprobada'&&!row.providerActive&&<span className="status" data-status="Desactivada">Proveedor desactivado</span>}</td>
      <td data-label="Solicitudes">{row.requests}</td>
      <td data-label="Acciones">{busyId===row.id?<span className="muted-dash">Guardando…</span>:<span className="row-actions">
        <button type="button" className="text-button" onClick={()=>onPerson(row.id)}>Ver ficha</button>
        {row.status==='Pendiente'&&<button type="button" className="primary small-action" onClick={onReview}>Revisar registro</button>}
        {row.role!=='admin'&&<button type="button" className={row.active?'text-button danger':'text-button'} disabled={!!busyId} onClick={()=>toggle(row)}>{row.active?'Desactivar cuenta':'Reactivar cuenta'}</button>}
      </span>}</td>
    </tr>)}</tbody></table></div>:<div className="admin-empty"><Search size={34}/><h3>Nadie coincide</h3><p>Prueba con otra opción en «Mostrar» o borra la búsqueda.</p><button type="button" className="secondary" onClick={clear}>Limpiar filtros</button></div>}
  </section>;
}
