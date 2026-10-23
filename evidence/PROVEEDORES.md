# Diseño del flujo de proveedores

Revisión visual de los componentes de proveedor con datos de ejemplo. Las capturas se tomaron a 1440 px y 390 px; el ancho del documento coincidió con el ancho útil de cada ventana, sin desplazamiento horizontal. La ruta temporal usada para las capturas se eliminó y no forma parte de la aplicación.

| Vista | Desktop | Móvil |
| --- | --- | --- |
| Solicitud de proveedor | [Imagen](proveedor-application-desktop.png) | [Imagen](proveedor-application-mobile.png) |
| Solicitud Pendiente | [Imagen](proveedor-pending-desktop.png) | [Imagen](proveedor-pending-mobile.png) |
| Solicitud Aprobada | [Imagen](proveedor-approved-desktop.png) | [Imagen](proveedor-approved-mobile.png) |
| Oportunidades | [Imagen](proveedor-available-desktop.png) | [Imagen](proveedor-available-mobile.png) |
| Trabajo asignado | [Imagen](proveedor-assigned-ready-desktop.png) | [Imagen](proveedor-assigned-ready-mobile.png) |

En la revisión visual se comprobaron la validación de los seis datos requeridos de la solicitud, el estado de cotización enviada y la acción de marcar un trabajo como Terminado. Los datos, fotografías del problema y evidencias de las capturas del panel son demostrativos.

La foto de perfil y el documento conservan los formatos PNG, JPG y WebP y el límite de 5 MB del flujo existente. La interfaz indica que el documento es privado. Oportunidades muestra solo solicitudes Activas del oficio del proveedor aprobado. La solicitud de servicio no muestra ubicación ni dirección.

`pnpm typecheck` y ESLint del componente pasaron. `pnpm test` inició, pero la prueba integrada no pudo ejecutarse: `mongodb-memory-server` necesitaba descargar MongoDB desde `fastdl.mongodb.org` y el entorno denegó la conexión (`EACCES`). La prueba independiente pasó.
