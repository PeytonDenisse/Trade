'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,LogOut,Settings,UserRound} from 'lucide-react';
import {RemoteImage} from '../trade/remote-image';

const roleLabel:Record<string,string>={admin:'Administrador',proveedor:'Proveedor',cliente:'Cliente'};

export function Avatar({user,size=34}:{user:{name:string;photo_url?:string};size?:number}){
  return <span className="avatar" style={{width:size,height:size}}>{user.photo_url?<RemoteImage src={user.photo_url} alt="" width={size} height={size}/>:user.name.slice(0,1)}</span>;
}

// The avatar opens the account menu (design PDF, section 3): who is signed in, settings, sign out last.
export function AccountMenu({user,role,onAccount,onProfile,onLogout}:{user:any;role:string;onAccount:()=>void;onProfile?:()=>void;onLogout:()=>void}){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null),toggle=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const onClick=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);toggle.current?.focus()}};
    window.addEventListener('mousedown',onClick);window.addEventListener('keydown',onKey);
    return()=>{window.removeEventListener('mousedown',onClick);window.removeEventListener('keydown',onKey)};
  },[open]);
  const pick=(action:()=>void)=>()=>{setOpen(false);action()};
  return <div className="account-menu" ref={root}>
    <button ref={toggle} type="button" className="account-trigger" aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(!open)}>
      <Avatar user={user}/><span className="account-trigger-name">{user.name}</span><ChevronDown size={16} aria-hidden="true"/>
    </button>
    {open&&<div className="account-dropdown" role="menu" aria-label="Mi cuenta">
      <div className="account-card"><Avatar user={user} size={44}/><div><strong>{user.name}</strong><small>{user.email}</small><span className="role-badge" data-role={role}>{roleLabel[role]}</span></div></div>
      <button type="button" role="menuitem" onClick={pick(onAccount)}><Settings size={17}/>Mi cuenta y ajustes</button>
      {onProfile&&<button type="button" role="menuitem" onClick={pick(onProfile)}><UserRound size={17}/>Ver mi perfil público</button>}
      <button type="button" role="menuitem" className="account-logout" onClick={pick(onLogout)}><LogOut size={17}/>Cerrar sesión</button>
    </div>}
  </div>;
}
