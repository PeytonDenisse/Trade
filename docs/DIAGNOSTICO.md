# Diagnóstico y alcance de Trade

Consulta realizada el 19 de octubre de 2026. Fuentes: reingenieria.pdf (5 páginas), Requerimientos (1).docx (20 historias), Texto pegado.txt y tablero KAN/1.

## Estado inicial
- 7 épicas: KAN-4 a KAN-10, todas Por hacer.
- 20 historias: KAN-11 a KAN-30. HU-01 a HU-05 estaban En curso. Las otras 15 estaban Por hacer.
- Todas las historias sin asignación. MoSCoW, área y sprint están en descripciones/etiquetas; prioridad nativa Medium en todas.
- Enlaces a épicas presentes y criterios de aceptación coherentes con el documento.
- KAN-3: Subtarea 2.1, sin descripción. No se eliminó ni se incluyó en el alcance.
- No se encontraron referencias a GitHub, GitLab o repositorio en las incidencias del proyecto. No se recibió código, base de datos o repositorio en los archivos adjuntos. Esto no demuestra que el equipo carezca de código fuera de estas fuentes.
- Sin historias duplicadas entre las 20 historias de Trade.

## Flujo del profesor y correspondencia
| Clase | Estado actual de Jira |
|---|---|
| To Do | Por hacer |
| In Progress | En curso |
| Test | En revisión |
| POC | Finalizada, solo con aceptación comprobada |

No se cambiaron nombres ni configuración del flujo. El conector disponible no expone una operación de edición de columnas o workflows. La correspondencia debe validarse con el docente o renombrarse desde la administración de Jira si exige los nombres literales.

## Plan de implementación
Se incluyen las 20 historias. No se fusionan tarjetas. Orden por dependencias: cuentas; autorización y aprobación; búsqueda/perfil; solicitud e imágenes; consulta de oportunidades; cotización y selección; evidencias; cierre del proveedor; confirmación del cliente; estrellas y comentario. HU-07 requiere trabajos completados y por ello su implementación se valida al final aunque su etiqueta original sea sprint-1.

MoSCoW y etiquetas de tres sprints se conservan. No se inventaron responsables ni se repartió trabajo entre personas no identificadas.

## Decisiones
- Monolito React/TypeScript/Vinext con API, SQLite/D1 y archivos R2, compatible con alojamiento disponible.
- Persistencia y roles reales en servidor. No se usa localStorage para datos del negocio.
- Registro normal por correo/contraseña según HU-01/02, bajo el acceso privado del alojamiento. Las cuentas demo son una ayuda separada para la exposición.
- Fotos de servicios completados constituyen los trabajos publicados (HU-07). Documento de identidad solo visible para su dueño y administración.
- Se añade fotografía y descripción al formulario de proveedor para cubrir los campos públicos de HU-06.
- La aprobación administrativa no equivale a certificación de identidad. El PDF define un problema y no demuestra resultados de una solución.

## Pendientes externos
Responsables reales del equipo, aceptación docente de la correspondencia de estados, repositorio GitHub del equipo y automatización CD de ese repositorio. La reducción de incertidumbre o tiempo aún requiere medición con usuarios reales.
