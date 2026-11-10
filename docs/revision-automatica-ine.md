# Revisión automática local de registros

## Uso

El solicitante elige una foto de cámara o galería, ajusta los cuatro bordes y gira la imagen antes de confirmar. Solo esa imagen privada se adjunta. OpenCV corrige perspectiva/inclinación y contraste en un worker; Tesseract compara dos lecturas. Las diferencias se dejan para revisión y las correcciones manuales nunca se sobrescriben.

El formulario puede mostrar un candidato observado marcado **Revisar** aunque las dos lecturas difieran. Esto no equivale a aceptar ese dato para la aprobación: el servidor conserva ambas lecturas y exige coincidencia. Se admiten CURP con espacios, fechas con separadores espaciados y domicilios impresos en renglones bajo una sola etiqueta, con colonia, código postal y abreviatura de estado.

En **Administración → Por revisar**, pulsa **Iniciar revisión automática**. El navegador analiza de nuevo los documentos privados, uno por uno. Mientras la cola esté iniciada, comprueba nuevos registros cada diez segundos. **Pausar** o salir de la sección detiene nuevas operaciones y cancela el procesamiento local; una decisión que ya se haya guardado no se revierte.

La versión `ine-local-v2-three-fields-80` vuelve a considerar los registros pendientes que fueron analizados con la regla anterior. Al completar cada lectura, el servidor aprueba automáticamente si tres campos distintos coinciden con lo declarado y ambas lecturas de cada campo alcanzan 80 % o más, sin contradicciones ni bloqueos de cuenta, documento o duplicidad. La lista se actualiza y el contador «Aprobados» aumenta sin pulsar «Aprobar proveedor». Solo los registros con `analysis_eligible` pueden entrar en esta cola; los antiguos sin identidad estructurada siguen en revisión manual.

El resumen distingue aprobados, registros para revisión y errores. Los casos con observaciones muestran comparación por campo, confianza y motivos junto al documento. **Reanalizar observaciones** vuelve a procesarlos explícitamente. Los botones manuales permanecen disponibles. Los registros anteriores a esta función requieren revisión manual, incluso si ya incluyen datos estructurados; solo los nuevos registros llevan la marca opcional analysis_eligible.

El solicitante con observaciones puede abrir su perfil de proveedor y pulsar **Corregir identificación y volver a revisión**. Se pide otra captura y confirmación de los datos; conserva sus oficios y datos profesionales. Si un administrador ya decidió mientras tanto, la corrección se detiene sin sobrescribir esa decisión.

## Criterios y límites

Para aprobar se exigen dos lecturas coincidentes con los datos declarados en nombres, apellidos, CURP, nacimiento y vigencia, con al menos 75/100 en cada lectura crítica. También se comprueba la coherencia actual de identidad, vigencia del año en curso, ausencia de otra CURP igual y de contradicciones en otros campos. El apellido materno puede estar vacío cuando no aplica. Un error de OCR, una foto de mala calidad o un duplicado deja el registro pendiente; nunca provoca rechazo automático.

Esto es aprobación interna, no certificación oficial ni detección fiable de documentos falsificados. No se comparan rostros ni se procesan selfies. No se envían imágenes a proveedores externos de OCR. Las bibliotecas y los modelos se sirven desde Trade y se cargan bajo demanda. Las lecturas completas y las variantes de imagen se mantienen en memoria; solo se guarda evidencia estructurada privada.

El servidor admite evidencia exclusivamente desde una sesión administrativa y vuelve a evaluar las reglas con el documento y la identidad actuales. Aprobación, cambio de rol y bitácora se guardan en una transacción: requiere MongoDB Atlas o un replica set. Reintentar la misma operación no duplica decisiones. Las respuestas de los perfiles públicos excluyen identidad y análisis.

## Preparación y pruebas

La CURP se relee primero como línea única y, si no hay dos resultados válidos coincidentes, como línea sin segmentación de palabras (`RAW_LINE`). En ese segundo modo no se fuerza una lista de caracteres, porque puede producir confianza cero en identificadores mixtos. Se conserva la confianza realmente devuelta y las reglas de aprobación administrativa siguen exigiendo 75. Este reintento también se utiliza en la selección manual de zona. La comprobación puntual con un documento local se realizó en memoria, incluyendo el formulario con conversión a JPEG, sin incorporar imágenes ni identificadores reales a pruebas o artefactos.

La lectura enfocada de CURP conserva la confianza real de dos recortes coincidentes y puede proponer el dato con estado **Revisar** por debajo de 75. Esto no modifica el umbral administrativo: la aprobación automática sigue exigiendo al menos 75 en ambas lecturas críticas; una contradicción entre la página y el recorte queda con confianza cero. Municipio y estado se buscan en su propio renglón bajo DOMICILIO, sin depender del prefijo de colonia, y se verifican mediante dos lecturas. Solo se aceptan abreviaturas de entidad conocidas, incluyendo separación por puntos o espacios; no se calcula la ubicación desde CURP ni código postal.

Si quedan campos pendientes, la captura permite **Releer CURP por zona**, **Releer nacimiento por zona** y **Releer domicilio por zona**. El solicitante delimita el valor o el bloque de domicilio en la imagen completa adjunta. Se comparan dos lecturas locales; únicamente se sugieren valores estructuralmente válidos que coincidan, con estado **Revisar**. No se deduce nacimiento desde la CURP. Los recortes no se suben ni sustituyen el documento y esta lectura guiada no se utiliza como evidencia de aprobación administrativa. La revisión independiente también vuelve a leer el bloque completo de domicilio cuando falta alguno de sus campos.

Node 24 y pnpm del proyecto. Para una base existente, antes de activar esta versión ejecuta **pnpm db:analysis** con su .env. Este comando respalda el validador de providers y agrega los campos opcionales ausentes identity, analysis y analysis_eligible, conservando las reglas de los campos existentes. No reescribe datos ni analiza registros. En la base conectada se habilitó identity tras confirmar que faltaba; se verificó la compatibilidad con registros anteriores y se conservaron las demás reglas.

- **pnpm test**: reglas, privacidad, duplicados, decisiones simultáneas y reversión si falla una escritura.
- **pnpm test:browser**: captura, encuadre, pausa, navegación y comparación de OCR real sobre documentos sintéticos. Instala Chromium con **pnpm exec playwright install chromium**. En Windows puede usarse el navegador instalado estableciendo **$env:PLAYWRIGHT_CHANNEL='msedge'**.
- El informe local **.sites-runtime/ine-ocr-benchmark.json** registra aciertos por campo y tiempo sobre muestras sintéticas (sin INE real). No demuestra precisión sobre documentos reales.

Para comprobar tu INE, úsala únicamente de forma local y no la añadas al repositorio ni a los fixtures. No hay garantía de un porcentaje concreto hasta realizar esa comparación. No se hizo commit, push ni despliegue.
