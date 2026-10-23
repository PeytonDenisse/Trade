'use client';
import {useState} from 'react';
import {Download,Upload} from 'lucide-react';
import {useToast} from '../feedback/feedback-provider';
import {errorText,type Api} from './shared';

const exportsList=[
  {key:'personas',label:'Personas',help:'Nombre, correo, rol, estado de la cuenta y datos de proveedor. Nunca incluye contraseñas.'},
  {key:'solicitudes',label:'Solicitudes',help:'Oficio, estado, cliente, proveedor y fechas.'},
  {key:'resenas',label:'Reseñas',help:'Calificaciones y comentarios por proveedor, incluidas las ocultas.'},
  {key:'actividad',label:'Actividad de administración',help:'La bitácora completa de acciones.'},
];

// Datos: CSV downloads for spreadsheets and importing a list of trades.
export function DataTools({api,onChanged}:{api:Api;onChanged:()=>void}){
  const toast=useToast();
  const [result,setResult]=useState<{added:string[];existing:string[]}|null>(null),[busy,setBusy]=useState(false);
  async function importFile(file:File){
    if(file.size>20000)return toast('El archivo es demasiado grande (máximo 20 KB).','error');
    setBusy(true);setResult(null);
    try{const r=await api('admin/trades-import',{text:await file.text()});setResult(r);toast(r.added.length?`${r.added.length} oficio(s) importado(s).`:'No había oficios nuevos.',r.added.length?'success':'info');onChanged()}
    catch(cause){toast(errorText(cause),'error')}finally{setBusy(false)}
  }
  return <div className="data-tools">
    <section aria-labelledby="data-export"><h2 id="data-export" className="admin-section-title">Exportar a CSV</h2>
      <div className="export-grid">{exportsList.map(e=><a key={e.key} className="export-card" href={'/api/admin/export/'+e.key} download><Download size={20} aria-hidden="true"/><span><strong>{e.label}</strong><small>{e.help}</small></span></a>)}</div>
      <p className="muted">Los archivos se abren en Excel, Numbers o Google Sheets. Cada descarga queda en la actividad de administración.</p>
    </section>
    <section aria-labelledby="data-import"><h2 id="data-import" className="admin-section-title">Importar oficios</h2>
      <p className="muted">Sube un archivo CSV o de texto con un oficio por línea (primera columna). Los que ya existen se omiten.</p>
      <label className="upload import-upload"><Upload size={20}/><span>{busy?'Importando…':'Elegir archivo .csv o .txt'}</span><input type="file" accept=".csv,.txt,text/csv,text/plain" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)importFile(f);e.target.value=''}}/></label>
      {result&&<p className="notice" role="status">{result.added.length?<>Agregados: {result.added.join(', ')}.</>:'Ningún oficio nuevo.'}{result.existing.length?<> Ya existían: {result.existing.join(', ')}.</>:null}</p>}
    </section>
  </div>;
}
