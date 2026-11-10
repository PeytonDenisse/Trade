import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test.beforeEach(async({page})=>{await page.goto('/tests/browser/harness.html');await page.waitForFunction(()=>!!(window as any).harness);await page.route('**/api/files/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from([137,80,78,71])}))});
test('La cola comienza por acción explícita, permite pausar y no decide después de salir',async({page})=>{
 await page.evaluate(()=>(window as any).harness.queue(true));
 await expect(page.getByRole('button',{name:'Iniciar revisión automática'})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).harness.state.posts.length)).toBe(0);
 await page.getByRole('button',{name:'Iniciar revisión automática'}).click();
 await page.waitForFunction(()=>!!(window as any).harness.state.release);
 await page.getByRole('button',{name:'Pausar',exact:true}).click();
 await expect(page.getByText('Revisión pausada.',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).harness.state.posts.length)).toBe(0);
 await page.getByRole('button',{name:'Iniciar revisión automática'}).click();
 await page.evaluate(()=>(window as any).harness.unmount());
 await expect.poll(()=>page.evaluate(()=>(window as any).harness.state.closed)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>(window as any).harness.state.posts.length)).toBe(0);
});
test('La cola procesa secuencialmente y muestra el resumen',async({page})=>{
 await page.evaluate(()=>(window as any).harness.queue(false));await page.getByRole('button',{name:'Iniciar revisión automática'}).click();
 await expect(page.getByText(/Aprobados: 1/)).toBeVisible();
 expect(await page.evaluate(()=>(window as any).harness.state.posts.length)).toBe(1);
 await page.getByRole('button',{name:'Pausar',exact:true}).click();
});
test('Por revisar reanaliza un pendiente de la regla anterior y muestra aprobación automática',async({page})=>{
 await page.evaluate(()=>(window as any).harness.queue(false,false,false,true));
 await page.getByRole('button',{name:'Iniciar revisión automática'}).click();
 await expect(page.getByText('registro aprobado automáticamente.',{exact:false})).toBeVisible();
 await expect(page.getByText(/Aprobados: 1/)).toBeVisible();
 await page.getByRole('button',{name:'Pausar',exact:true}).click();
});
test('No reprocesa automáticamente los registros anteriores aunque tengan identidad',async({page})=>{
 await page.evaluate(()=>(window as any).harness.queue(false,false,true));await page.getByRole('button',{name:'Iniciar revisión automática'}).click();
 await expect(page.getByText(/Esperando nuevos registros/)).toBeVisible();
 expect(await page.evaluate(()=>(window as any).harness.state.posts.length)).toBe(0);
 await page.getByRole('button',{name:'Pausar',exact:true}).click();
});
test('Un fallo de lectura queda para revisión y no provoca un rechazo',async({page})=>{
 await page.evaluate(()=>(window as any).harness.queue(false,true));await page.getByRole('button',{name:'Iniciar revisión automática'}).click();
 await expect(page.getByText(/Para revisión: 1/)).toBeVisible();
 expect(await page.evaluate(()=>(window as any).harness.state.posts[0].evidence.failure)).toBe('processing-error');
 await page.getByRole('button',{name:'Pausar',exact:true}).click();
});
test('El encuadre permite girar y no adjunta antes de confirmar; conserva correcciones manuales',async({page})=>{
 await page.evaluate(()=>(window as any).harness.editor());
 await page.getByRole('button',{name:'Girar 90°'}).click();await expect(page.getByRole('slider')).toHaveCount(4);
 expect(await page.evaluate(()=>(window as any).harness.state.uploads)).toBe(0);
 await page.evaluate(()=>(window as any).harness.capture());
 await page.getByRole('button',{name:/Información personal/}).click();
 await page.locator('#ine-nombres').fill('MI CORRECCIÓN');
 await page.getByRole('button',{name:'Guardar cambios'}).click();
 const image=await page.evaluate(async()=>Array.from(new Uint8Array(await (await (window as any).harness.card()).arrayBuffer())));
 await page.locator('#ine-gallery-file').setInputFiles({name:'sintetico.png',mimeType:'image/png',buffer:Buffer.from(image)});
 await page.getByRole('button',{name:'Usar imagen y analizar'}).click();
 await expect(page.getByRole('button',{name:'Conservar datos actuales y llenar vacíos'})).toBeVisible({timeout:120000});
 await page.getByRole('button',{name:'Conservar datos actuales y llenar vacíos'}).click();
 await page.getByRole('button',{name:/Información personal/}).click();
 await expect(page.locator('#ine-nombres')).toHaveValue('MI CORRECCIÓN');
 await page.getByRole('button',{name:'Cancelar'}).click();
 await page.getByText('Detalle de la lectura',{exact:true}).click();
 await expect(page.getByRole('table')).toBeVisible();
 await expect(page.getByRole('row').filter({has:page.getByRole('rowheader',{name:'Fecha de nacimiento',exact:true})})).toContainText('Dato extraído');
 await expect(page.getByRole('table')).not.toContainText('GALA561231MDFRPN79');
 const uploads=await page.evaluate(()=>(window as any).harness.state.uploads);
 expect(await page.evaluate(()=>(window as any).harness.state.uploads)).toBe(uploads);
 await page.getByRole('button',{name:/Información personal/}).click();
 await expect(page.locator('#ine-nombres')).toHaveValue('MI CORRECCIÓN');
 await page.getByRole('button',{name:'Cancelar'}).click();
 await page.locator('#ine-gallery-file').setInputFiles({name:'sintetico-2.png',mimeType:'image/png',buffer:Buffer.from(image)});
 await page.getByRole('button',{name:'Usar imagen y analizar'}).click();
 await expect(page.getByRole('button',{name:'Actualizar todos los datos'})).toBeVisible({timeout:120000});
 await page.getByRole('button',{name:'Actualizar todos los datos'}).click();
 await page.getByRole('button',{name:'Cancelar'}).click();
 await page.getByRole('button',{name:/Información personal/}).click();
 await expect(page.locator('#ine-nombres')).toHaveValue('MI CORRECCIÓN');
 await page.getByRole('button',{name:'Cancelar'}).click();
 await page.getByRole('button',{name:'Actualizar todos los datos'}).click();
 await page.getByRole('button',{name:'Sí, actualizar todos'}).click();
 await page.getByRole('button',{name:/Información personal/}).click();
 await expect(page.locator('#ine-nombres')).not.toHaveValue('MI CORRECCIÓN');
});

test('OCR de zonas reconoce valores sin sus etiquetas y no adjunta archivos',async({page})=>{
 const birth=await page.evaluate(()=>(window as any).harness.zoneRead('fechaNacimiento'));
 expect(birth.values).toEqual({fechaNacimiento:'1956-12-31'});expect(birth.status.fechaNacimiento).toBe('Revisar');
 const curp=await page.evaluate(()=>(window as any).harness.zoneRead('curp'));
 expect(curp.values.curp).toBe('GALA561231MDFRPN79');
 const address=await page.evaluate(()=>(window as any).harness.zoneRead('domicilio'));
 expect(address.values.codigoPostal).toBe('06000');expect(address.values.colonia).toBe('CENTRO');expect(address.values.municipio).toBe('CUAUHTEMOC');
 expect(await page.evaluate(()=>(window as any).harness.state.uploads)).toBe(0);
});
test('La captura de INE ofrece únicamente subir archivo y revisión en modales',async({page})=>{
 await page.evaluate(()=>(window as any).harness.capture());
 await expect(page.locator('#ine-gallery-file')).toBeAttached();
 await expect(page.getByRole('button',{name:/Tomar foto de mi INE/})).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Ingresar mis datos manualmente/})).toHaveCount(0);
 await page.getByRole('button',{name:/Información personal/}).click();
 await page.locator('#ine-nombres').fill('CORRECCIÓN TEMPORAL');
 await page.getByRole('button',{name:'Cancelar'}).click();
 await page.getByRole('button',{name:/Información personal/}).click();
 await expect(page.locator('#ine-nombres')).toHaveValue('');
});
test('La validación preliminar se actualiza al corregir un campo en desktop y móvil',async({page})=>{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>(window as any).harness.unmount());
  await expect(page.getByText('Otra sección')).toBeVisible();
  await page.evaluate(()=>(window as any).harness.preliminary());
  await expect(page.getByText('Validación preliminar aprobada.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:/Información personal/}).click();
  await page.locator('#ine-nombres').fill('CORRECCIÓN DISTINTA');
  await page.getByRole('button',{name:'Guardar cambios'}).click();
  await expect(page.getByRole('status').getByText(/^Revisión manual\./)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 }
});
test('OCR real: compara lecturas por campo con muestras sintéticas',async({page})=>{
 const scores=await page.evaluate(()=>(window as any).harness.benchmark());
 mkdirSync('.sites-runtime',{recursive:true});writeFileSync('.sites-runtime/ine-ocr-benchmark.json',JSON.stringify(scores,null,2));
 console.log(JSON.stringify(scores));
 expect(scores.find((s:any)=>s.variant==='clear').processed).toBeGreaterThanOrEqual(10);
 const reference=scores.find((s:any)=>s.variant==='reference-layout');expect(reference.missing).toEqual([]);expect(reference.processed).toBe(reference.total);
 expect(scores.find((s:any)=>s.variant==='reference-joined').missing).not.toContain('curp');
 expect(scores.find((s:any)=>s.variant==='reference-compact').missing).not.toContain('curp');
 const skew=scores.find((s:any)=>s.variant==='skew');expect(skew.processed).toBeGreaterThanOrEqual(skew.original);
});


test('La fecha recuperada en recortes conserva su puntuación aunque falte en la página completa',async({page})=>{
 const result=await page.evaluate(()=>(window as any).harness.cropConfidence());
 expect(result).toEqual({date:'1956-12-31',confidence:93});
});


test('La recuperacion local necesita etiquetas reales y no asigna campos por coordenadas',async({page})=>{
 expect(await page.evaluate(()=>(window as any).harness.recoverLabels(false))).toEqual([]);
 expect(await page.evaluate(()=>(window as any).harness.recoverLabels(true))).toEqual(['fechaNacimiento','vigencia','curp']);
});


test('La recuperacion busca vigencia aunque CURP y nacimiento ya tengan etiquetas',async({page})=>{
 expect(await page.evaluate(()=>(window as any).harness.recoverLabels(true,true))).toContain('vigencia');
});


test('El encabezado de domicilio deformado necesita dos relecturas validas',async({page})=>{
 expect(await page.evaluate(()=>(window as any).harness.verifyStreetHeading(true))).toBe(true);
 expect(await page.evaluate(()=>(window as any).harness.verifyStreetHeading(false))).toBe(false);
});
