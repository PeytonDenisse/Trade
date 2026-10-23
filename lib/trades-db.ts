import type {Db} from 'mongodb';
import {trades as defaults} from './rules';

// The trade list lives in the trades collection so administration can manage it.
// An empty collection starts with the original list.
export async function tradeNames(db:Db,includeInactive=false){
 const c=db.collection<any>('trades');
 if(!await c.estimatedDocumentCount())await c.bulkWrite(defaults.map((name,order)=>({updateOne:{filter:{name},update:{$setOnInsert:{name,active:true,order}},upsert:true}})));
 return (await c.find(includeInactive?{}:{active:true},{projection:{_id:0,name:1},sort:{order:1,name:1}}).toArray()).map(t=>t.name as string);
}
