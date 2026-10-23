'use client';
import {createContext,useCallback,useContext,useRef,useState,type ReactNode} from 'react';
import {ConfirmDialog,type ConfirmOptions} from './confirm-dialog';
import {Toasts,type Toast,type ToastKind} from './toast';

// One place for confirmations and toasts (design PDF, section 4): screens ask, this shows.
type Feedback={confirm:(options:ConfirmOptions)=>Promise<{reason:string}|null>;toast:(text:string,kind?:ToastKind)=>void};
const FeedbackContext=createContext<Feedback|null>(null);

export function FeedbackProvider({children}:{children:ReactNode}){
  const [toasts,setToasts]=useState<Toast[]>([]);
  const [pending,setPending]=useState<{options:ConfirmOptions;resolve:(value:{reason:string}|null)=>void}|null>(null);
  const nextId=useRef(0);
  const dismiss=useCallback((id:number)=>setToasts(list=>list.filter(t=>t.id!==id)),[]);
  const toast=useCallback((text:string,kind:ToastKind='success')=>{
    const id=++nextId.current;
    setToasts(list=>[...list.slice(-2),{id,text,kind}]);
    // Errors stay until closed; confirmations of success leave on their own.
    if(kind!=='error')window.setTimeout(()=>dismiss(id),5000);
  },[dismiss]);
  const confirm=useCallback((options:ConfirmOptions)=>new Promise<{reason:string}|null>(resolve=>setPending({options,resolve})),[]);
  const close=(value:{reason:string}|null)=>{pending?.resolve(value);setPending(null)};
  return <FeedbackContext.Provider value={{confirm,toast}}>
    {children}
    {pending&&<ConfirmDialog {...pending.options} onClose={close}/>}
    <Toasts toasts={toasts} onDismiss={dismiss}/>
  </FeedbackContext.Provider>;
}

function useFeedback(){const value=useContext(FeedbackContext);if(!value)throw new Error('FeedbackProvider is missing.');return value}
export const useConfirm=()=>useFeedback().confirm;
export const useToast=()=>useFeedback().toast;
