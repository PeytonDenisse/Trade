# Prompts de las láminas de Trade

Se generaron con la herramienta integrada de imágenes. Para reproducir o iterar, adjuntar `mockups/00-referencia-aprobada.png` como **referencia visual**, no como imagen a editar. Generar **una imagen independiente por cada lámina**. El archivo `ESPECIFICACION.md` es la fuente de verdad para campos, estados y límites funcionales.

## Base común para las vistas

> Mockup web de alta fidelidad para Trade, plataforma española de oficios del hogar. Muestra desktop a la izquierda y móvil usable a la derecha, sobre fondo gris neutro. Sigue la portada aprobada: fondo crema `#FBF7F2`, títulos carbón `#1D1B19`, acentos terracota `#D96647`, tarjetas redondeadas, composición editorial, mucho espacio en blanco, fotografía natural de profesionales trabajando en hogares. Texto principal legible, navegación correspondiente al rol, controles reales y estados visibles. Sin viajes, 3D, pagos, chat, reservas directas, certificación de identidad ni marcas de agua. Usa los campos y acciones descritos en `ESPECIFICACION.md`.

## Prompts particulares

**01 — Sistema visual.** Lámina independiente con paleta HEX, Manrope para títulos, DM Sans para cuerpo, jerarquía H1/H2/H3, escala 4–64 px, botones primario/secundario, campos, select, textarea, carga de imagen, tarjetas, etiquetas de estado, navegación desktop/móvil, avisos de éxito/error, iconos y guía de fotografía. Mostrar normal, hover, foco de teclado y deshabilitado. Para botones de texto blanco especificar terracota oscuro `#B94F34`.

**02 — Inicio y catálogo.** Portada editorial aprobada: barra Trade, Explorar oficios, Cómo funciona, Mis solicitudes y acceso. Hero «Encuentra a la persona indicada para tu próximo proyecto» con collage de plomería, electricidad y carpintería. Oficios populares, profesionales destacados, tres pasos de funcionamiento, CTA final y pie de página sencillo.

**03 — Resultados.** Encabezado «Encuentra profesionales para tu hogar». Único filtro funcional: oficio. Selección Plomería y tarjetas con retrato, nombre, oficio, zona del proveedor, reseñas o «Sin reseñas», resumen y «Ver perfil». Estado alterno sin profesionales. Móvil con filtro ancho y tarjetas apiladas.

**04 — Perfil.** Retrato, nombre, oficio, zona, experiencia, descripción, calificación, CTA «Publicar solicitud», galería de trabajos completados con fotos Antes/Después y reseñas. Estado alterno sin trabajos. «Perfil aprobado» se refiere solo a revisión interna.

**05 — Acceso.** Registro con nombre, correo y contraseña mínima de 10 caracteres; inicio con correo y contraseña. Validaciones y error de credenciales. Móvil con formularios apilados y enlace entre acceso y registro. Sin recuperación ni acceso social.

**06 — Crear solicitud.** Formulario inicial solo con oficio, descripción (máximo 2000) y fecha de hoy o futura. Acción «Publicar solicitud». Mostrar como segundo paso separado el estado «Solicitud publicada · Activa» y la carga opcional de foto del problema PNG/JPG/WebP de hasta 5 MB. Nunca colocar esa carga en el formulario inicial.

**07 — Mis solicitudes.** Lista con Activa, Asignada, Terminado y Completado. Detalle de una solicitud Activa con descripción, fecha y foto opcional; cotizaciones con proveedor, precio total MXN, descripción de lo incluido y «Aceptar cotización». Estado alterno sin cotizaciones.

**08 — Seguimiento.** Solicitud en Terminado; progreso Activa → Asignada → Terminado → Completado. Fotos de Antes y Después subidas por el proveedor y acción del cliente «Confirmar trabajo completado». Estado alterno sin evidencias. La reseña es una vista posterior.

**09 — Solicitud de proveedor.** Formulario de oficio, experiencia 500, zona 200, descripción 2000, foto de perfil e imagen ficticia de identificación. Nota de privacidad y límites PNG/JPG/WebP de 5 MB. «Enviar solicitud» y estado «Pendiente de revisión».

**10 — Panel de proveedor.** Solo navegación Oportunidades y Mis trabajos. Oportunidad del oficio aprobado con descripción, fecha y foto opcional; cotización con precio total MXN y «Qué incluye»; trabajo Asignado con carga Antes/Después y «Marcar como terminado». Sin ubicación o dirección en la solicitud.

**11 — Administración.** Solo «Revisar proveedores»: lista Pendiente, detalle de nombre, oficio, experiencia, zona, descripción, foto y documento privado ficticio; acción única «Aprobar proveedor». Estado alterno sin pendientes. Sin rechazo ni otras herramientas administrativas.

**12 — Reseña.** Servicio Completado, resumen fotográfico Antes/Después, estrellas de 1 a 5, comentario de hasta 1000 caracteres, «Guardar reseña» y éxito. Indicar que la confirmación ocurrió antes.

**13 — Cómo funciona.** Recorrido en cinco pasos: Busca con confianza; Cuéntanos el problema; Elige una propuesta; Acompaña el trabajo; Confirma y comparte. CTA «Explorar oficios». Adaptación móvil en tarjetas verticales.

**14 — Recorrido de demo.** POC privada y datos ficticios. Tres tarjetas Cliente, Proveedor y Administración, cada una con «Entrar» y resumen de sus acciones reales. Recursos descargables: foto de perfil, identificación ficticia en imagen, Antes y Después. Aviso «No cargues documentos personales reales».

## Revisión de las imágenes

Verificar cada texto generado antes de usarlo como requisito. Las imágenes sirven para aprobar composición y tratamiento visual; los contadores, fechas, enlaces de pie de página y microtextos deben cotejarse con `ESPECIFICACION.md`.
