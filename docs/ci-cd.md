# CI/CD de Trade

El workflow `.github/workflows/ci.yml` valida tipos, ejecuta pruebas con una instancia MongoDB temporal y compila cada pull request y cada push a `main`. No utiliza Atlas en esas pruebas.

Cuando las validaciones pasan en `main`, el job `deploy` descarga exactamente el artefacto compilado por `verify`, publica el Worker `trade` y comprueba por HTTPS la página, la sesión anónima y la consulta de proveedores en Atlas. Un fallo de validación impide el despliegue. Los pull requests no publican.

La publicación sigue sin D1 ni R2 y conserva `MONGODB_URI` como secreto en Cloudflare. No se copia la contraseña de Atlas a GitHub. Las comprobaciones posteriores al despliegue son de lectura; un fallo marca el job como fallido pero no revierte automáticamente la versión publicada.

## Activación inicial

1. En https://dash.cloudflare.com/profile/api-tokens crea un token con la plantilla **Edit Cloudflare Workers**, limitado a la cuenta donde está alojado Trade. La cuenta es `7c2c9641382217699ab59377c21a991d`. Usa un token de API para CI, no la sesión OAuth de `wrangler login`.
2. Abre https://github.com/PeytonDenisse/Trade/settings/secrets/actions y pulsa **New repository secret**.
3. Nombre: `CLOUDFLARE_API_TOKEN`. Valor: el token anterior. No lo pegues en el chat, el código ni los logs.
4. En https://github.com/PeytonDenisse/Trade/actions selecciona **Trade - CI/CD**, pulsa **Run workflow** y elige `main`. También se ejecuta al subir o fusionar cambios en `main`.

El ID de cuenta está en el workflow porque es un identificador público, no una contraseña. El único secreto nuevo necesario es el token de Cloudflare.

## Uso diario

Trabaja en una rama y crea un pull request. Revisa el job `verify`. Al fusionar en `main`, GitHub ejecutará `verify` y después `deploy`, actualizando https://trade.trade-demo-eexxttrraa.workers.dev.

Las publicaciones de la misma rama se serializan para evitar despliegues simultáneos. Las verificaciones anteriores de un pull request se cancelan al recibir cambios nuevos.

Si `deploy` falla por el secreto faltante, agrégalo y usa **Re-run failed jobs** en esa ejecución. Si falla la prueba de conexión a Atlas, revisa la conectividad y las credenciales del Worker en Cloudflare. No ejecutes migraciones D1 para esta versión.

Referencia: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/.

## Acceso del equipo al recorrido completo
Cada despliegue genera un código de 192 bits, lo carga al secreto `DEMO_ACCESS_CODE` de Cloudflare y lo entrega como artefacto `team-demo-access` (7 días). Los colaboradores del repositorio privado pueden descargarlo en Actions e introducirlo en Recorrido de demo. No se guarda en el código ni se imprime en logs. El token de Cloudflare necesita el permiso de edición de Workers que ya usa el despliegue.

El Worker habilita `DEMO_ENABLED=true` y `MONGODB_FILES=true` al prepararse con `--without-images` (opción heredada que ahora significa sin R2). Las imágenes se guardan en MongoDB y las 20 historias pueden recorrerse con roles de demo. Solo usa información ficticia; el administrador de demo tiene los permisos de administración de esta POC compartida.
