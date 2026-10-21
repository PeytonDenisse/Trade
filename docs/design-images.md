# Imágenes públicas y diseño

La interfaz sigue la composición de `design/mockups/02-inicio-catalogo.png`, las tarjetas de resultados y perfil, y la paleta de `design/ESPECIFICACION.md`. La navegación superior se adapta a móvil y al rol; las acciones siguen utilizando las funciones existentes.

Los enlaces de fotografías están centralizados en `lib/design-images.ts`. Se usan URLs HTTPS de `images.unsplash.com` con tamaño y calidad limitados para la portada, los oficios y las referencias visuales de los perfiles. No requieren R2 ni claves de API. Dependen de la conexión y disponibilidad del proveedor externo.

Si `photo` de un perfil ya contiene una URL HTTPS pública, se usa directamente. Si contiene un identificador antiguo del bucket, se muestra una fotografía ilustrativa de su oficio, identificada como tal; no se presenta como fotografía de la persona. Este cambio no modifica los registros de Atlas.

`RemoteImage` muestra `public/image-placeholder.svg` cuando una imagen no está disponible. Los documentos privados y las evidencias reales no se sustituyen por fotos de banco. Los formularios de adjuntos y sus permisos no cambian; el almacenamiento sigue siendo necesario para activar la carga de archivos.

Las imágenes de Unsplash se usan como referencias visuales. El pie de página identifica su origen. Para cambiar una fotografía, actualiza su URL en `lib/design-images.ts`.
