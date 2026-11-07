# Prueba reversible de revisión al enviar

La lectura existente de INE se reutiliza sin modificar Tesseract, OpenCV, sus recortes ni los umbrales. La aplicación guarda el registro y publica únicamente el identificador de un trabajo. Un consumidor de confianza descarga la imagen privada desde MongoDB y ejecuta el lector en Browser Run. El backend toma la decisión mediante la misma transacción de la revisión administrativa.

El modo nuevo está **apagado por defecto en una instalación nueva**. En esta instalación se activó en el sitio publicado el **6 de noviembre de 2026**, con autorización para probarlo en Trade: se preparó Atlas conservando los registros, se creó la cola y se desplegaron el consumidor y el principal directamente con Wrangler. No se hizo commit ni push. El CI quedó preparado para conservar la cola y desplegar también el consumidor en los siguientes despliegues.

## Probar en la computadora, sin servicios de pago

Desde la carpeta Trade, usando Node 24 y pnpm del proyecto:

```powershell
pnpm review:trial
```

Si pnpm no está en PATH:

```powershell
$env:Path = (Resolve-Path '..\.local-tools\node_modules\node\bin').Path + ';' + $env:Path
node ..\.local-tools\node_modules\pnpm\bin\pnpm.cjs review:trial
```

Abre **http://127.0.0.1:5194**. El proceso usa MongoDB temporal y Edge sin interfaz en Windows; no lee `.env`, no conecta a Atlas y no necesita otra fotografía real. En otros sistemas instala el navegador de Playwright o configura `PLAYWRIGHT_CHANNEL`.

- **Documento ficticio · lectura OCR real:** ejecuta el mismo lector en un navegador independiente. Puede quedar pendiente si no alcanza 75 en ambas lecturas críticas. Es el resultado correcto, no un fallo de la automatización.
- **Lectura clara simulada:** prueba la aprobación, el cambio de rol y la bitácora usando evidencia ficticia de confianza 96. No mide OCR ni valida autenticidad.
- **Lectura dudosa simulada:** comprueba que no se apruebe ni rechace por incertidumbre del OCR.
- Apaga **Revisar automáticamente al enviar** y envía otro caso: quedará en la revisión habitual. Desactivarlo impide que trabajos en curso aprueben después. No deshace decisiones ya confirmadas.

Ctrl+C cierra el navegador y elimina la base temporal. Tu proyecto habitual continúa con la revisión anterior.

## Activación posterior en Cloudflare

Estos pasos ya se ejecutaron en esta instalación y se conservan como referencia para otras cuentas. No se cambió de plan ni se contrató un plan de pago. En otra cuenta verifica primero los límites y costos de Browser Run y Queues.

1. Ejecutar `pnpm db:automatic-review` sobre la base elegida: respalda el validador de ajustes, agrega tres campos opcionales de control y crea la colección de trabajos. No modifica usuarios, proveedores ni decisiones. Ejecutar también `pnpm db:analysis` si faltan los campos opcionales de INE.
2. Crear la cola `trade-provider-review-trial` con Wrangler.
3. Compilar y preparar el Worker principal con `node scripts/prepare-cloudflare.mjs --without-images --automatic-review`. La prueba solo admite documentos privados almacenados en MongoDB.
4. Desplegar el principal y el consumidor `workers/provider-review.wrangler.jsonc`, configurando `MONGODB_URI` como secreto del consumidor y `TRADE_APP_ORIGIN` como el origen HTTPS real. El consumidor no tiene endpoint HTTP público; solo atiende la cola.
5. En Administración → Ajustes → Registro, activar **Revisar automáticamente al enviar**. Solo las nuevas solicitudes y correcciones entran en la cola; no se reprocesan registros anteriores.

La comprobación publicada envió un documento sintético y el servicio leyó sus 12 campos en el primer intento, guardando un análisis con actor `system:provider-review`. El caso quedó pendiente por confianza de CURP inferior a 85, respetando las reglas. El servicio se verificó en Cloudflare, además de las pruebas locales; no se utilizó una INE real para esta comprobación.

El token del CI debe permitir desplegar Workers con sus bindings de Queues y Browser Run. La conexión `MONGODB_URI` del consumidor está configurada como secreto en Cloudflare; no se agrega al repositorio ni se necesita copiar su valor a GitHub para conservarlo durante un despliegue.

La integración automática está conectada en **https://trade.trade-demo-eexxttrraa.workers.dev**. `pnpm dev` conserva sus bindings locales y no publica trabajos en la cola real de Cloudflare automáticamente.

## Regresar al flujo anterior

Apaga el interruptor y guarda. La revisión administrativa actual sigue disponible. El backend comprueba el interruptor y su generación **dentro de la transacción de decisión**; trabajos viejos, con reservas vencidas o con documentos sustituidos no pueden aprobar. Volver a encenderlo no reactiva trabajos de generaciones anteriores.

Las aprobaciones ya guardadas permanecen: revertir el código o apagar el interruptor no revierte roles ni decisiones. Para volver también al código previo, la referencia inicial es `eb5eaaf472154702e0510452d2a3bd66e267a41d`; se guardó una copia ZIP en `.sites-runtime/backups/before-submit-review-eb5eaaf.zip`. No uses `git reset --hard` ni sobrescribas cambios posteriores para desactivar la prueba.

## Comprobaciones

Las pruebas usan MongoDB temporal. Cubren activación, falta de conexión a la cola, resultados falsificados del solicitante, aprobación con evidencia confiable, baja confianza, corrección de documentos, entregas duplicadas, dos consumidores, apagado con un análisis en curso, fallos y regreso a aprobación manual. La prueba de navegador comprueba la lectura independiente con datos sintéticos. Los resultados dudosos permanecen pendientes; esta prueba no introduce rechazo automático ni cambia las reglas de identidad.
