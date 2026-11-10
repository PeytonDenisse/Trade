# Captura de INE para solicitar el registro como proveedor

## Flujo

El registro de proveedores usa «Subir foto desde mi dispositivo» como entrada obligatoria para el INE. Después de la lectura local, la persona revisa los datos en los apartados del modal. Puede corregirlos manualmente. Al seleccionar otra imagen, la evidencia de la lectura anterior deja de contar; los datos del formulario solo se reemplazan tras su confirmación explícita.

## Validación automática preliminar

Esta validación es informativa y se recalcula al corregir un campo o leer una imagen nueva. Los campos elegibles son nombre(s), apellido paterno, apellido materno, fecha de nacimiento, sexo o género, CURP, calle y número, colonia, código postal y vigencia. Municipio y estado se excluyen porque pueden derivarse de abreviaturas del domicilio. Cada campo cuenta una sola vez únicamente si está declarado, aparece en **ambas lecturas independientes**, las dos lecturas y el dato declarado coinciden tras normalización, y **cada confianza es al menos 80 %**. Las dos lecturas de un mismo campo no se cuentan como dos coincidencias. Una diferencia entre lecturas o con lo declarado impide el resultado positivo; una lectura ausente o inferior al umbral queda para revisión.

El resultado «Validación preliminar aprobada» requiere al menos tres campos distintos coincidentes y ninguna contradicción. El indicador del formulario no cambia permisos porque sus lecturas locales pueden manipularse. Tras enviar el registro, la revisión automática del servidor vuelve a leer el documento privado y aplica el mismo umbral. Si la cola de revisión automática está activada y el documento, la cuenta y la CURP duplicada pasan sus controles, la decisión se guarda como «Aprobada» y se asigna el rol de proveedor sin un clic administrativo. Si la cola no está configurada o activada, el registro permanece «Pendiente» para revisión manual. Ninguno de estos resultados certifica la autenticidad del documento ni la identidad.

El solicitante elige una imagen de su dispositivo y puede corregir los datos manualmente. La fotografía del INE es obligatoria para enviar la solicitud. Se aceptan PNG, JPG y WebP de hasta 5 MB.

Al confirmar el archivo, Trade lo adjunta a su almacenamiento privado y después intenta leerlo con OCR en el navegador. Los datos detectados rellenan campos vacíos. Si ya hay datos, la persona elige entre conservarlos y completar solo los vacíos o sustituirlos tras confirmar la pérdida de correcciones manuales. Todos los campos pueden corregirse y requieren confirmación antes del envío. Si falla el OCR, se pueden completar manualmente los datos mientras la imagen sigue adjunta.

Cuando la lectura general no detecta CURP, fecha de nacimiento o vigencia, el navegador hace una lectura adicional de las zonas donde suelen aparecer. Solo acepta un valor si también reconoce la etiqueta correspondiente y el formato del dato es válido; estos resultados se marcan «Revisar». Las variaciones de credencial o encuadre pueden dejar campos pendientes.

## Datos y privacidad

El formulario y la solicitud guardan nombre(s), apellidos, fecha de nacimiento, sexo, CURP, calle y número, colonia, código postal, municipio o alcaldía, estado y vigencia del INE. La solicitud de proveedor guarda estos datos estructurados en MongoDB y la referencia del documento; la imagen se almacena en el bucket privado. La API valida los datos de nuevo y omite identidad y documento de los perfiles públicos. La ruta de lectura del documento permite acceso a su propietario y a Administración y responde con `Cache-Control: private, no-store`.

El texto OCR completo se usa solo durante el reconocimiento y no se envía ni se guarda como texto. El extractor devuelve únicamente los campos anteriores y descarta las líneas identificadas como **clave de elector**. No hay lectura de QR ni códigos de barras. Los recursos de Tesseract.js se sirven desde `/ocr/worker.min.js`, `/ocr/core` y `/ocr/lang/spa.traineddata.gz` en el mismo origen; esos archivos son públicos y no contienen imágenes del usuario. [Tesseract.js documenta la configuración de rutas locales](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md).

El worker y el núcleo se copiaron de las dependencias instaladas de `tesseract.js@7.0.0` y `tesseract.js-core`. El modelo español procede de `https://tessdata.projectnaptha.com/4.0.0/spa.traineddata.gz`; SHA-256: `6CD52C545BCEEACB2E43FAD64FC0703A711C482BA20D1CA4B6915C09DE9973E6`. Conservar estas rutas locales en el despliegue evita descargar código o el modelo de reconocimiento desde servicios externos durante cada sesión.

**Límite de privacidad:** la fotografía completa se sube a Trade antes del OCR y puede mostrar la clave de elector u otros datos impresos, aunque no existan como campos estructurados. La implementación actual no oculta esas zonas de la imagen ni borra automáticamente un documento adjuntado si se abandona el formulario. Se debe definir la retención y el aviso de privacidad aplicables antes de usar este flujo en producción.

## Límites de reconocimiento

«Reconocido» significa que el formato detectado pasó una comprobación estructural; no acredita autenticidad del INE, de la CURP ni de la persona. «Revisar» exige confirmación humana y «Pendiente» requiere captura manual. Los formatos de credencial varían; poca luz, reflejos, desenfoque o texto ilegible pueden dejar campos vacíos o incorrectos. El sistema no inventa datos faltantes ni infiere el sexo por la imagen o el nombre.

## Decisión técnica y disposición de campos

Se mantiene [Tesseract.js](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), ya instalado en Trade y publicado bajo [Apache-2.0](https://github.com/naptha/tesseract.js/blob/master/LICENSE.md). Su salida por palabras y coordenadas permite localizar etiquetas y leer regiones del documento sin enviar la fotografía a otro proveedor. Se evaluó [PaddleOCR.js](https://github.com/PaddlePaddle/PaddleOCR/blob/main/paddleocr-js/packages/core/README.md), también [Apache-2.0](https://github.com/PaddlePaddle/PaddleOCR/blob/main/LICENSE); incorporarlo requeriría alojar modelos ONNX y WASM adicionales. No se copió código de ninguno de estos proyectos: Trade usa la biblioteca Tesseract.js como dependencia y conserva su parser propio.

La lectura espacial separa los tres renglones bajo «NOMBRE» y los renglones bajo «DOMICILIO». La tercera línea de domicilio solo propone municipio y entidad si aparece una abreviatura incluida en el [catálogo publicado por el INE](https://ayuda.ine.mx/PUE-2019ext/PREP/assets/documentos/Normatividad/PREP/Anexo_18.10_INE-CG565-2017.pdf) y una segunda lectura de esa línea coincide con la primera. Cuando las lecturas discrepan, el campo queda pendiente. Los campos propuestos se marcan «Revisar» y nunca sustituyen una corrección manual.

El [INE describe el marcador «GÉNERO NB»](https://centralelectoral.ine.mx/2026/06/02/inicia-ine-produccion-del-nuevo-modelo-de-la-credencial-para-votar/). El formulario, su validación y el esquema privado aceptan «NB» sin convertirlo a H o M. La CURP puede conservar otro marcador; por eso la concordancia entre ambos campos no se exige cuando la credencial indica NB. Esto no confirma la identidad ni la autenticidad del documento.
