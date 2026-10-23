'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {Pencil,Plus} from 'lucide-react';
import {useConfirm,useToast} from '../feedback/feedback-provider';
import {errorText,type Api} from './shared';

// Oficios: the list clients choose from and providers offer. Renaming updates every profile and request.
export function TradesAdmin({api,onChanged}:{api:Api;onChanged:()=>void}){
  const confirm=useConfirm(),toast=useToast();
  const [rows,setRows]=useState<any[]|null>(null),[error,setError]=useState(''),[name,setName]=useState(''),[editing,setEditing]=useState<{previous:string;name:string}|null>(null),[busy,setBusy]=useState(false);
  const load=()=>api('admin/trades').then(setRows).catch(e=>setError(e.message));
  useEffect(()=>{load()},[]);
  async function save(body:any,done:string){
    setBusy(true);try{await api('admin/trade',body);toast(done);setName('');setEditing(null);await load();onChanged()}catch(cause){toast(errorText(cause),'error')}finally{setBusy(false)}
  }
  async function toggle(row:any){
    const on=!row.active;
    if(!await confirm(on
      ?{title:`¿Activar ${row.name}?`,body:'Volverá a aparecer en el catálogo y en el formulario de solicitudes.',confirmLabel:'Activar oficio'}
      :{title:`¿Desactivar ${row.name}?`,body:`Dejará de aparecer en el catálogo y nadie podrá pedirlo en solicitudes nuevas. ${row.providers} proveedor(es) lo conservan en su perfil y las ${row.requests} solicitud(es) existentes no cambian.`,confirmLabel:'Desactivar oficio',danger:true}))return;
    try{await api('admin/trade-active',{name:row.name,active:on});toast(`${row.name}: ${on?'activado':'desactivado'}.`);await load();onChanged()}catch(cause){toast(errorText(cause),'error')}
  }
  if(error)return <div className="admin-feedback error" role="alert">No se pudieron cargar los oficios. {error}</div>;
  if(!rows)return <div className="admin-feedback" role="status">Cargando oficios…</div>;
  return <div className="trades-admin">
    <form className="inline-form" onSubmit={(e:FormEvent)=>{e.preventDefault();save({name},`${name.trim()}: oficio creado.`)}}>
      <label className="settings-field">Nuevo oficio<input value={name} maxLength={40} onChange={e=>setName(e.target.value)} placeholder="Ej.: Jardinería"/></label>
      <button className="primary" type="submit" disabled={busy||name.trim().length<3}><Plus size={17}/>Agregar</button>
    </form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Oficio</th><th scope="col">Proveedores</th><th scope="col">Solicitudes</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>
      {rows.map(row=><tr key={row.name}>
        <td data-label="Oficio">{editing?.previous===row.name
          ?<form className="inline-form compact" onSubmit={e=>{e.preventDefault();save(editing!,`${row.name} ahora se llama ${editing!.name.trim()}.`)}}><input aria-label={`Nuevo nombre para ${row.name}`} value={editing!.name} maxLength={40} autoFocus onChange={e=>setEditing({...editing!,name:e.target.value})}/><button className="primary small-action" type="submit" disabled={busy||editing!.name.trim().length<3}>Guardar</button><button className="text-button" type="button" onClick={()=>setEditing(null)}>Cancelar</button></form>
          :<strong>{row.name}</strong>}</td>
        <td data-label="Proveedores">{row.providers}</td>
        <td data-label="Solicitudes">{row.requests}</td>
        <td data-label="Estado"><span className="status" data-status={row.active?'Aprobada':'Desactivada'}>{row.active?'Activo':'Inactivo'}</span></td>
        <td data-label="Acciones"><span className="row-actions">{editing?.previous!==row.name&&<button type="button" className="text-button" onClick={()=>setEditing({previous:row.name,name:row.name})}><Pencil size={14}/>Renombrar</button>}<button type="button" className={row.active?'text-button danger':'text-button'} onClick={()=>toggle(row)}>{row.active?'Desactivar':'Activar'}</button></span></td>
      </tr>)}
    </tbody></table></div>
  </div>;
}
