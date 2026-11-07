import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanIneEvidence,evaluateIne,identityKeys,normalizeIneValue,type IneEvidence} from '../lib/ine-analysis';
import {mergeIneReadings,fieldConfidences,selectFocusedCurp,selectBestFocusedCurp} from '../lib/ine-reader';
import {diagnoseIneReading} from '../lib/ine-ocr-diagnostics';
const identity={nombres:'LUIS',apellidoPaterno:'GOMEZ',apellidoMaterno:'LOPEZ',fechaNacimiento:'1990-01-01',sexo:'H' as const,curp:'GOML900101HDFRRN09',calleNumero:'Calle Ficticia 10',colonia:'Centro',codigoPostal:'00100',municipio:'Ciudad de México',estado:'Ciudad de México',vigencia:'2020-2030'};
function evidence():IneEvidence{return {original:{values:{...identity},confidence:Object.fromEntries(identityKeys.map(k=>[k,95]))},processed:{values:{...identity},confidence:Object.fromEntries(identityKeys.map(k=>[k,96]))},warnings:[]}}

test('La CURP enfocada conserva su confianza real y puede sugerirse sin aprobarse automáticamente',()=>{
 const found=selectFocusedCurp({text:identity.curp,confidence:70},{text:identity.curp,confidence:75});
 assert.deepEqual(found,{value:identity.curp,confidence:70});
 const proof=evidence();proof.original.confidence.curp=found!.confidence;proof.processed.confidence.curp=found!.confidence;
 assert.equal(mergeIneReadings(proof.original,proof.processed).status.curp,'Revisar');
 assert.equal(evaluateIne(identity,proof,false,2026).outcome,'review');
 assert.equal(selectFocusedCurp({text:'NO LEGIBLE',confidence:99},{text:'NO LEGIBLE',confidence:99}),undefined);
 assert.equal(selectFocusedCurp({text:identity.curp,confidence:24},{text:identity.curp,confidence:99}),undefined);
 assert.equal(selectFocusedCurp({text:identity.curp,confidence:99},{text:'GODE561231HDFLRS09',confidence:99}),undefined);
});

test('El diagnóstico diferencia etiquetas ausentes y datos no extraídos sin revelar datos personales',()=>{
 const reading={values:{nombres:'PERSONA PRIVADA'},confidence:{}};
 const report=diagnoseIneReading('NOMBRES PERSONA PRIVADA\nC U R P: IDENTIFICADOR INVALIDO\nFECHA DE NACIMIENTO\nDOMICILIO\nCALLE PRIVADA 10',reading);
 assert.equal(report.nombres,'extracted');
 assert.equal(report.curp,'label-only');
 assert.equal(report.fechaNacimiento,'label-only');
 assert.equal(report.calleNumero,'label-only');
 assert.equal(report.vigencia,'not-located');
 assert.deepEqual(new Set(Object.values(report)),new Set(['extracted','label-only','not-located']));
 assert.equal(JSON.stringify(report).includes('PRIVADA'),false);
 assert.equal(diagnoseIneReading('',{values:{curp:identity.curp},confidence:{}}).curp,'extracted');
});
test('Solo aprueba dos lecturas claras y coherentes; los casos dudosos conservan motivos',()=>{
 assert.equal(evaluateIne(identity,evidence(),false,2026).outcome,'approved');
 for(const change of [(e:IneEvidence)=>{e.original.confidence.curp=74},(e:IneEvidence)=>{delete e.processed.values.nombres},(e:IneEvidence)=>{e.processed.values.nombres='OTRO'},(e:IneEvidence)=>{e.original.values.colonia='OTRA'},(e:IneEvidence)=>{e.warnings=['blur']},(e:IneEvidence)=>{e.failure='processing-error'}]){
  const e=evidence();change(e);const result=evaluateIne(identity,e,false,2026);assert.equal(result.outcome,'review');assert.ok(result.reasons.length);
 }
 assert.equal(evaluateIne(identity,evidence(),true,2026).outcome,'review');
 assert.equal(evaluateIne(identity,evidence(),false,2031).outcome,'review');
 assert.equal(evaluateIne({...identity,curp:'BAD'},evidence(),false,2026).outcome,'review');
 assert.equal(evaluateIne({...identity,vigencia:'2030'},evidence(),false,2026).outcome,'review'); // Declared expiry must match both readings too.
 assert.notEqual(normalizeIneValue('PEÑA'),normalizeIneValue('PENA'));
});
test('La evidencia se acota y no almacena texto OCR completo ni propiedades ajenas',()=>{
 const clean=cleanIneEvidence({...evidence(),rawText:'NO GUARDAR',documentImage:'NO GUARDAR'});
 assert.equal(JSON.stringify(clean).includes('NO GUARDAR'),false);
 assert.throws(()=>cleanIneEvidence({...evidence(),warnings:['desconocido']}));
 const bad=evidence();bad.processed.confidence.curp=101;assert.throws(()=>cleanIneEvidence(bad));
 const a={values:{nombres:'ANA'},confidence:{nombres:96}},b={values:{nombres:'OTRA'},confidence:{nombres:96}};
 assert.equal(mergeIneReadings(a,b).values.nombres,'OTRA');
 assert.equal(mergeIneReadings(a,b).status.nombres,'Revisar');
 const conflicting=evidence();conflicting.processed.values.nombres='OTRA';
 assert.equal(evaluateIne({...identity,nombres:'OTRA'},conflicting,false,2026).outcome,'review');
 assert.equal(fieldConfidences({nombres:'ANA'},[]).nombres,0);
});


test('La confianza usa la abreviatura impresa del estado, sin inventar puntuaciones',()=>{
 const blocks=[{paragraphs:[{lines:[{words:[{text:'LEON,',confidence:87},{text:'GTO.',confidence:78}]}]}]}] as any;
 assert.equal(fieldConfidences({estado:'Guanajuato'},blocks).estado,78);
 assert.equal(fieldConfidences({estado:'Hidalgo'},blocks).estado,0);
 assert.equal(fieldConfidences({estado:'Guanajuato'},[]).estado,0);
});
test('Los reintentos de CURP conservan el mejor par medido y bloquean contradicciones',()=>{
 assert.deepEqual(selectBestFocusedCurp([{value:identity.curp,confidence:79},{value:identity.curp,confidence:91}]),{value:identity.curp,confidence:91});
 assert.equal(selectBestFocusedCurp([{value:identity.curp,confidence:79},{value:identity.curp,confidence:82}])?.confidence,82);
 assert.equal(selectBestFocusedCurp([{value:identity.curp,confidence:79},{value:'GODE561231HDFLRS09',confidence:96}])?.confidence,0);
 assert.equal(selectBestFocusedCurp([]),undefined);
});


test('El minimo de 75 exige ambas lecturas y conserva las demas validaciones',()=>{
 const proof=evidence();
 for(const field of identityKeys){proof.original.confidence[field]=75;proof.processed.confidence[field]=75}
 assert.equal(evaluateIne(identity,proof,false,2026).outcome,'approved');
 assert.equal(mergeIneReadings(proof.original,proof.processed).status.curp,'Reconocido');
 for(const side of ['original','processed'] as const){
  const below=structuredClone(proof);below[side].confidence.curp=74.99;
  assert.equal(evaluateIne(identity,below,false,2026).outcome,'review');
  assert.equal(mergeIneReadings(below.original,below.processed).status.curp,'Revisar');
 }
 const mismatch=structuredClone(proof);mismatch.processed.values.curp='GODE561231HDFLRS09';
 assert.equal(evaluateIne(identity,mismatch,false,2026).outcome,'review');
 assert.equal(evaluateIne(identity,proof,true,2026).outcome,'review');
 assert.equal(evaluateIne(identity,proof,false,2031).outcome,'review');
});
