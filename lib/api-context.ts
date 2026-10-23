import type {Db} from 'mongodb';

// What route() hands to each API module: the database helpers and the signed-in person.
export type Ctx={
 db:Db;
 c:(name:string)=>any;
 one:(name:string,filter:any,projection?:any)=>Promise<any>;
 all:(name:string,filter:any,sort?:any,projection?:any)=>Promise<any[]>;
 agg:(name:string,pipeline:any[])=>Promise<any[]>;
 fail:(message:string,status?:number)=>never;
 sid:(v:unknown)=>string;
 id:()=>string;
 json:(data:any,status?:number,headers?:Record<string,string>)=>Response;
 user:any;
 auth:()=>any;
 token?:string;
 url:URL;
};

export async function sha256(text:string){
 const bits=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');
}
