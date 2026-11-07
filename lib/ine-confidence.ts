import type {Block} from 'tesseract.js';
import {normalizeIneValue,identityKeys,type IneReading} from './ine-analysis';
import type {IneIdentity} from './ine-identity';
import {stateByAbbreviation} from './ine-states';

const compact=(value:string)=>normalizeIneValue(value).replace(/[^A-ZÑ0-9]/g,'');
export function fieldConfidences(values:Partial<IneIdentity>,blocks:Block[]|null|undefined):IneReading['confidence']{
 const words=(blocks||[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words)));
 const confidence:IneReading['confidence']={};
 for(const field of identityKeys){
  const value=values[field];if(!value)continue;
  const aliases=[compact(value)];
  if(field==='fechaNacimiento'){const [year,month,day]=value.split('-');aliases.push(day+month+year)}
  if(field==='estado')for(const [abbreviation,state] of Object.entries(stateByAbbreviation))if(compact(state)===compact(value))aliases.push(abbreviation);
  let best=0;
  for(let i=0;i<words.length;i++){
   let joined='',lowest=100;
   for(let j=i;j<Math.min(words.length,i+15);j++){
    joined+=compact(words[j].text);lowest=Math.min(lowest,words[j].confidence);
    if(aliases.includes(joined))best=Math.max(best,lowest);
    if(joined.length>Math.max(...aliases.map(a=>a.length)))break;
   }
  }
  confidence[field]=Math.max(0,Math.min(100,best));
 }
 return confidence;
}

