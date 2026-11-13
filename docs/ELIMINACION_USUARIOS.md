# Eliminación de usuarios desde Administración → Personas

Solo Administración puede iniciar esta operación. La interfaz exige escribir el correo de la cuenta y el servidor vuelve a comprobar el rol, el correo, que la cuenta exista, que no sea la propia cuenta y que quede otro administrador activo cuando corresponda.

## Política de datos

La eliminación bloquea cuentas con solicitudes o trabajos aún abiertos, cotizaciones vigentes y reportes abiertos. Una vez cerrados esos procesos, el servidor conserva un registro anónimo e inactivo con el mismo identificador para que los trabajos terminados no pierdan sus referencias. El nombre, correo, credenciales, foto y datos de recuperación dejan de representar a la persona; el correo original queda disponible para un futuro registro.

## Cierre administrativo previo

Desde la ficha de Personas, administración puede cancelar una solicitud Activa, un trabajo Asignado o Terminado, o un trabajo En disputa, siempre con un motivo de hasta 300 caracteres. La cancelación cierra las cotizaciones de esa solicitud y resuelve sus reportes abiertos. El cliente y el proveedor relacionado ven el aviso y el motivo en el detalle. Si el cliente se elimina después, se conserva el motivo escrito por administración para que el proveedor aún pueda consultarlo; los motivos escritos por la cuenta eliminada se retiran del historial.

Una cotización pendiente de un proveedor en la solicitud de otra persona puede retirarse por separado, con motivo visible para ambas partes. Así la solicitud del cliente sigue abierta. Las solicitudes dirigidas a un proveedor también aparecen en su ficha para que administración pueda cerrarlas expresamente. Un reporte abierto sobre un servicio Completado requiere resolución desde Moderación antes de eliminar una cuenta.

En una transacción de MongoDB se revocan las sesiones, se eliminan solicitudes de recuperación y trabajos de revisión automática, el perfil de proveedor y sus datos privados del INE, y los metadatos de sus archivos. Con almacenamiento MongoDB también se eliminan los bytes en esa transacción. Se sustituyen los textos personales que pertenecen a la cuenta en solicitudes, cotizaciones, reseñas, reportes y bitácora. No se puede detectar con certeza una mención libre a esa persona escrita por terceros; ese contenido requiere moderación si se identifica. La bitácora conserva el identificador anónimo necesario para rastrear la operación y registra qué administrador la ejecutó, sin copiar los datos personales de la cuenta eliminada al nuevo evento.

Con R2, la transacción también deja una tarea de borrado por archivo. Los archivos dejan de ser accesibles por la API al confirmar la eliminación; la aplicación intenta borrar inmediatamente los objetos de R2 y reintenta los fallos cada cinco minutos mediante una tarea programada. La respuesta avisa si quedan archivos por limpiar. Una carga de imagen iniciada antes de eliminar la cuenta se cancela y retira su objeto si la cuenta ya fue eliminada. Las cuentas eliminadas no aparecen en Personas, su exportación ni los contadores del tablero. Antes de utilizar esta función en otra base o despliegue, ejecuta `pnpm db:setup` para crear la colección y validadores nuevos.

Las eliminaciones y los cambios de rol administrativo comparten una barrera transaccional. Dos administradores no pueden eliminarse mutuamente ni retirar a la vez el último permiso de administración. La operación no revierte eliminaciones ya confirmadas.
