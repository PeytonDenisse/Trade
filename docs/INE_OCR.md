# Captura de INE para solicitar el registro como proveedor

## Flujo

El solicitante puede tomar una foto con la cámara, elegir una imagen de su dispositivo o capturar los datos manualmente. El formulario manual funciona sin cámara ni OCR, aunque la fotografía del INE sigue siendo obligatoria para enviar la solicitud. Se aceptan PNG, JPG y WebP de hasta 5 MB.

Al confirmar una foto o elegir un archivo, Trade lo adjunta a su almacenamiento privado y después intenta leerlo con OCR en el navegador. Los datos detectados rellenan campos vacíos. Si ya hay datos, la persona elige entre conservarlos y completar solo los vacíos o usar los nuevos resultados. Todos los campos pueden corregirse y requieren confirmación antes del envío. Si falla la cámara o el OCR, se puede continuar con la galería o la captura manual.

Cuando la lectura general no detecta CURP, fecha de nacimiento o vigencia, el navegador hace una lectura adicional de las zonas donde suelen aparecer. Solo acepta un valor si también reconoce la etiqueta correspondiente y el formato del dato es válido; estos resultados se marcan «Revisar». Las variaciones de credencial o encuadre pueden dejar campos pendientes.

## Datos y privacidad

El formulario y la solicitud guardan nombre(s), apellidos, fecha de nacimiento, sexo, CURP, calle y número, colonia, código postal, municipio o alcaldía, estado y vigencia del INE. La solicitud de proveedor guarda estos datos estructurados en MongoDB y la referencia del documento; la imagen se almacena en el bucket privado. La API valida los datos de nuevo y omite identidad y documento de los perfiles públicos. La ruta de lectura del documento permite acceso a su propietario y a Administración y responde con `Cache-Control: private, no-store`.

El texto OCR completo se usa solo durante el reconocimiento y no se envía ni se guarda como texto. El extractor devuelve únicamente los campos anteriores y descarta las líneas identificadas como **clave de elector**. No hay lectura de QR ni códigos de barras. Los recursos de Tesseract.js se sirven desde `/ocr/worker.min.js`, `/ocr/core` y `/ocr/lang/spa.traineddata.gz` en el mismo origen; esos archivos son públicos y no contienen imágenes del usuario. [Tesseract.js documenta la configuración de rutas locales](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md).

El worker y el núcleo se copiaron de las dependencias instaladas de `tesseract.js@7.0.0` y `tesseract.js-core`. El modelo español procede de `https://tessdata.projectnaptha.com/4.0.0/spa.traineddata.gz`; SHA-256: `6CD52C545BCEEACB2E43FAD64FC0703A711C482BA20D1CA4B6915C09DE9973E6`. Conservar estas rutas locales en el despliegue evita descargar código o el modelo de reconocimiento desde servicios externos durante cada sesión.

**Límite de privacidad:** la fotografía completa se sube a Trade antes del OCR y puede mostrar la clave de elector u otros datos impresos, aunque no existan como campos estructurados. La implementación actual no oculta esas zonas de la imagen ni borra automáticamente un documento adjuntado si se abandona el formulario. Se debe definir la retención y el aviso de privacidad aplicables antes de usar este flujo en producción.

## Límites de reconocimiento y cámara

«Reconocido» significa que el formato detectado pasó una comprobación estructural; no acredita autenticidad del INE, de la CURP ni de la persona. «Revisar» exige confirmación humana y «Pendiente» requiere captura manual. Los formatos de credencial varían; poca luz, reflejos, desenfoque o texto ilegible pueden dejar campos vacíos o incorrectos. El sistema no inventa datos faltantes ni infiere el sexo por la imagen o el nombre.

La cámara solicita permiso y requiere un contexto seguro: HTTPS en producción o `localhost` durante desarrollo. El navegador puede denegar el permiso o no disponer de una cámara compatible. Al cerrar la captura se detienen sus pistas de video. [MDN documenta los requisitos de seguridad y permiso de `getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

## Decisión técnica y disposición de campos

Se mantiene [Tesseract.js](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), ya instalado en Trade y publicado bajo [Apache-2.0](https://github.com/naptha/tesseract.js/blob/master/LICENSE.md). Su salida por palabras y coordenadas permite localizar etiquetas y leer regiones del documento sin enviar la fotografía a otro proveedor. Se evaluó [PaddleOCR.js](https://github.com/PaddlePaddle/PaddleOCR/blob/main/paddleocr-js/packages/core/README.md), también [Apache-2.0](https://github.com/PaddlePaddle/PaddleOCR/blob/main/LICENSE); incorporarlo requeriría alojar modelos ONNX y WASM adicionales. No se copió código de ninguno de estos proyectos: Trade usa la biblioteca Tesseract.js como dependencia y conserva su parser propio.

La lectura espacial separa los tres renglones bajo «NOMBRE» y los renglones bajo «DOMICILIO». La tercera línea de domicilio solo propone municipio y entidad si aparece una abreviatura incluida en el [catálogo publicado por el INE](https://ayuda.ine.mx/PUE-2019ext/PREP/assets/documentos/Normatividad/PREP/Anexo_18.10_INE-CG565-2017.pdf) y una segunda lectura de esa línea coincide con la primera. Cuando las lecturas discrepan, el campo queda pendiente. Los campos propuestos se marcan «Revisar» y nunca sustituyen una corrección manual.

El [INE describe el marcador «GÉNERO NB»](https://centralelectoral.ine.mx/2026/06/02/inicia-ine-produccion-del-nuevo-modelo-de-la-credencial-para-votar/). El formulario, su validación y el esquema privado aceptan «NB» sin convertirlo a H o M. La CURP puede conservar otro marcador; por eso la concordancia entre ambos campos no se exige cuando la credencial indica NB. Esto no confirma la identidad ni la autenticidad del documento.
