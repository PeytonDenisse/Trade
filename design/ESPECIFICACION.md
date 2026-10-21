# Trade — propuesta visual y mapa de navegación

**Estado:** propuesta para revisión visual. No implica cambios en la aplicación.

Las imágenes fijan composición, jerarquía y tono. Este documento fija los nombres de campos, acciones, estados y límites funcionales. El texto dentro de una imagen generada puede ser impreciso; antes de implementar, usar los datos de esta especificación y contrastarlos con la aplicación.

## Láminas seleccionadas

Cada lámina de pantalla muestra escritorio y móvil lado a lado. Las versiones anteriores corregidas se conservan en `mockups/alternativas/`.

| Nº | Lámina | Propósito |
| --- | --- | --- |
| 01 | [Sistema visual](mockups/01-sistema-visual.png) | Identidad, componentes y estados |
| 02 | [Inicio y catálogo](mockups/02-inicio-catalogo.png) | Portada aprobada como referencia |
| 03 | [Resultados por oficio](mockups/03-busqueda.png) | Filtro y perfiles |
| 04 | [Perfil profesional](mockups/04-perfil.png) | Experiencia, trabajos y reseñas |
| 05 | [Acceso](mockups/05-acceso.png) | Registro e inicio de sesión |
| 06 | [Crear solicitud](mockups/06-crear-solicitud-v2.png) | Publicación y foto posterior |
| 07 | [Mis solicitudes](mockups/07-mis-solicitudes.png) | Lista, detalle y cotizaciones |
| 08 | [Seguimiento](mockups/08-seguimiento.png) | Evidencias y confirmación |
| 09 | [Solicitud de proveedor](mockups/09-solicitud-proveedor.png) | Formulario y revisión pendiente |
| 10 | [Panel del proveedor](mockups/10-panel-proveedor-v2.png) | Oportunidades, cotización y trabajos |
| 11 | [Administración](mockups/11-administracion-v2.png) | Revisión y aprobación |
| 12 | [Reseña](mockups/12-resena.png) | Calificación posterior a confirmar |
| 13 | [Cómo funciona](mockups/13-como-funciona.png) | Guía del recorrido |
| 14 | [Recorrido de demo](mockups/14-recorrido-demo.png) | Tres roles y recursos ficticios |

La [referencia original aprobada](mockups/00-referencia-aprobada.png) se conserva junto a las láminas.

## Sistema visual

| Token | Valor | Uso |
| --- | --- | --- |
| Crema | `#FBF7F2` | Fondo principal |
| Blanco | `#FFFFFF` | Tarjetas y formularios |
| Carbón | `#1D1B19` | Texto principal |
| Texto secundario | `#6C625C` | Ayudas y metadatos |
| Terracota | `#D96647` | Acentos decorativos y superficies grandes |
| Terracota accesible | `#B94F34` | Botones y enlaces con texto blanco |
| Terracota hover | `#A8422B` | Botón principal al pasar el cursor |
| Arena | `#F4E9DE` | Fondos suaves |
| Borde | `#E8DED5` | Contornos y divisores |
| Éxito | `#2D6A4F` | Confirmaciones y estados positivos |
| Error | `#B5463A` | Errores de formulario |

La tipografía propuesta es **Manrope** para títulos y **DM Sans** para cuerpo. Jerarquía de referencia: H1 48/56, H2 32/40, H3 24/32, cuerpo 16/24 y texto pequeño 14/20 px. En móvil, H1 baja a aproximadamente 34/40. Escala de espaciado: 4, 8, 12, 16, 24, 32, 48 y 64 px. Tarjetas con radio aproximado de 16 px; controles entre 8 y 12 px; fotografías entre 12 y 16 px.

El terracota `#D96647` con blanco no alcanza contraste suficiente para texto normal. Usar `#B94F34` para botones con texto blanco; reservar el tono claro para decoración, iconos grandes o superficies sin texto pequeño. El foco de teclado debe tener contorno visible. Los estados no se comunican solo por color: cada etiqueta contiene texto.

### Componentes reutilizables

- Encabezado público y navegación compacta móvil; navegación adaptada al rol autenticado.
- Botón principal, secundario, enlace de texto y estados normal, hover, foco, cargando y deshabilitado.
- Campo de texto, contraseña, selección de oficio, fecha, área de texto y carga de imagen con ayuda y error próximos al campo.
- Tarjeta de oficio, tarjeta de profesional, ficha de solicitud, tarjeta de cotización y tarjeta de trabajo.
- Etiqueta de estado, estrellas, reseña, aviso de éxito/error y estado vacío.
- Comparador fotográfico «Antes / Después» como dos imágenes identificadas; sin deslizador obligatorio.
- Panel de documento privado visible solo para dueño y administración según permisos actuales.
- Pie de página sobrio. Sus enlaces deben llevar a destinos reales; los iconos sociales y enlaces decorativos de los mockups no autorizan nuevas funciones.

### Fotografía

Usar escenas naturales de plomería, electricidad, carpintería y otros oficios en hogares reales, con luz suave y trabajo visible. Los retratos deben parecer personas auténticas. No presentar fotografías de banco como trabajos completados reales de un proveedor. Para demo, marcar perfiles, trabajos y documentos como ficticios. El documento de identificación nunca aparece en el perfil público.

## Mapa de navegación

### Visitante y cliente

`Inicio / Explorar oficios → filtro por oficio → resultados → perfil profesional → iniciar sesión o crear cuenta → publicar solicitud → detalle en Mis solicitudes → añadir foto del problema → recibir cotizaciones → aceptar una → seguimiento del trabajo → revisar Antes/Después → confirmar Completado → estrellas y comentario → perfil con reseña publicada`

`Inicio → Cómo funciona → Explorar oficios`

Si un visitante intenta abrir «Mis solicitudes» o publicar, pasa por acceso y luego retoma el recorrido. En la propuesta visual, «Inicio» es la portada y «Explorar oficios» conduce al catálogo dentro de la misma experiencia; esto deberá decidirse como navegación final durante implementación, sin duplicar contenido.

### Proveedor

`Cuenta iniciada → Ofrecer mis servicios → formulario de solicitud → Pendiente → aprobación de administración → Oportunidades → detalle de solicitud Activa → enviar cotización → cliente acepta → Mis trabajos / Asignada → cargar Antes y Después → marcar Terminado`

Las oportunidades y «Mis trabajos» aparecen solo después de que la solicitud del proveedor esté **Aprobada**. Un proveedor puede consultar solicitudes activas de su oficio; no se filtran por zona, precio ni disponibilidad en la aplicación actual.

### Administración

`Cuenta de administración → Revisar proveedores → solicitud Pendiente → foto, datos y documento privado → Aprobar → Aprobada`

No hay acción de rechazo en el alcance actual.

### Demostración académica

`Recorrido de demo → Entrar como Cliente / Proveedor / Administración → vista inicial de ese rol`. La guía «Cómo funciona» y los cuatro recursos ficticios acompañan el recorrido. La demo pertenece a la instancia privada y debe mantenerse identificada como POC.

## Contenido y acciones por vista

| Vista | Datos visibles | Acción principal y estado |
| --- | --- | --- |
| Inicio / catálogo | Los siete oficios: Plomería, Electricidad, Carpintería, Cerrajería, Pintura, Albañilería y Mantenimiento; profesionales aprobados | Explorar oficio o abrir perfil. Vacío si no hay aprobados. |
| Resultados | **Solo filtro por oficio**; foto, nombre, oficio, zona, descripción breve y promedio de estrellas o «Sin reseñas» | Ver perfil. Vacío: no hay profesionales del oficio. |
| Perfil | Foto, nombre, oficio, zona, experiencia, descripción, evidencias de trabajos completados, reseñas | Publicar solicitud. Si no hay trabajos o reseñas, mostrar estado vacío. «Aprobado» significa aprobación interna, no certificación. |
| Acceso | Registro: nombre, correo, contraseña de al menos 10 caracteres. Inicio: correo y contraseña | Crear cuenta / Iniciar sesión. Error de credenciales o validación junto al campo. |
| Crear solicitud | Oficio, descripción hasta 2000 caracteres, fecha solicitada de hoy o futura | Publicar. Después de publicar y con estado Activa, añadir foto del problema opcional. |
| Mis solicitudes | Lista propia; oficio, descripción, fecha, estado, foto del problema si existe | Abrir detalle. Si está Activa, comparar cotizaciones recibidas y aceptar una. |
| Cotización | Nombre de proveedor, precio total en MXN y descripción de lo incluido | Cliente acepta una propuesta. Cotizaciones no elegidas quedan «No seleccionada». |
| Seguimiento | Estado, proveedor asignado y fotografías Antes/Después que sube el proveedor | Con estado Terminado, cliente confirma Completado. Si faltan fotos, indicar ausencia sin crear imágenes. |
| Reseña | Servicio Completado, estrellas de 1 a 5 y comentario hasta 1000 caracteres | Guardar estrellas y comentario. La aplicación actual los permite como entradas separadas; la interfaz puede agruparlos visualmente sin fusionar su lógica. |
| Solicitud de proveedor | Oficio, experiencia hasta 500 caracteres, zona hasta 200, descripción hasta 2000, foto de perfil y documento de identificación | Enviar. Estado Pendiente o Aprobada. Documento privado. |
| Oportunidades | Solicitudes Activas del oficio aprobado, descripción, fecha y foto del problema si existe | Cotizar con precio total MXN y texto «Qué incluye» hasta 2000 caracteres. |
| Mis trabajos | Solicitudes asignadas al proveedor, estado, datos del trabajo, espacios de imagen Antes y Después | Subir imágenes mientras esté Asignada y marcar Terminado. |
| Administración | Solicitudes de proveedor Pendientes, datos declarados, foto y documento privado | Aprobar proveedor. Vacío si no hay pendientes. |
| Cómo funciona | Cinco pasos del recorrido real | Explorar oficios. |
| Recorrido de demo | Cliente, Proveedor, Administración y cuatro recursos ficticios | Entrar en el rol elegido; descargar imágenes ficticias. |

Los formatos admitidos para imágenes son PNG, JPG y WebP, hasta 5 MB por archivo. El documento de identificación de la demo es una **imagen ficticia**, no PDF. Los precios son cotizaciones en MXN; Trade no cobra ni procesa pagos.

## Estados y adaptación

Las solicitudes avanzan `Activa → Asignada → Terminado → Completado`. Una cotización empieza `Pendiente` y termina `Aceptada` o `No seleccionada`. La solicitud de proveedor es `Pendiente → Aprobada`. Usar siempre esos nombres en interfaz y ayudas. «Terminada» en una lámina generada debe corregirse a **Terminado** al implementarse.

Cada vista contempla estado normal, cargando, vacío, error y éxito cuando aplique. Reservar espacio para avisos sin desplazar bruscamente formularios. En móvil, una columna, márgenes de 16 px, controles de al menos 44 px de alto, campos con etiquetas persistentes, tarjetas apiladas y acciones principales visibles al final de cada bloque. No ocultar precio, descripción de cotización ni estado en tarjetas móviles.

## Ajustes obligatorios antes de implementar

Las imágenes generativas pueden mostrar fechas de 2024, contadores de caracteres distintos, opciones de pie de página, botones «Ver todos», iconos de búsqueda o campos no presentes. Son detalles visuales ilustrativos. La implementación debe seguir esta especificación y el comportamiento real del proyecto. En particular:

- Fechas de nuevas solicitudes: hoy o futuras; los ejemplos de 2024 en láminas antiguas no son valores válidos para un formulario actual.
- Descripción de solicitud: 2000 caracteres; comentario de reseña: 1000. Cualquier contador de 500 en esas dos vistas es incorrecto.
- No incluir ubicación en la **solicitud de servicio**: solo hay zona declarada en el perfil del proveedor.
- No añadir filtros por ubicación, precio o disponibilidad, ni pagos, chat, cancelación, recuperación de contraseña, rechazo administrativo o certificación de identidad.
- No poner la carga de foto del problema dentro del formulario inicial; se adjunta después de publicar.
- No mostrar «Iniciar sesión» como acción principal en una vista autenticada.
- El acceso privado al documento de identificación es distinto de la información pública del perfil.

Esta propuesta mantiene las funciones existentes y deja la implementación de interfaz para una etapa posterior, una vez revisadas las láminas.
