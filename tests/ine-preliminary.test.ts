import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateInePreliminary} from '../lib/ine-preliminary';
import type {IneEvidence} from '../lib/ine-analysis';
import type {IneIdentity} from '../lib/ine-identity';

const declared:Partial<IneIdentity>={nombres:'ANA',apellidoPaterno:'RIVERA',sexo:'M',colonia:'CENTRO'};
function evidence(confidence=80):IneEvidence{return {original:{values:{...declared},confidence:{nombres:confidence,apellidoPaterno:confidence,sexo:confidence,colonia:confidence}},processed:{values:{...declared},confidence:{nombres:confidence,apellidoPaterno:confidence,sexo:confidence,colonia:confidence}},warnings:[]}}
test('exactamente tres coincidencias independientes aprueban la validación preliminar',()=>{const result=evaluateInePreliminary({...declared,colonia:''},evidence());assert.equal(result.status,'Validación preliminar aprobada');assert.equal(result.matched.length,3)});
test('más de tres coincidencias también cumplen',()=>{assert.equal(evaluateInePreliminary(declared,evidence()).matched.length,4)});
test('dos coincidencias quedan para revisión manual',()=>{const result=evaluateInePreliminary({nombres:'ANA',sexo:'M'},evidence());assert.equal(result.status,'Revisión manual');assert.equal(result.matched.length,2)});
test('79 % no cuenta; 80 % sí cuenta',()=>{assert.equal(evaluateInePreliminary(declared,evidence(79)).matched.length,0);assert.equal(evaluateInePreliminary(declared,evidence(80)).matched.length,4)});
test('una contradicción impide aprobar aunque haya tres coincidencias',()=>{const sample=evidence();sample.processed.values.colonia='OTRA';const result=evaluateInePreliminary(declared,sample);assert.equal(result.status,'Revisión manual');assert.deepEqual(result.conflicts,['colonia'])});
test('dos lecturas del mismo campo cuentan una sola vez',()=>{const result=evaluateInePreliminary({nombres:'ANA'},evidence());assert.deepEqual(result.matched,['nombres'])});
test('corregir manualmente recalcula y una nueva imagen reemplaza la evidencia',()=>{const first=evidence();assert.equal(evaluateInePreliminary(declared,first).matched.length,4);assert.equal(evaluateInePreliminary({...declared,nombres:'OTRA'},first).status,'Revisión manual');const replacement=evidence();replacement.original.values.nombres='OTRA';replacement.processed.values.nombres='OTRA';assert.equal(evaluateInePreliminary({...declared,nombres:'OTRA'},replacement).status,'Validación preliminar aprobada')});
test('una lectura fallida o ausente nunca aprueba',()=>{const failed=evidence();failed.failure='processing-error';assert.equal(evaluateInePreliminary(declared,failed).status,'Revisión manual');assert.equal(evaluateInePreliminary(declared,null).status,'Sin lectura')});
