# Presentación de Trade: un servicio, tres roles

Abre **Cuentas de presentación**. Cada tarjeta permite entrar con correo y contraseña mediante el inicio de sesión normal. Cierra sesión antes de cambiar de cuenta: las pestañas de un mismo navegador comparten la sesión.

## Cuentas ficticias preparadas

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Cliente: Ana | cliente.presentacion@trade.example | DemoCliente2026! |
| Proveedor: Luis | proveedor.presentacion@trade.example | DemoProveedor2026! |
| Administrador | admin.presentacion@trade.example | DemoAdmin2026! |

Ana empieza sin solicitudes. Luis tiene foto ilustrativa, identificación ficticia e información profesional, y empieza **Pendiente**. La aprobación se hace en vivo. El administrador de presentación ve el perfil pendiente de Luis; la vista para cotizar de Luis muestra los pedidos de Ana, para seguir el mismo caso sin mezclar los ejemplos anteriores. Las otras cuentas conservan sus datos y vistas habituales.

## Qué significa cada pantalla

| Cuenta | Pantalla | Para qué sirve |
| --- | --- | --- |
| Cliente | Mi inicio | Explica los pasos y permite entrar a cada sección. |
| Cliente | Explorar profesionales | Catálogo de perfiles, trabajos realizados y reseñas. Consultar un perfil todavía no contrata a nadie. |
| Cliente | Nueva solicitud | Publicar una necesidad, un oficio y una fecha. La foto se adjunta después de publicar. |
| Cliente | Mis solicitudes y cotizaciones | Sus pedidos. Al abrir uno ve las propuestas, acepta una y después confirma y evalúa. |
| Proveedor | Mi perfil | Información enviada y estado de aprobación. |
| Proveedor | Solicitudes para cotizar | Pedidos activos de su oficio. Dentro de cada pedido envía precio y alcance. |
| Proveedor | Mis trabajos | Servicios en los que el cliente aceptó su propuesta. Aquí carga evidencias y marca Terminado. |
| Administrador | Proveedores pendientes | Revisa información e identificación y aprueba al proveedor. |

**Las cotizaciones están dentro del detalle de cada solicitud.** Enviar una cotización no asigna el trabajo; el cliente debe aceptarla.

## Guion de 7–10 minutos

Descarga primero **Problema / Antes** y **Después** desde Cuentas de presentación. Son PNG ficticios para mostrar la carga de archivos.

1. **Administrador → Proveedores pendientes.** Revisa a Luis, muestra la foto y el documento privado. Pulsa **Aprobar proveedor**. Di: «El administrador valida al profesional; la contratación la decide el cliente». Cierra sesión.
2. **Cliente (Ana) → Explorar profesionales.** Busca Plomería y el perfil de Luis Ramírez · Presentación. Muestra su información. Después ve a **Nueva solicitud** y publica: oficio **Plomería**, descripción **Fuga en el lavabo. Se necesita revisar el sifón y cambiar la conexión dañada**, fecha de hoy o futura. Adjunta el PNG Problema / Antes. El pedido queda **Activa**. Cierra sesión.
3. **Proveedor (Luis) → Solicitudes para cotizar.** Abre el pedido de Ana. Escribe precio **950** y alcance **Diagnóstico, cambio de conexión, materiales y prueba de fugas**. Pulsa **Enviar cotización**. Di: «La propuesta ya fue enviada, pero todavía no tengo el trabajo asignado». Cierra sesión.
4. **Cliente → Mis solicitudes y cotizaciones.** Abre **Fuga en el lavabo**, consulta la propuesta de Luis y pulsa **Aceptar propuesta**. El pedido cambia a **Asignada**. Cierra sesión.
5. **Proveedor → Mis trabajos.** Abre el mismo pedido. Adjunta el PNG Antes en **Antes** y el PNG Después en **Después**. Pulsa **Marcar como terminado**. El estado cambia a **Terminado**. Cierra sesión.
6. **Cliente → Mis solicitudes y cotizaciones.** Abre el pedido, revisa las evidencias y pulsa **Confirmar servicio completado**. Cambia a **Completado**. Guarda **5 estrellas** y el comentario **Se reparó la fuga y se comprobó el resultado** mediante sus dos botones.
7. **Cliente → Explorar profesionales → perfil de Luis.** Muestra el trabajo completado y la reseña. Di: «La evidencia y la evaluación quedan vinculadas al profesional para futuras consultas».

Estados del mismo servicio: **Activa → Asignada → Terminado → Completado**. Terminado lo marca Luis; Completado lo confirma Ana.

## Ensayos y publicación

Los cambios persisten en Atlas. Si Luis ya está aprobado al ensayar, muestra su estado y empieza en el paso 2. Para otro ensayo, Ana puede crear otra solicitud con una descripción diferente; los servicios anteriores conservan su historial.

El comando **pnpm demo:accounts** prepara estas tres cuentas con respaldo privado en .sites-runtime/backups/. Mantiene la aprobación ya realizada y los pedidos existentes; no reinicia el servicio. **pnpm demo:prepare** prepara ejemplos antiguos del catálogo y no es necesario para este recorrido.

La app local y la publicada comparten Atlas cuando usan la misma conexión. Las cuentas y datos ya están preparados; la nueva navegación requiere tu commit, push y el despliegue exitoso de CI/CD para aparecer en la web. No se ha hecho commit ni push.
