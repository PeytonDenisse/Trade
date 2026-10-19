# Informe de cumplimiento de Trade

## Resultado de esta entrega

Implementación de HU-01 a HU-20 disponible. Dos pruebas automatizadas ejecutadas con éxito: validaciones unitarias y recorrido integrado con 22 puntos de comprobación registrados en test-results.json. Se verificó el formulario obligatorio y la pantalla principal en escritorio y en un marco de 390 px. No se ejecutó el recorrido completo de los 20 formularios en un navegador autenticado. Por ello el estado de aceptación es parcial y las historias se mantienen en Test / En revisión.

| Historia | Jira | Funcionalidad | Implementación y lógica | Aceptación integral |
|---|---|---|---|---|
| HU-01 | KAN-11 | crear una cuenta en Trade mediante nombre, correo electrónico y contraseña | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-02 | KAN-12 | iniciar sesión en Trade mediante mi correo electrónico y contraseña | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-03 | KAN-13 | enviar una solicitud para convertirme en proveedor indicando oficio, experiencia, zona de trabajo y documentos de identificación | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-04 | KAN-14 | aprobar una solicitud de proveedor pendiente | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-05 | KAN-15 | buscar proveedores seleccionando un oficio | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-06 | KAN-16 | consultar el perfil de un proveedor seleccionado | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-07 | KAN-17 | consultar los trabajos publicados en el perfil de un proveedor | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-08 | KAN-18 | crear una solicitud indicando oficio requerido, descripción del problema y fecha solicitada | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-09 | KAN-19 | adjuntar fotografías del problema a una solicitud de servicio | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-10 | KAN-20 | consultar solicitudes activas correspondientes a mi oficio registrado | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-11 | KAN-21 | enviar una cotización indicando el precio total y la descripción de lo incluido | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-12 | KAN-22 | consultar las cotizaciones recibidas en una solicitud específica | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-13 | KAN-23 | aceptar una cotización específica de mi solicitud | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-14 | KAN-24 | registrar una fotografía del estado inicial del servicio | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-15 | KAN-25 | registrar una fotografía del estado final del servicio | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-16 | KAN-26 | consultar las fotografías inicial y final de un mismo servicio en una vista comparativa | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-17 | KAN-27 | marcar el servicio asignado como terminado | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-18 | KAN-28 | confirmar un servicio marcado como terminado | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-19 | KAN-29 | registrar una calificación de una a cinco estrellas para un servicio completado | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |
| HU-20 | KAN-30 | registrar un comentario sobre un servicio completado | Implementada; comprobación automatizada aprobada | Parcial: falta recorrido UI completo |

## Entregables y límites

- Código, esquema/migraciones, API e interfaz: implementados.
- Pruebas de lógica e integración: ejecutadas y aprobadas; resultados reproducibles.
- Vista de escritorio y móvil: revisión visual de inicio; formulario vacío bloqueado.
- Demo: preparada para tres roles ficticios, protegida por acceso privado. Estado de despliegue se confirma en la entrega y Jira.
- GitHub Actions: archivo preparado, ejecución remota pendiente. No se recibió repositorio GitHub.
- CD de GitHub: pendiente de repositorio y proveedor del equipo. Publicación Sites realizada mediante su proceso de versiones.
- Jira: historias existentes conservadas; evidencias y estado En revisión. Nombres literales To Do/In Progress/Test/POC pendientes de configuración administrativa si el docente los exige.
- Presentación y guion: preparados sin tecnicismos en el discurso principal.
- Responsables: pendientes de identificar; no se asignaron personas por suposición.
- Indicadores del problema: pendientes de investigación con usuarios reales.

## Criterio para pasar a POC

Ejecutar el guion completo con la interfaz publicada, revisar cada criterio original, registrar resultado y evidencia visual. Solo después mover cada historia aceptada de En revisión a Finalizada (correspondencia propuesta con POC). No usar el éxito de la compilación como prueba de aceptación funcional.