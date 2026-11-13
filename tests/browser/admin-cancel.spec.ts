import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{await page.goto('/tests/browser/harness.html');await page.waitForFunction(()=>Boolean((window as {harness?:unknown}).harness))});

test('Administración exige motivo y libera las actividades de la persona',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(()=>(window as any).harness.personCancellation());
  await expect(page.getByText('2 actividades abiertas')).toBeVisible();
  await page.getByRole('button',{name:'Cancelar solicitud'}).click();
  const requestDialog=page.getByRole('dialog',{name:/Cancelar la solicitud/});
  await expect(requestDialog.getByRole('button',{name:'Cancelar solicitud'})).toBeDisabled();
  await requestDialog.getByRole('textbox',{name:'Motivo de la cancelación'}).fill('Cambio de alcance de prueba');
  await requestDialog.getByRole('button',{name:'Cancelar solicitud'}).click();
  await expect(page.getByText('1 actividad abierta')).toBeVisible();
  await page.getByRole('button',{name:'Retirar cotización'}).click();
  const quoteDialog=page.getByRole('dialog',{name:/Retirar esta cotización/});
  await expect(quoteDialog.getByRole('button',{name:'Retirar cotización'})).toBeDisabled();
  await quoteDialog.getByRole('textbox',{name:'Motivo del retiro'}).fill('Cotización duplicada de prueba');
  await quoteDialog.getByRole('button',{name:'Retirar cotización'}).click();
  await expect(page.getByText('actividad abierta')).toHaveCount(0);
  const calls=await page.evaluate(()=>(window as any).harness.cancellationState.calls);
  expect(calls.map((call:{path:string})=>call.path)).toEqual(['admin/request-close','admin/quote-withdraw']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('Cliente y proveedor ven el motivo de cancelación en móvil',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>(window as any).harness.clientCancelled());
  await expect(page.getByText(/Administración canceló esta solicitud/)).toBeVisible();
  await expect(page.getByText(/Cambio de alcance de prueba/)).toBeVisible();
  await page.evaluate(()=>(window as any).harness.providerCancelled());
  await expect(page.getByText(/Administración canceló esta solicitud o trabajo/)).toBeVisible();
  await expect(page.getByText(/Cambio de alcance de prueba/)).toBeVisible();
  await page.evaluate(()=>(window as any).harness.providerQuoteWithdrawn());
  await expect(page.getByText(/Administración retiró tu cotización/)).toBeVisible();
  await page.evaluate(()=>(window as any).harness.clientQuoteWithdrawn());
  await expect(page.getByText(/Administración retiró esta cotización/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
