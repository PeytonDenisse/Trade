# Publicar Trade en Cloudflare Workers

## Publicación actual sin imágenes

Enlace: https://trade.trade-demo-eexxttrraa.workers.dev

La publicación usa MongoDB Atlas, sin D1 ni R2. Las rutas de carga y lectura de imágenes devuelven un aviso de indisponibilidad. Los pasos que requieren adjuntos, como el registro de proveedores y las evidencias de trabajos, quedan pendientes de habilitar almacenamiento. No se relajan esos requisitos.

Para actualizar la publicación, compila con Node 24 y pnpm, luego ejecuta:

```powershell
node scripts/prepare-cloudflare.mjs --without-images
.\scripts\cloudflare.ps1 deploy --config dist/server/wrangler.public.json
```

Wrangler conserva el secreto `MONGODB_URI` ya configurado. El archivo local `env` contiene credenciales y no debe subirse a Git.

## Publicación con imágenes, cuando se habilite R2

Desde PowerShell en la carpeta `Trade`, con las dependencias instaladas y `pnpm build` completado:

1. Crea una cuenta en https://dash.cloudflare.com/sign-up y verifica tu correo.
2. Conserva tu base MongoDB Atlas. Esta versión no utiliza D1.
3. Activa **R2** y crea un bucket privado llamado `trade-files`. Revisa las condiciones de facturación que muestre Cloudflare antes de activarlo. No habilites acceso público al bucket: la aplicación controla quién puede leer cada archivo.
4. Conecta Wrangler con tu cuenta:

```powershell
.\scripts\cloudflare.ps1 login
```

El navegador pedirá iniciar sesión y autorizar Wrangler. No compartas contraseñas ni tokens en el chat.

5. Compila la versión actual con `pnpm build` usando Node 24 y prepara la configuración:

```powershell
node scripts/prepare-cloudflare.mjs
```

Este script usa solo funciones básicas de Node y también funciona con Node 20. Genera `dist/server/wrangler.public.json` sin modificar la configuración local. Tras cada nueva compilación, vuelve a ejecutarlo.

6. Revisa el paquete sin publicarlo:

```powershell
.\scripts\cloudflare.ps1 deploy --config dist/server/wrangler.public.json --dry-run
```

7. Configura la conexión de Atlas como secreto. Pega la URI solo en la entrada privada que solicita Wrangler, nunca en el código ni en el chat. Comprueba que la base se llame `trade`; si tiene otro nombre, modifica `MONGODB_DB` en la configuración generada. Atlas debe permitir la conexión desde el alojamiento:

```powershell
.\scripts\cloudflare.ps1 secret put MONGODB_URI --config dist/server/wrangler.public.json
```

8. Publica la aplicación:

```powershell
.\scripts\cloudflare.ps1 deploy --config dist/server/wrangler.public.json
```

Wrangler imprimirá el enlace `https://trade.<tu-subdominio>.workers.dev`. Si pide registrar un subdominio workers.dev, elige uno en tu cuenta.

9. Abre el enlace y comprueba el registro, inicio de sesión y carga de archivos con cuentas ficticias. La aplicación usará los datos de la base Atlas configurada. Los archivos guardados en R2 local no se suben automáticamente.

La demo de roles de Sites queda deshabilitada (`DEMO_ENABLED=false`); el registro normal de Trade funciona sin ChatGPT. Para crear el primer administrador, registra una cuenta y, desde una consola MongoDB conectada a la base correcta, ejecuta lo siguiente sustituyendo el correo por el de esa cuenta:

```javascript
db.users.updateOne({ email: 'tu-correo@example.com' }, { $set: { role: 'admin' } });
```

La aplicación sigue siendo una POC académica con las limitaciones descritas en README. Usa datos ficticios para la presentación.

Referencia: https://developers.cloudflare.com/workers/wrangler/commands/.
