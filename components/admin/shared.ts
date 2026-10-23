// Shared admin types and labels.
export type Api=(path:string,data?:any)=>Promise<any>;

export const roleLabel:Record<string,string>={cliente:'Cliente',proveedor:'Proveedor',admin:'Administrador'};

// audit_log action codes as people read them.
export const actionLabel:Record<string,string>={
  'provider.approve':'Aprobó el registro de proveedor',
  'provider.reject':'Rechazó el registro de proveedor',
  'provider.activate':'Reactivó el perfil de proveedor',
  'provider.deactivate':'Desactivó el perfil de proveedor',
  'provider.trades.approve':'Aprobó oficios nuevos',
  'provider.trades.reject':'Rechazó oficios nuevos',
  'account.activate':'Reactivó la cuenta',
  'account.deactivate':'Desactivó la cuenta',
  'password.link':'Generó un enlace de recuperación',
  'role.admin':'Dio permisos de administración',
  'role.remove':'Quitó permisos de administración',
  'review.hide':'Ocultó una reseña',
  'review.show':'Volvió a mostrar una reseña',
  'request.close':'Cerró una solicitud',
  'report.resolve':'Resolvió un reporte',
  'trade.create':'Creó un oficio',
  'trade.rename':'Renombró un oficio',
  'trade.activate':'Activó un oficio',
  'trade.deactivate':'Desactivó un oficio',
  'trade.import':'Importó oficios',
  'settings.update':'Cambió los ajustes',
  'data.export':'Exportó datos',
};

export const when=(iso?:string|null)=>iso?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(new Date(iso)):'—';
export const day=(iso?:string|null)=>iso?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium'}).format(new Date(iso)):'—';
export const errorText=(cause:unknown,fallback='No se pudo guardar el cambio.')=>cause instanceof Error?cause.message:fallback;
