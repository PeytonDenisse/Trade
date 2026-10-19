# Trade — POC académica

Aplicación para solicitar servicios de oficios y seguir su contratación hasta la evaluación.

## Alcance
20 historias HU-01 a HU-20 de Requerimientos (1).docx. Jira existente: KAN-11 a KAN-30. Siete épicas KAN-4 a KAN-10. Una historia por funcionalidad. No procesa pagos ni certifica identidades reales.

## Arquitectura
React + TypeScript con Vinext. API en `lib/api.ts`, validaciones en `lib/rules.ts`, interfaz en `app/page.tsx`. Base relacional D1 (SQLite), archivos R2, migración versionada en `drizzle/`. Aplicación monolítica sin microservicios. Cada petición comprueba sesión, propietario y rol. Las contraseñas usan PBKDF2-SHA256 con sal aleatoria, las sesiones son HttpOnly/SameSite y caducan en 24 horas. Sites conserva su acceso privado mediante ChatGPT, separado del registro académico de Trade.

## Ejecución local (Windows, macOS, Linux)
Requisitos: Node 24 y pnpm 10. Desde la carpeta:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_overjoyed_mongu.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_glossy_obadiah_stane.sql
pnpm dev
```

Usa la dirección impresa por el servidor. Ejecuta la migración solo una vez en cada base nueva. La base local persiste en `.wrangler/state`, separada de la alojada. Los archivos privados locales y credenciales no se versionan.

Para crear un administrador local, registra una cuenta ficticia y utiliza la consola de la base local con una actualización de su rol. No existe autoasignación de administración en el registro normal. En la instancia privada alojada, `Recorrido de demo` ofrece tres identidades ficticias y permite realizar la aprobación sin configurar contraseñas de demostración.

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
`.github/workflows/ci.yml` instala dependencias, revisa tipos, ejecuta pruebas y construye en pushes a main y pull requests. Está preparado para GitHub, pero no ejecutado en GitHub porque no se proporcionó un repositorio de ese servicio. No se atribuyen ejecuciones inexistentes.

La entrega actual usa el repositorio del alojamiento Sites: validación local, sincronización del código, construcción, aplicación de migraciones y publicación de una versión. Esto permite un deploy reproducible dentro del entorno, pero no constituye un pipeline de CD de GitHub activado. Para conectar GitHub, importar el código en el repositorio del equipo y configurar una estrategia de despliegue y secretos del proveedor elegido. No colocar tokens en YAML ni en el código.

## Límites conocidos
- POC académica privada. No es un producto listo para operar con usuarios reales.
- No hay recuperación de contraseña, verificación de correo, limitación de intentos o moderación; fuera de las 20 historias. Requiere endurecimiento antes de abrir al público.
- Identificación solo en formato imagen. Valida tamaño y firma del formato, sin análisis antivirus ni verificación documental externa.
- Evidencias de servicios completados se publican en el perfil del proveedor; documentos de identidad permanecen restringidos.
- Cotizaciones en MXN, sin cobros. Fechas se validan por día UTC; adaptar zona antes de uso real en límites de medianoche.
- No hay chat, cancelaciones, edición de perfil ni rechazo de proveedores, porque no forman parte de los criterios suministrados.
- Las métricas de ahorro de tiempo y confianza requieren investigación con usuarios; no se han medido ni se presentan como resultados.
