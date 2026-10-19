# Validación de navegador — 19 de octubre de 2026

La portada, los controles de exploración y la pantalla Recorrido de demo se renderizan en el navegador de pruebas. Al entrar como cliente, el servidor rechaza correctamente la sesión porque esta vista previa no recibe una identidad de propietario de Sites. No se modificó esta protección.

El recorrido autenticado (solicitud, autorización de proveedor, cotización, selección, evidencias, terminación, confirmación y reseña) aún NO está aprobado en navegador. Las pruebas de API cubren estas operaciones, pero no sustituyen esta validación visual.

La creación del repositorio GitHub requiere iniciar sesión en el navegador: el conector disponible no expone creación de repositorios. La configuración de CI usa la versión de pnpm declarada en package.json y ejecuta tipos, pruebas y compilación; aún no hay una ejecución remota comprobada. El despliegue actual se realiza mediante Sites; no se declara CD desde GitHub activo.

Las historias permanecen en revisión.
