# Ubicación opcional del servicio

En Nueva solicitud, pulsa **Agregar un mapa**. Puedes marcar el lugar con un clic, usar tu ubicación actual con permiso del navegador o ingresar coordenadas manualmente. Después puedes añadir una dirección o referencia. Revisa el punto antes de publicar: tu ubicación actual puede ser diferente del lugar del trabajo.

El mapa no es obligatorio. Las solicitudes anteriores conservan su información y no necesitan ubicación para seguir funcionando. Las cuentas existentes no cambian y no se pide permiso de ubicación automáticamente.

El cliente ve el punto en el detalle de su solicitud. Antes de aceptar una cotización, los profesionales solo ven que hay una ubicación registrada. Al aceptar, el proveedor asignado puede ver el punto, la referencia y **Cómo llegar en Google Maps**. La ubicación no aparece en los perfiles públicos ni en la lista de oportunidades.

El mapa interactivo usa Leaflet y OpenStreetMap, con atribución visible. Requiere internet para cargar el fondo. Si los mapas fallan, quedan las coordenadas y el enlace de indicaciones. No se realiza búsqueda automática de direcciones ni seguimiento del proveedor.

Para otra base de datos, ejecuta **pnpm db:maps** con Node 24 y su archivo .env. Este comando respalda el validador de requests y agrega únicamente location como campo opcional. Conserva los campos y reglas anteriores, sin reescribir usuarios ni solicitudes. La validación inicial en db/collections.ts también incluye este campo opcional para instalaciones nuevas.

No es necesario ejecutar la preparación de cuentas de demo ni reiniciar los datos. El código debe publicarse mediante el flujo habitual de commit, push y CI/CD para aparecer en el sitio web.
