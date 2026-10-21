# Evidencia visual: acceso y nueva solicitud

Capturas tomadas con Edge local a 1440 px y 390 px:

- acceso-desktop.png: registro e inicio de sesión.
- acceso-mobile.png: formularios apilados.
- acceso-validacion-mobile.png: errores junto a correo y contraseña, con foco en el primer campo inválido.
- crear-solicitud-desktop.png y crear-solicitud-mobile.png: formulario de oficio, descripción y fecha.
- crear-solicitud-validacion-mobile.png: errores junto a los tres campos y foco en oficio.
- publicacion-desktop.png y publicacion-mobile.png: confirmación después de crear solicitudes reales en una base MongoDB temporal.
- foto-visible-desktop.png y foto-visible-mobile.png: fotografía ficticia cargada después de publicar y mostrada en el detalle.

Las capturas iniciales del formulario de creación se hicieron con una previsualización temporal del componente, retirada del código antes de finalizar. Las capturas de confirmación y foto proceden del recorrido real de registro, acceso, publicación y carga posterior. En ambos tamaños se comprobó que el ancho del documento no excede el viewport (1440/1425 px y 390/390 px, respectivamente).

Para la verificación se usó MongoDB local temporal y una imagen ficticia de public/demo-assets. La instancia y sus datos se retiraron después. La prueba integrada de API pasó con MongoDB Memory Server.
