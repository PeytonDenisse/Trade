# Trade — POC académica

Aplicación para solicitar servicios de oficios y seguir su contratación hasta la evaluación.

## Alcance
20 historias HU-01 a HU-20 de Requerimientos (1).docx. Jira existente: KAN-11 a KAN-30. Siete épicas KAN-4 a KAN-10. Una historia por funcionalidad. No procesa pagos ni certifica identidades reales.

## Arquitectura
React + TypeScript con Vinext. API en `lib/api.ts`, validaciones en `lib/rules.ts`, interfaz en `app/page.tsx`. Base MongoDB Atlas (colecciones en `db/collections.ts`, conexión por petición en `db/mongo.ts`), archivos R2. El esquema SQL original queda como referencia en `db/schema.ts` y `drizzle/`. Aplicación monolítica sin microservicios. Cada petición comprueba sesión, propietario y rol. Las contraseñas usan PBKDF2-SHA256 con sal aleatoria, las sesiones son HttpOnly/SameSite y caducan en 24 horas. Sites conserva su acceso privado mediante ChatGPT, separado del registro académico de Trade.

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

Los colaboradores pueden usar **Recorrido de demo** para cambiar entre cliente, proveedor y administración. Configura `DEMO_ENABLED=true` y un `DEMO_ACCESS_CODE` privado en `.env`; compártelo con el equipo por un canal privado. Introduce ese código en el recorrido antes de elegir un rol. El registro normal conserva su rol de cliente. Las cuentas y los datos de demo son compartidos, por lo que conviene coordinar las pruebas.

## MongoDB Atlas
Copia `.env.example` a `.env` y completa `MONGODB_URI` con tu usuario y contraseña. `.env` no se versiona.

```sh
pnpm db:ping                                   # comprueba la conexión
pnpm db:setup                                  # crea las 7 colecciones con validación e índices únicos
pnpm db:setup --import ruta/a/Tradesqlite.sqlite   # además copia las filas desde SQLite
```

Las colecciones replican las tablas de `db/schema.ts`. La API abre una conexión por petición porque Workers no permite reutilizar sockets entre peticiones; cada petición tarda de 1 a 3 segundos. Para publicar, configura `MONGODB_URI` como secreto en el alojamiento y permite su IP en Atlas Network Access.

## Demostración del equipo (local y alojada)
El pipeline genera un código aleatorio por despliegue y lo configura como secreto `DEMO_ACCESS_CODE` del Worker. Todo colaborador con acceso al repositorio privado puede ir a **Actions → última ejecución exitosa de Trade - CI/CD → Artifacts → team-demo-access**, descargar el archivo e introducir el código en **Recorrido de demo** del sitio. El archivo caduca a los 7 días; vuelve a ejecutar el pipeline para renovar el acceso. El código anterior deja de servir cuando se publica uno nuevo (las sesiones ya iniciadas duran hasta 24 horas). Nunca se imprime el código en los logs ni se versiona. GitHub y Trade no comparten sesión: el acceso del equipo se acredita mediante ese código. Las cuentas y los datos de demo son compartidos. El pipeline habilita `DEMO_ENABLED=true`; sin el código correcto, una cuenta normal o una cabecera de identidad no conceden roles demo. Para cerrar la demo, configura `DEMO_ENABLED=false` y vuelve a publicar.

Sin R2, `MONGODB_FILES=true` guarda archivos en `file_objects`. Conserva el límite de 5 MB y los permisos de lectura. Permite completar aprobación de proveedor y evidencias. Las fotos locales de R2 no se migran automáticamente al sitio alojado.

1. Abre Recorrido de demo, introduce el código del equipo y descarga las cuatro imágenes ficticias.
2. Entra como proveedor, completa oficio Plomería, experiencia, zona y descripción. Adjunta perfil e identificación ficticia.
3. Cambia a administración y aprueba la solicitud.
4. Cambia a cliente y busca Plomería. Consulta el perfil. Crea una solicitud y adjunta una imagen del problema.
5. Cambia a proveedor, abre Oportunidades y cotiza.
6. Cambia a cliente, abre Mis solicitudes y acepta la cotización.
7. Como proveedor, abre Mis trabajos, carga Antes y Después y marca Terminado.
8. Como cliente, revisa la comparación, confirma Completado, guarda estrellas y comentario.
9. Consulta el perfil del proveedor: el trabajo completado y la reseña aparecen allí.
10. Registro/contraseña se demuestra aparte, cerrando sesión y creando una cuenta normal.

Las ilustraciones de ejemplo están etiquetadas como ficticias. Para evaluar carga de fotografías, también se aceptan PNG, JPG y WebP de hasta 5 MB. No uses documentos personales reales.

## Pruebas
`pnpm test` ejecuta validaciones unitarias y un recorrido integrado con MongoDB temporal, incluyendo la persistencia binaria de imágenes y el acceso de demo por código. Comprueba las 20 historias, rechazo de accesos indebidos, documentos privados, origen de peticiones y estados. Genera `docs/test-results.json`. Estas pruebas no equivalen a una ejecución de todos los formularios en un navegador real ni a una prueba de carga.

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
