# Evidencia visual: solicitudes, cotizaciones, seguimiento y reseña

Capturas de los componentes implementados en Edge a 1440 px y 390 px. Se usó una vista temporal con **datos ficticios** y las imágenes de demostración de `public/demo-assets`; la vista temporal se retiró del código antes del commit.

| Estado | Desktop | Móvil |
| --- | --- | --- |
| Mis solicitudes | `solicitudes-desktop.png` | `solicitudes-mobile.png` |
| Activa y cotizaciones | `cotizaciones-desktop.png` | `cotizaciones-mobile.png` |
| Terminado, Antes/Después y confirmación | `seguimiento-desktop.png` | `seguimiento-mobile.png` |
| Completado y reseña | `resena-desktop.png` | `resena-mobile.png` |

En la vista temporal se accionaron la aceptación, la confirmación, las cuatro estrellas y el guardado del comentario en desktop y móvil. Ambos recorridos mostraron los estados y avisos esperados. El documento midió 1440/1440 px en la lista desktop, 1425/1425 px con barra de desplazamiento en el detalle desktop y 390/390 px en todas las vistas móviles: sin desplazamiento horizontal.

La suite `pnpm test` pasó la validación unitaria, pero la prueba integrada no pudo iniciarse porque la descarga de MongoDB Memory Server fue denegada por el entorno (`EACCES` a `fastdl.mongodb.org`). Las capturas y la interacción de la vista temporal verifican la interfaz; no sustituyen la prueba integrada de API.
