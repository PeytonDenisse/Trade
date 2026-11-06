import assert from 'node:assert/strict';
import test from 'node:test';
import { curpFormatValid, extractIneCandidates, extractIneZoneCandidates, normalizeCurp, parseBirthDate,parseIneLocality } from '../lib/ine-ocr-parse';
import {consensusCandidate,curpMatchesOcrFields,layoutAddressCandidates,layoutGenderCandidate,layoutMunicipalityEvidence,layoutNameCandidates,planIneScans,planIneAddressBlock,planIneCurpRegion} from '../lib/ine-ocr-image';
import type {Block} from 'tesseract.js';

test('municipio y entidad admiten abreviaturas separadas o pegadas a la coma, sin adivinar entidades',()=>{
 for(const value of ['VILLA,GTO.','VILLA, G. T. O.','VILLA G T O.'])assert.deepEqual(parseIneLocality(value),{municipio:'VILLA',estado:'Guanajuato'});
 for(const value of ['VILLA XYZ.','VILLA GT0.','GTO.','VILLA 0000 GTO.','CURP GTO.'])assert.equal(parseIneLocality(value),undefined);
});

test('el municipio se localiza debajo de DOMICILIO aunque la colonia no tenga prefijo COL',()=>{
 const blocks=syntheticBlocks([
  [{text:'DOMICILIO',confidence:95,x0:500,y0:490,x1:640,y1:520}],
  [{text:'PRV',confidence:90,x0:500,y0:575,x1:570,y1:605},{text:'FICTICIA',confidence:90,x0:580,y0:575,x1:710,y1:605},{text:'06000',confidence:95,x0:720,y0:575,x1:810,y1:605}],
  [{text:'VILLA,GTO.',confidence:75,x0:500,y0:615,x1:750,y1:650}],
  [{text:'CLAVE',confidence:95,x0:500,y0:680,x1:590,y1:715}],
  [{text:'OTRA,CDMX',confidence:95,x0:500,y0:735,x1:750,y1:770}],
 ]);
 const row=layoutMunicipalityEvidence(blocks);
 assert.equal(row?.candidate.values.municipio,'VILLA');assert.equal(row?.candidate.values.estado,'Guanajuato');
 assert.equal(layoutMunicipalityEvidence(syntheticBlocks([[{text:'VILLA,GTO.',confidence:95,x0:500,y0:615,x1:750,y1:650}]])),undefined);
});

test('la CURP bajo su etiqueta no incluye los píxeles de la etiqueta y admite una línea completa',()=>{
 const below=syntheticBlocks([[{text:'CURP',confidence:95,x0:525,y0:800,x1:620,y1:832}]]);
 const area=planIneCurpRegion(below,1600,1024)!;
 assert.ok(area.top*1024>832);assert.ok((area.top+area.height)*1024>=880);
 assert.ok(area.width*1600>=500);
 const inline=syntheticBlocks([[{text:'CURP',confidence:95,x0:100,y0:100,x1:190,y1:130},{text:'GODE561231HDFLRS09',confidence:70,x0:210,y0:98,x1:570,y1:135}]]);
 const line=planIneCurpRegion(inline,1600,1024)!;
 assert.ok(line.left*1600>190);assert.ok(line.top*1024<=98);assert.ok((line.top+line.height)*1024>=135);
 assert.equal(planIneCurpRegion(null,1600,1024),undefined);
});

test('el recorte de CURP ignora AÑO DE REGISTRO a su derecha y termina antes de nacimiento',()=>{
 const blocks=syntheticBlocks([
  [{text:'CURP',confidence:95,x0:525,y0:800,x1:620,y1:832},{text:'AÑODEREGISTRO',confidence:90,x0:1125,y0:800,x1:1430,y1:832}],
  [{text:'FECHA',confidence:90,x0:525,y0:900,x1:630,y1:932},{text:'DE',confidence:90,x0:640,y0:900,x1:680,y1:932},{text:'NACIMIENTO',confidence:90,x0:690,y0:900,x1:900,y1:932}],
 ]);
 const area=planIneCurpRegion(blocks,1600,1024)!;
 assert.ok(area.left*1600<525);assert.ok(area.top*1024>832);
 assert.ok((area.top+area.height)*1024<900);assert.ok((area.top+area.height)*1024>=880);
 assert.ok((area.left+area.width)*1600<1125);
});

test('la zona elegida permite leer sin etiqueta y requiere dos valores válidos iguales',()=>{
 assert.deepEqual(extractIneZoneCandidates('fechaNacimiento','31/12/1956','31 / 12 / 1956'),{values:{fechaNacimiento:'1956-12-31'},status:{fechaNacimiento:'Revisar'}});
 assert.deepEqual(extractIneZoneCandidates('fechaNacimiento','31/12/1956','30/12/1956').values,{});
 assert.deepEqual(extractIneZoneCandidates('fechaNacimiento','31/02/1956','31/02/1956').values,{});
 assert.equal(extractIneZoneCandidates('curp','GODE561231HDFLRS09','GODE 561231 HDFLRS09').values.curp,'GODE561231HDFLRS09');
 assert.deepEqual(extractIneZoneCandidates('curp','NO LEGIBLE','NO LEGIBLE').values,{});
 const address='C CALLE FICTICIA 10\nCOL CENTRO 37000\nLEÓN, GTO.';
 assert.equal(Object.keys(extractIneZoneCandidates('domicilio',address,address).values).length,5);
 assert.equal(extractIneZoneCandidates('domicilio',address,address.replace('CENTRO','OTRA')).values.colonia,undefined);
 assert.equal(extractIneZoneCandidates('domicilio',address.replace('LEÓN','PEÑA'),address.replace('LEÓN','PENA')).values.municipio,undefined);
 assert.equal(extractIneZoneCandidates('curp','GODE561231HDFLRS09','GODE561231HDFLRS09').values.fechaNacimiento,undefined);
});

test('el recorte de domicilio incluye las tres líneas y termina antes de CURP',()=>{
 const blocks=syntheticBlocks([
  [{text:'DOMICILIO',confidence:95,x0:500,y0:490,x1:640,y1:520}],
  [{text:'CURP',confidence:95,x0:500,y0:705,x1:580,y1:735}],
 ]);
 const area=planIneAddressBlock(blocks,1600,1000)!;
 assert.ok(area);assert.equal(area.top,0.52);
 assert.ok((area.top+area.height)*1000>650);
 assert.ok((area.top+area.height)*1000<705);
 assert.equal(planIneAddressBlock(null,1600,1000),undefined);
});

test('lee CURP con espacios y renglones separados sin tomar claves de elector',()=>{
 for(const input of ['CURP: GODE 561231 HDFLRS09','C U R P\nGODE 561231\nHDFLRS09','CLAVE DE ELECTOR\nCURP: GODE561231HDFLRS09'])assert.equal(extractIneCandidates(input).values.curp,'GODE561231HDFLRS09');
 assert.equal(extractIneCandidates('CURP\nGODE 561231\nSEXO H\nHDFLRS09').values.curp,undefined);
 assert.equal(extractIneCandidates('CLAVE DE ELECTOR\nGROLJN56062609H300').values.curp,undefined);
});
test('lee fecha con separadores espaciados, espacios o formato ISO',()=>{
 for(const input of ['31 / 12 / 1956','31 12 1956','1956-12-31'])assert.equal(parseBirthDate(input),'1956-12-31');
 assert.equal(extractIneCandidates('FECHADENACIMIENTO: 31 / 12 / 1956').values.fechaNacimiento,'1956-12-31');
 assert.equal(extractIneCandidates('CLAVE DE ELECTOR\nFECHA DE NACIMIENTO: 31/12/1956').values.fechaNacimiento,'1956-12-31');
 assert.equal(extractIneCandidates('CLAVE DE ELECTOR\nFECHADENACIMIENTO: 31/12/1956').values.fechaNacimiento,'1956-12-31');
 assert.equal(parseBirthDate('31 / 02 / 2000'),undefined);
});

test('una etiqueta de nacimiento truncada admite solo fechas reales y queda para revisar',()=>{
 const result=extractIneCandidates('FECHA DE NACIMIE\n31/12/1956');
 assert.equal(result.values.fechaNacimiento,'1956-12-31');assert.equal(result.status.fechaNacimiento,'Revisar');
 assert.equal(extractIneCandidates('FECHA DE NACIMI\n31/02/1956').values.fechaNacimiento,undefined);
 assert.equal(extractIneCandidates('FECHA\n31/12/1956').values.fechaNacimiento,undefined);
});

test('el segundo renglón sin COL requiere una calle anterior y un código postal impreso',()=>{
 const result=extractIneCandidates('DOMICILIO\nC CALLE FICTICIA 10\nPRV JARDIN FICTICIO 06000\nCUAUHTEMOC, CDMX');
 assert.equal(result.values.colonia,'PRV JARDIN FICTICIO');assert.equal(result.values.codigoPostal,'06000');
 assert.equal(result.values.municipio,'CUAUHTEMOC');assert.equal(result.values.estado,'Ciudad de México');
 assert.equal(extractIneCandidates('DOMICILIO\nPRV JARDIN FICTICIO 06000').values.colonia,undefined);
 assert.equal(extractIneCandidates('DOMICILIO\nC CALLE FICTICIA 10\nPRV JARDIN FICTICIO').values.colonia,undefined);
 assert.equal(extractIneCandidates('DOMICILIO\nC CALLE FICTICIA 10\nSECCION 06000').values.colonia,undefined);
});

test('los recortes bajo las etiquetas incluyen la altura completa del valor',()=>{
 const blocks=syntheticBlocks([
  [{text:'CURP',confidence:95,x0:525,y0:800,x1:620,y1:832}],
  [{text:'FECHA',confidence:95,x0:525,y0:900,x1:630,y1:932},{text:'DE',confidence:95,x0:640,y0:900,x1:680,y1:932},{text:'NACIMIE',confidence:90,x0:690,y0:900,x1:860,y1:932}],
 ]);
 const scans=planIneScans(blocks,1600,1024);
 for(const [field,top,bottom] of [['curp',845,880],['fechaNacimiento',945,980]] as const){
  const value=scans.find(scan=>scan.field===field)?.value;assert.ok(value);
  assert.ok(value.top*1024<=top);assert.ok((value.top+value.height)*1024>=bottom);
 }
});

test('la vigencia no toma el año de una fecha ni valores de varias columnas',()=>{
 for(const value of ['31/12/1956','31/12/1956 0000 2020-2030','2022 01 2020-2030'])assert.equal(extractIneCandidates('VIGENCIA\n'+value).values.vigencia,undefined);
 assert.equal(extractIneCandidates('VIGENCIA\n2020 - 2030').values.vigencia,'2020-2030');
});
test('separa el domicilio impreso bajo una sola etiqueta',()=>{
 const result=extractIneCandidates('DOMICILIO\nC CALLE FICTICIA 10\nCOL CENTRO 37000\nLEÓN, GTO.\nCURP\nGODE561231HDFLRS09');
 assert.deepEqual({calle:result.values.calleNumero,colonia:result.values.colonia,cp:result.values.codigoPostal,municipio:result.values.municipio,estado:result.values.estado},{calle:'C CALLE FICTICIA 10',colonia:'CENTRO',cp:'37000',municipio:'LEÓN',estado:'Guanajuato'});
 assert.equal(result.values.curp,'GODE561231HDFLRS09');
 assert.equal(extractIneCandidates('DOMICILIO\nCOL CENTRO 37000\nLEÓN, GTO.').values.calleNumero,undefined);
 assert.equal(extractIneCandidates('DOMICILIO\nC CALLE FICTICIA 10\nCOL CENTRO 37000\nCIUDAD DESCONOCIDA, XYZ').values.estado,undefined);
});

test('extrae únicamente los datos esperados de líneas etiquetadas', () => {
  const result = extractIneCandidates(`
NOMBRES: JUAN CARLOS
APELLIDO PATERNO: GARCÍA
APELLIDO MATERNO: LÓPEZ
FECHA DE NACIMIENTO: 31/12/1956
SEXO: H
CURP: gode561231hdflrs09
DOMICILIO: AV. CENTRAL 25
COLONIA: CENTRO
C.P.: 06000
MUNICIPIO: CUAUHTÉMOC
ESTADO: CIUDAD DE MÉXICO
VIGENCIA: 2020-2030
CLAVE DE ELECTOR: GROLJN56062609H300
`);
  assert.deepEqual(result.values, {
    nombres: 'JUAN CARLOS',
    apellidoPaterno: 'GARCÍA',
    apellidoMaterno: 'LÓPEZ',
    fechaNacimiento: '1956-12-31',
    sexo: 'H',
    curp: 'GODE561231HDFLRS09',
    calleNumero: 'AV. CENTRAL 25',
    colonia: 'CENTRO',
    codigoPostal: '06000',
    municipio: 'CUAUHTÉMOC',
    estado: 'CIUDAD DE MÉXICO',
    vigencia: '2020-2030',
  });
  assert.equal(result.status.fechaNacimiento, 'Reconocido');
  assert.equal(result.status.nombres, 'Revisar');
  assert.equal(result.status.curp, 'Reconocido');
  assert.equal(JSON.stringify(result).includes('GROLJN56062609H300'), false);
  assert.equal(JSON.stringify(result).includes('claveElector'), false);
});

test('reconoce el bloque de apellidos y nombres de la credencial', () => {
  const result = extractIneCandidates('NOMBRE\nGARCÍA\nLÓPEZ\nANA MARÍA\nFECHA DE NACIMIENTO\n29/02/2000\nSEXO\nM');
  assert.deepEqual(result.values, {
    apellidoPaterno: 'GARCÍA',
    apellidoMaterno: 'LÓPEZ',
    nombres: 'ANA MARÍA',
    fechaNacimiento: '2000-02-29',
    sexo: 'M',
  });
});

test('omite los valores contiguos a etiquetas excluidas y datos inválidos', () => {
  const result = extractIneCandidates(`
CLAVE DE ELECTOR
GROLJN56062609H300
FECHA DE NACIMIENTO: 31/02/2000
SEXO: X
CURP: NO-ES-CURP
CÓDIGO POSTAL: 1234
VIGENCIA: 2030-2020
NOMBRES: CLAVE DE ELECTOR GROLJN56062609H300
`);
  assert.deepEqual(result, { values: {}, status: {} });
});

test('una clave de elector en la misma línea no oculta el campo siguiente', () => {
  const result = extractIneCandidates('CLAVE DE ELECTOR GROLJN56062609H300\nSEXO: M');
  assert.deepEqual(result.values, { sexo: 'M' });
  assert.equal(JSON.stringify(result).includes('GROLJN56062609H300'), false);
});

test('descarta identificadores ajenos y no devuelve el texto OCR completo', () => {
  const result = extractIneCandidates(`
ELECTOR KEY
GROLJN56062609H300
SECCIÓN: 1234
NOMBRES: ANA
APELLIDO PATERNO: ${'X'.repeat(101)}
TEXTO SIN ETIQUETA: secreto sintético
`);
  assert.deepEqual(result.values, { nombres: 'ANA' });
  assert.deepEqual(result.status, { nombres: 'Revisar' });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('GROLJN56062609H300'), false);
  assert.equal(serialized.includes('secreto sintético'), false);
  assert.equal(serialized.includes('SECCIÓN'), false);
});

test('valida formatos estructurales de fecha y CURP sin afirmar autenticidad', () => {
  assert.equal(normalizeCurp(' gode561231hdflrs09 '), 'GODE561231HDFLRS09');
  assert.equal(curpFormatValid('GODE561231HDFLRS09'), true);
  assert.equal(curpFormatValid('GODE561231XDFLRS09'), true);
  assert.equal(curpFormatValid('GODE563231HDFLRS09'), false);
  assert.equal(curpFormatValid('GODE561231HXXLRS09'), false);
  assert.equal(parseBirthDate('29/02/2000'), '2000-02-29');
  assert.equal(parseBirthDate('29/02/2001'), undefined);
  assert.equal(parseBirthDate('01/01/2999'), undefined);
});

test('lee una vigencia en el renglón siguiente aunque la etiqueta tenga ruido', () => {
  const result=extractIneCandidates('VIGENCIA |\n2020 - 2030');
  assert.equal(result.values.vigencia,'2020-2030');
  assert.equal(result.status.vigencia,'Revisar');
});

test('corrige un carácter ambiguo de OCR solo en la fecha de una CURP estructuralmente válida', () => {
  const result=extractIneCandidates('CURP\nGOML9O0101HDFRRN09');
  assert.equal(result.values.curp,'GOML900101HDFRRN09');
  assert.equal(result.status.curp,'Revisar');
  assert.equal(extractIneCandidates('CURP\nGOML9O0199HDFRRN09').values.curp,undefined);
});

test('no coloca SEXO H ni ruido de columnas en Nombre(s)', () => {
  for(const text of [
    'NOMBRE\n... SEXO H',
    'NOMBRE ... SEXO H\nDOMICILIO',
    'NOMBRES: ... SEXO H',
    'NOMBRE\nAPELLIDO\nSEXO H\nANA',
  ]){
    const result=extractIneCandidates(text);
    assert.equal(result.values.nombres,undefined);
    assert.equal(result.values.apellidoPaterno,undefined);
    assert.equal(result.values.apellidoMaterno,undefined);
    assert.equal(JSON.stringify(result.values).includes('... SEXO H'),false);
  }
  assert.equal(extractIneCandidates('NOMBRE\n... SEXO H').values.sexo,'H');
});

test('no confunde un bloque incompleto de tres líneas con el nombre de pila', () => {
  const result=extractIneCandidates('NOMBRE\nPEREZ\nSEXO H\nANA MARIA');
  assert.equal(result.values.nombres,undefined);
  assert.equal(result.values.apellidoPaterno,undefined);
  assert.equal(result.values.sexo,'H');
});

test('rechaza etiquetas intercaladas y conserva valores explícitos válidos', () => {
  const result=extractIneCandidates('NOMBRES: ANA MARIA\nAPELLIDO PATERNO\n... CURP\nDOMICILIO: AV. CENTRAL 25\nSEXO H');
  assert.equal(result.values.nombres,'ANA MARIA');
  assert.equal(result.values.apellidoPaterno,undefined);
  assert.equal(result.values.calleNumero,'AV. CENTRAL 25');
  assert.equal(result.values.sexo,'H');
});

test('separa el encabezado NOMBRE de SEXO cuando ambos ocupan la misma fila',()=>{
  const result=extractIneCandidates('NOMBRE SEXO H\nPEREZ\nLOPEZ\nANA MARIA\nDOMICILIO\nCALLE CENTRAL 12');
  assert.equal(result.values.nombres,'ANA MARIA');
  assert.equal(result.values.apellidoPaterno,'PEREZ');
  assert.equal(result.values.apellidoMaterno,'LOPEZ');
  assert.equal(result.values.sexo,'H');
  assert.equal(result.values.calleNumero,'CALLE CENTRAL 12');
});

test('un encabezado de dos columnas incompleto no rellena nombres',()=>{
  const result=extractIneCandidates('NOMBRE ... SEXO H\nPEREZ\n...\nANA MARIA');
  assert.equal(result.values.nombres,undefined);
  assert.equal(result.values.apellidoPaterno,undefined);
  assert.equal(result.values.apellidoMaterno,undefined);
  assert.equal(result.values.sexo,'H');
});

test('GÉNERO NB junto al encabezado nunca se interpreta como nombre',()=>{
  for(const text of [
    'NOMBRE GÉNERO NB',
    'NOMBRE GENERONB',
    'NOMBRES: GÉNERO NB',
    'NOMBRES: GENERONB',
    'NOMBRE\nGENERO NB',
  ]){
    const result=extractIneCandidates(text);
    assert.equal(result.values.nombres,undefined);
  }
});

test('GÉNERO NB se reconoce como marcador propio sin contaminar el nombre',()=>{
  assert.equal(extractIneCandidates('GÉNERO NB').values.sexo,'NB');
  assert.equal(extractIneCandidates('NOMBRE GÉNERO NB').values.sexo,'NB');
  assert.equal(extractIneCandidates('NOMBRE GENERONB').values.sexo,'NB');
  assert.equal(extractIneCandidates('NOMBRE GÉNERO NB').values.nombres,undefined);
});

test('el domicilio necesita forma de calle; rechaza ruido aunque esté bajo su etiqueta',()=>{
  assert.equal(extractIneCandidates('DOMICILIO\nUN £').values.calleNumero,undefined);
  assert.equal(extractIneCandidates('DOMICILIO: RUIDO SIN DATOS').values.calleNumero,undefined);
  assert.equal(extractIneCandidates('DOMICILIO\nAV. CENTRAL 25').values.calleNumero,'AV. CENTRAL 25');
  assert.equal(extractIneCandidates('DOMICILIO\nCALLE DEL SOL S/N').values.calleNumero,'CALLE DEL SOL S/N');
});

function syntheticBlocks(lines:{text:string;confidence:number;x0:number;y0:number;x1:number;y1:number}[][]):Block[]{
  return [{paragraphs:[{lines:lines.map(words=>({words:words.map(({text,confidence,x0,y0,x1,y1})=>({text,confidence,bbox:{x0,y0,x1,y1}}))}))}]}] as unknown as Block[];
}

test('las regiones se anclan a etiquetas de columnas y no a coordenadas de una fotografía',()=>{
  const blocks=syntheticBlocks([
    [{text:'NOMBRE',confidence:90,x0:100,y0:300,x1:250,y1:350},{text:'SEXO',confidence:95,x0:900,y0:300,x1:1000,y1:350}],
    [{text:'PEREZ',confidence:92,x0:105,y0:355,x1:230,y1:400}],
    [{text:'LOPEZ',confidence:15,x0:105,y0:420,x1:230,y1:460}],
    [{text:'ANA',confidence:10,x0:105,y0:485,x1:180,y1:530}],
    [{text:'CURP',confidence:96,x0:100,y0:600,x1:200,y1:650}],
    [{text:'FECHA',confidence:80,x0:100,y0:700,x1:210,y1:750},{text:'DE',confidence:80,x0:215,y0:700,x1:250,y1:750},{text:'NACIMIENTO',confidence:80,x0:255,y0:700,x1:480,y1:750},{text:'VIGENCIA',confidence:90,x0:850,y0:700,x1:1030,y1:750}],
  ]);
  const scans=planIneScans(blocks,1600,1200);
  assert.deepEqual(scans.map(scan=>scan.field),['nombres','fechaNacimiento','vigencia','curp']);
  assert.ok(scans.find(scan=>scan.field==='fechaNacimiento')!.value.left<.2);
  assert.ok(scans.find(scan=>scan.field==='vigencia')!.value.left>.5);
  assert.equal(layoutNameCandidates(blocks).values.apellidoPaterno,'PEREZ');
});

test('sin etiqueta o con baja confianza espacial no se crean candidatos',()=>{
  const blocks=syntheticBlocks([
    [{text:'NOMBRE',confidence:30,x0:100,y0:300,x1:250,y1:350}],
    [{text:'PEREZ',confidence:95,x0:105,y0:355,x1:230,y1:400}],
    [{text:'VIGENCIA',confidence:90,x0:900,y0:700,x1:1080,y1:750}],
  ]);
  assert.deepEqual(planIneScans(blocks,1600,1200).map(scan=>scan.field),['vigencia']);
  assert.deepEqual(layoutNameCandidates(blocks).values,{});
});

test('los renglones compactos se separan de la columna GÉNERO',()=>{
  const blocks=syntheticBlocks([
    [{text:'NOMBRE',confidence:96,x0:498,y0:251,x1:616,y1:306},{text:'GÉNERO',confidence:90,x0:1271,y0:260,x1:1442,y1:292},{text:'NB',confidence:90,x0:1450,y0:260,x1:1490,y1:292}],
    [{text:'PEREZ',confidence:88,x0:496,y0:303,x1:616,y1:336}],
    [{text:'GARCIA',confidence:96,x0:495,y0:331,x1:688,y1:393}],
  ]);
  assert.deepEqual(layoutNameCandidates(blocks).values,{apellidoPaterno:'PEREZ',apellidoMaterno:'GARCIA'});
  const nameScan=planIneScans(blocks,1500,948).find(scan=>scan.field==='nombres');
  assert.ok(nameScan);
  assert.ok(nameScan.value.top*948>=370&&nameScan.value.top*948<=385);
  assert.ok((nameScan.value.left+nameScan.value.width)*1500<1000);
});

test('el marcador NB debe estar a la derecha de GÉNERO en su propia columna',()=>{
  const blocks=syntheticBlocks([
    [{text:'NOMBRE',confidence:95,x0:500,y0:250,x1:620,y1:305},{text:'GÉNERO',confidence:92,x0:1250,y0:260,x1:1410,y1:300},{text:'NB',confidence:91,x0:1420,y0:260,x1:1460,y1:300}],
  ]);
  assert.equal(layoutGenderCandidate(blocks).values.sexo,'NB');
  const distant=syntheticBlocks([
    [{text:'NOMBRE',confidence:95,x0:500,y0:250,x1:620,y1:305},{text:'GÉNERO',confidence:92,x0:1250,y0:260,x1:1410,y1:300}],
    [{text:'NB',confidence:91,x0:1420,y0:390,x1:1460,y1:430}],
  ]);
  assert.deepEqual(layoutGenderCandidate(distant).values,{});
});

test('la CURP reconocida debe concordar con fecha y sexo si también se leyeron',()=>{
  assert.equal(curpMatchesOcrFields('GODE561231HDFLRS09','1956-12-31','H'),true);
  assert.equal(curpMatchesOcrFields('GODE561231HDFLRS09','1956-12-30','H'),false);
  assert.equal(curpMatchesOcrFields('GODE561231HDFLRS09','1956-12-31','M'),false);
  assert.equal(curpMatchesOcrFields('GODE561231HDFLRS09','1956-12-31','NB'),true);
});

test('dos lecturas válidas contradictorias dejan el campo pendiente',()=>{
  assert.equal(consensusCandidate(['2001-01-01','2001-01-01']),'2001-01-01');
  assert.equal(consensusCandidate(['2001-01-01','2001-01-02']),undefined);
  assert.equal(consensusCandidate(['2001-01-01','2001-01-01','2001-01-02']),undefined);
  assert.equal(consensusCandidate(['2001-01-01']),undefined);
});

test('la segunda línea de domicilio separa colonia y código postal por posición',()=>{
  const blocks=syntheticBlocks([
    [{text:'DOMICILIO',confidence:96,x0:500,y0:490,x1:640,y1:520}],
    [{text:'AV.',confidence:90,x0:500,y0:535,x1:550,y1:565},{text:'CENTRAL',confidence:90,x0:555,y0:535,x1:665,y1:565},{text:'25',confidence:95,x0:675,y0:535,x1:710,y1:565}],
    [{text:'COL.',confidence:86,x0:500,y0:575,x1:570,y1:605},{text:'JARDINES',confidence:85,x0:590,y0:575,x1:720,y1:605},{text:'DEL',confidence:86,x0:730,y0:575,x1:780,y1:605},{text:'SUR',confidence:84,x0:790,y0:575,x1:850,y1:605},{text:'03100',confidence:96,x0:880,y0:575,x1:970,y1:605}],
    [{text:'GENERO',confidence:95,x0:1200,y0:575,x1:1390,y1:605}],
  ]);
  const result=layoutAddressCandidates(blocks);
  assert.deepEqual(result.values,{colonia:'JARDINES DEL SUR',codigoPostal:'03100'});
  assert.equal(result.status.colonia,'Revisar');
  assert.equal(result.status.codigoPostal,'Revisar');
});

test('un número aislado o fuera del renglón de colonia no se usa como código postal',()=>{
  const withoutColony=syntheticBlocks([
    [{text:'DOMICILIO',confidence:95,x0:500,y0:490,x1:640,y1:520}],
    [{text:'COL.',confidence:95,x0:500,y0:575,x1:570,y1:605},{text:'03100',confidence:96,x0:880,y0:575,x1:970,y1:605}],
  ]);
  assert.deepEqual(layoutAddressCandidates(withoutColony).values,{});
  const otherRow=syntheticBlocks([
    [{text:'DOMICILIO',confidence:95,x0:500,y0:490,x1:640,y1:520}],
    [{text:'COL.',confidence:95,x0:500,y0:575,x1:570,y1:605},{text:'JARDINES',confidence:95,x0:590,y0:575,x1:720,y1:605}],
    [{text:'03100',confidence:96,x0:880,y0:680,x1:970,y1:710}],
  ]);
  assert.deepEqual(layoutAddressCandidates(otherRow).values,{});
});

test('municipio y estado requieren fila propia y abreviatura conocida',()=>{
  const lines=[
    [{text:'DOMICILIO',confidence:96,x0:500,y0:490,x1:640,y1:520}],
    [{text:'COL.',confidence:86,x0:500,y0:575,x1:570,y1:605}],
    [{text:'VILLA',confidence:93,x0:500,y0:615,x1:590,y1:650},{text:'GTO.',confidence:60,x0:650,y0:615,x1:720,y1:650}],
  ];
  const evidence=layoutMunicipalityEvidence(syntheticBlocks(lines));
  assert.equal(evidence?.candidate.values.municipio,'VILLA');
  assert.equal(evidence?.candidate.values.estado,'Guanajuato');
  const unrelated=syntheticBlocks([
    lines[0],lines[1],
    [{text:'VILLA',confidence:93,x0:500,y0:615,x1:590,y1:650},{text:'XYZ.',confidence:90,x0:650,y0:615,x1:720,y1:650}],
  ]);
  assert.equal(layoutMunicipalityEvidence(unrelated),undefined);
});

test('la fecha inferida exige validar su propia etiqueta junto a vigencia',()=>{
  const blocks=syntheticBlocks([
    [{text:'NOMBRE',confidence:96,x0:500,y0:250,x1:620,y1:305}],
    [{text:'VIGENCIA',confidence:94,x0:1020,y0:787,x1:1160,y1:857}],
  ]);
  const date=planIneScans(blocks,1500,948).find(scan=>scan.field==='fechaNacimiento');
  assert.ok(date?.anchor);
  assert.equal(date.label,'FECHA DE NACIMIENTO');
  assert.ok(date.anchor.left<.4);
  assert.ok(date.value.top>date.anchor.top);
});
