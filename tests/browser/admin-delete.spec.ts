import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{await page.goto('/tests/browser/harness.html');await page.waitForFunction(()=>Boolean((window as {harness?:unknown}).harness))});

test('Personas exige el correo y actualiza la lista después de eliminar',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(()=>(window as any).harness.directory());
  await expect(page.getByText('Mostrando')).toBeVisible();
  const own=page.getByRole('row',{name:/Administrador actual/});
  await expect(own.getByRole('button',{name:'Eliminar usuario'})).toHaveCount(0);
  const client=page.getByRole('row',{name:/Cliente de prueba/});
  await client.getByRole('button',{name:'Eliminar usuario'}).click();
  const dialog=page.getByRole('dialog',{name:'Eliminar usuario'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox',{name:'Escribe el correo para confirmar'})).toBeFocused();
  await expect(dialog.getByRole('button',{name:'Eliminar usuario'})).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(client).toBeVisible();
  await client.getByRole('button',{name:'Eliminar usuario'}).click();
  await dialog.getByRole('textbox',{name:'Escribe el correo para confirmar'}).fill('cliente@example.test');
  await dialog.getByRole('button',{name:'Eliminar usuario'}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('row',{name:/Cliente de prueba/})).toHaveCount(0);
  await expect(page.getByText('Mostrando 2 de 2 personas')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect(await page.evaluate(()=>(window as any).harness.deletionState.calls.length)).toBe(1);
});

test('La ficha elimina y cierra la vista en móvil',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>(window as any).harness.personDetail());
  await page.getByRole('button',{name:'Eliminar usuario'}).click();
  const dialog=page.getByRole('dialog',{name:'Eliminar usuario'});
  await expect(dialog).toBeVisible();
  expect((await dialog.getByRole('button',{name:'Eliminar usuario'}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await dialog.getByRole('textbox',{name:'Escribe el correo para confirmar'}).fill('cliente@example.test');
  await dialog.getByRole('button',{name:'Eliminar usuario'}).click();
  await expect(page.getByText('Volvió a Personas')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
