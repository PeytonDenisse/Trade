# Trade — POC académica

Para presentar el flujo de cliente, proveedor y administración, consulta [el guion paso a paso con cuentas y contraseñas](docs/demo-presentacion.md). Usa **Cuentas de presentación** para seguir un solo servicio desde su creación hasta la reseña.

Aplicación para solicitar servicios de oficios y seguir su contratación hasta la evaluación.

## Alcance
20 historias HU-01 a HU-20 de Requerimientos (1).docx. Jira existente: KAN-11 a KAN-30. Siete épicas KAN-4 a KAN-10. Una historia por funcionalidad. No procesa pagos ni certifica identidades reales.

## Arquitectura
React + TypeScript con Vinext. API en `lib/api.ts`, validaciones en `lib/rules.ts`, interfaz en `app/page.tsx`. Base MongoDB Atlas (colecciones en `db/collections.ts`, conexión por petición en `db/mongo.ts`), archivos en MongoDB con MONGODB_FILES=true (R2 opcional). El esquema SQL original queda como referencia en `db/schema.ts` y `drizzle/`. Aplicación monolítica sin microservicios. Cada petición comprueba sesión, propietario y rol. Las contraseñas usan PBKDF2-SHA256 con sal aleatoria, las sesiones son HttpOnly/SameSite y caducan en 24 horas. Sites conserva su acceso privado mediante ChatGPT, separado del registro académico de Trade.

## Ejecución local (Windows, macOS, Linux)
Requisitos: Node 24 y pnpm 11.25.0. Desde la carpeta:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm db:setup
pnpm dev
```

Antes, copia `.env.example` a `.env` con tu `MONGODB_URI` (ver MongoDB Atlas). Usa la dirección impresa por el servidor. `pnpm db:setup` puede repetirse sin duplicar datos. `pnpm test` no usa Atlas: levanta un MongoDB temporal en memoria (la primera vez descarga unos 600 MB). Los archivos privados locales y credenciales no se versionan.

Los colaboradores pueden usar **Cuentas de presentación** para entrar como cliente, proveedor o administrador con sus credenciales ficticias. El registro normal crea cuentas de cliente; desde Mi inicio pueden solicitar un perfil de proveedor.

## MongoDB Atlas
Copia `.env.example` a `.env` y completa `MONGODB_URI` con tu usuario y contraseña. `.env` no se versiona.

```sh
pnpm db:ping                                   # comprueba la conexión
pnpm db:setup                                  # crea las 7 colecciones con validación e índices únicos
pnpm db:setup --import ruta/a/Tradesqlite.sqlite   # además copia las filas desde SQLite
```

Las colecciones replican las tablas de `db/schema.ts`. La API abre una conexión por petición porque Workers no permite reutilizar sockets entre peticiones; cada petición tarda de 1 a 3 segundos. Para publicar, configura `MONGODB_URI` como secreto en el alojamiento y permite su IP en Atlas Network Access.

## Demostración del equipo (local y alojada)

Abre **Cuentas de presentación**. Cada rol tiene un inicio y un menú propios. El [guion de presentación](docs/demo-presentacion.md) contiene los tres usuarios y el recorrido completo del mismo pedido: aprobación, publicación, cotización, aceptación, evidencias, confirmación y reseña.

**pnpm demo:accounts** prepara las cuentas con respaldo privado de Atlas, conserva solicitudes y no reinicia la aprobación realizada. La cliente comienza sin pedidos; el proveedor tiene su perfil completo y pendiente de aprobación. Las pantallas de estas cuentas se concentran en el caso de Ana y Luis.

Con **MONGODB_FILES=true**, las imágenes se guardan en file_objects con límite de 5 MB y permisos de lectura. Las imágenes ilustrativas y los documentos ficticios para adjuntar se descargan desde Cuentas de presentación. Los cambios de interfaz aparecen en la web después del despliegue de CI/CD.

## Pruebas
`pnpm test` ejecuta validaciones unitarias y un recorrido integrado con MongoDB temporal, incluyendo la persistencia binaria de imágenes y el acceso directo a los tres roles de demo. Comprueba las 20 historias, rechazo de accesos indebidos, documentos privados, origen de peticiones y estados. Genera `docs/test-results.json`. Estas pruebas no equivalen a una ejecución de todos los formularios en un navegador real ni a una prueba de carga.

## CI/CD y publicación
`.github/workflows/ci.yml` instala dependencias, revisa tipos, ejecuta pruebas con MongoDB temporal y compila en pushes a `main` y pull requests. Después de validar `main`, publica el mismo artefacto en Cloudflare Workers y comprueba la página y la consulta a Atlas por HTTPS. Los pull requests solo validan.

La configuración y el paso de activación con el secreto `CLOUDFLARE_API_TOKEN` están en [docs/ci-cd.md](docs/ci-cd.md). Atlas conserva su conexión secreta en Cloudflare. Esta publicación no utiliza D1 ni R2; las imágenes se guardan en MongoDB. Nunca colocar tokens en YAML ni en el código.

## Límites conocidos
- POC académica privada. No es un producto listo para operar con usuarios reales.
- No hay recuperación de contraseña, verificación de correo, limitación de intentos o moderación; fuera de las 20 historias. Requiere endurecimiento antes de abrir al público.
- Identificación solo en formato imagen. Valida tamaño y firma del formato, sin análisis antivirus ni verificación documental externa.
- Evidencias de servicios completados se publican en el perfil del proveedor; documentos de identidad permanecen restringidos.
- Cotizaciones en MXN, sin cobros. Fechas se validan por día UTC; adaptar zona antes de uso real en límites de medianoche.
- No hay chat, cancelaciones, edición de perfil ni rechazo de proveedores, porque no forman parte de los criterios suministrados.
- Las métricas de ahorro de tiempo y confianza requieren investigación con usuarios; no se han medido ni se presentan como resultados.
