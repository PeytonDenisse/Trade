import {env} from 'cloudflare:workers';
import {handle} from '../../../lib/api';
export const dynamic='force-dynamic';
export const GET=(req:Request)=>handle(req,env as any);
export const POST=(req:Request)=>handle(req,env as any);
