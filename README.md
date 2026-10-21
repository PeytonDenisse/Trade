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

Para crear un administrador local, registra una cuenta ficticia y cambia su `role` a `admin` en la colección `users` (por ejemplo desde Atlas Data Explorer). No existe autoasignación de administración en el registro normal. En la instancia privada alojada, `Recorrido de demo` ofrece tres identidades ficticias y permite realizar la aprobación sin configurar contraseñas de demostración.

## MongoDB Atlas
Copia `.env.example` a `.env` y completa `MONGODB_URI` con tu usuario y contraseña. `.env` no se versiona.

```sh
pnpm db:ping                                   # comprueba la conexión
pnpm db:setup                                  # crea las 7 colecciones con validación e índices únicos
pnpm db:setup --import ruta/a/Tradesqlite.sqlite   # además copia las filas desde SQLite
```

Las colecciones replican las tablas de `db/schema.ts`. La API abre una conexión por petición porque Workers no permite reutilizar sockets entre peticiones; cada petición tarda de 1 a 3 segundos. Para publicar, configura `MONGODB_URI` como secreto en el alojamiento y permite su IP en Atlas Network Access.

## Demostración alojada
Mantener acceso solo para el propietario. Configurar `DEMO_ENABLED=true` con las variables del alojamiento y publicar para aplicarlo. El acceso a roles demo exige identidad autenticada por ChatGPT. Al cambiar la audiencia, desactivar antes la demo y definir administradores explícitos. Los visitantes no tienen acceso anónimo a esta instancia.

1. Abre Recorrido de demo. Descarga las cuatro imágenes ficticias.
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
`pnpm test` ejecuta validaciones unitarias y un recorrido integrado con SQLite real en memoria y un adaptador de archivos. Comprueba las 20 historias, rechazo de accesos indebidos, documentos privados, origen de peticiones y estados. Genera `docs/test-results.json`. Estas pruebas no equivalen a una ejecución de todos los formularios en un navegador real ni a una prueba de carga.

## CI/CD y publicación
`.github/workflows/ci.yml` instala dependencias, revisa tipos, ejecuta pruebas y construye en pushes a main y pull requests. Está activo en el repositorio privado https://github.com/PeytonDenisse/Trade. La primera ejecución https://github.com/PeytonDenisse/Trade/actions/runs/39340715394 completó correctamente tipos, pruebas y compilación.

La entrega actual usa el repositorio del alojamiento Sites: validación local, sincronización del código, construcción, aplicación de migraciones y publicación de una versión. Esto permite un deploy reproducible dentro del entorno, pero no constituye un pipeline de CD de GitHub activado. El código ya está en GitHub. Falta conectar una estrategia de despliegue compatible y configurar sus credenciales mediante el proveedor elegido. No colocar tokens en YAML ni en el código.

## Límites conocidos
- POC académica privada. No es un producto listo para operar con usuarios reales.
- No hay recuperación de contraseña, verificación de correo, limitación de intentos o moderación; fuera de las 20 historias. Requiere endurecimiento antes de abrir al público.
- Identificación solo en formato imagen. Valida tamaño y firma del formato, sin análisis antivirus ni verificación documental externa.
- Evidencias de servicios completados se publican en el perfil del proveedor; documentos de identidad permanecen restringidos.
- Cotizaciones en MXN, sin cobros. Fechas se validan por día UTC; adaptar zona antes de uso real en límites de medianoche.
- No hay chat, cancelaciones, edición de perfil ni rechazo de proveedores, porque no forman parte de los criterios suministrados.
- Las métricas de ahorro de tiempo y confianza requieren investigación con usuarios; no se han medido ni se presentan como resultados.
