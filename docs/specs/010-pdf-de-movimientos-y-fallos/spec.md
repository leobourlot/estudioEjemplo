# Spec 010 — PDF de movimientos y fallos

## Contexto y objetivo
Hoy el estudio registra lo que pasa en cada expediente con movimientos (spec 003) y comparte la jurisprudencia con fallos (spec 005), pero solo como texto: el escrito presentado, la resolución o el fallo completo quedan fuera del sistema, en el correo o en la computadora de quien los descargó. Para leer el documento hay que buscarlo en otro lado, y el cliente que quiere ver la resolución de su causa tiene que pedirla. Las specs 003 y 005 dejaron los adjuntos fuera de alcance. Esta spec permite que administradores y abogados suban un archivo PDF a cada movimiento y a cada fallo, y que lo vean y lo descarguen desde el panel. El archivo se guarda en la base de datos, junto con los demás datos del sistema (principio 5), idéntico al que se subió, así que un documento firmado digitalmente conserva su firma. Como los documentos de una causa están amparados por el secreto profesional, el PDF de un movimiento no tiene una visibilidad propia: sigue la del movimiento, que nace oculto (spec 003). El cliente solo ve el PDF de un movimiento que puede ver, y no ve ningún PDF sin que un integrante haya hecho visible su movimiento. Los PDF de los fallos son, como toda la jurisprudencia, solo del panel.

Esta spec amplía las specs 003, 004, 005 y 009 sin reescribirlas (como estableció la spec 009, RF-12). Donde agrega algo a un requisito de esas specs, lo indica con su número. Las specs 003, 005 y 009 llevan, en lo que dejaban fuera de alcance, una nota que remite a esta.

## Usuarios / actores
- **Integrante del estudio** (administrador o abogado, según la spec 001): sube, reemplaza, quita, ve y descarga el PDF de cualquier movimiento y de cualquier fallo. Decide si el cliente ve el PDF de un movimiento al decidir si ve el movimiento. Todos los integrantes trabajan sobre todas las causas y sobre toda la jurisprudencia (spec 002, RF-35; spec 005).
- **Cliente** (spec 001): no sube archivos. En el portal ve y descarga el PDF de un movimiento de sus propias causas solo si puede ver el movimiento.
- **Visitante** (spec 001): no accede a ningún PDF.

## Historias de usuario
- H1: Como integrante del estudio quiero adjuntar a un movimiento el PDF del escrito, la providencia o la resolución, para tener el documento junto a su registro y no buscarlo en otro lado.
- H2: Como integrante del estudio quiero adjuntar el PDF al cargar el movimiento o más tarde, porque a veces el documento llega después.
- H3: Como integrante del estudio quiero que el cliente vea el PDF de un movimiento solo cuando ve el movimiento, para decidir la visibilidad en un solo lugar y no tener que acordarme de marcar dos cosas.
- H4: Como integrante del estudio quiero adjuntar a un fallo su texto completo en PDF, para leerlo sin depender de que la fuente siga en línea.
- H5: Como integrante del estudio quiero reemplazar un PDF equivocado por el correcto, o quitarlo, y que el sistema no conserve el que quité, por si contenía datos que no debían estar.
- H6: Como integrante del estudio quiero subir PDF firmados digitalmente y que la firma siga siendo válida al descargarlos.
- H7: Como integrante del estudio quiero ver un PDF en el navegador o descargarlo, desde la computadora o desde el celular.
- H8: Como integrante del estudio quiero saber quién subió, reemplazó o quitó cada PDF y cuándo.
- H9: Como cliente quiero ver y descargar el documento de un movimiento de mi causa, cuando el estudio me lo comparte, para no tener que pedirlo.
- H10: Como integrante del estudio quiero que nadie fuera del estudio pueda abrir un PDF que no le corresponde, aunque copie o adivine su dirección.

## Requisitos funcionales (criterios de aceptación en EARS)

### El archivo
- RF-1: EL SISTEMA permite que cada movimiento y cada fallo tengan como máximo un PDF adjunto. Adjuntarlo es opcional.
- RF-2: EL SISTEMA guarda el contenido de cada PDF en la base de datos, junto con los demás datos del sistema (principio 5). Nunca lo escribe en archivos del servidor fuera de la base de datos, ni siquiera de forma temporal mientras lo recibe, ni en el navegador, ni en servicios externos.
- RF-3: EL SISTEMA solo acepta un archivo que cumpla todas estas reglas, verificadas en el servidor sobre el contenido recibido, sin confiar en el nombre, en la extensión ni en el tipo que informa el navegador:
  - Es un PDF: la marca de inicio de los PDF (`%PDF-`) aparece dentro de sus primeros 1.024 bytes, que es donde la buscan los lectores de PDF.
  - No está vacío.
  - Pesa hasta 5 MB (5.242.880 bytes), inclusive.
- RF-4: SI el archivo no cumple alguna regla de RF-3, ENTONCES EL SISTEMA lo rechaza sin guardar nada, con el mensaje que corresponda:
  - No es un PDF: "El archivo debe ser un PDF".
  - Está vacío: "El archivo está vacío".
  - Pesa más de 5 MB: "El archivo no puede superar los 5 MB". El servidor deja de recibirlo en cuanto supera ese tamaño, sin esperar a que llegue completo.
  - Se intenta subir más de un archivo a la vez: "Podés adjuntar un solo PDF".
- RF-5: EL SISTEMA guarda el PDF tal como se subió, sin modificarlo, comprimirlo ni convertirlo, y lo entrega idéntico al que se subió. Así, un PDF firmado digitalmente conserva su firma válida. EL SISTEMA no verifica la firma.
- RF-6: EL SISTEMA asigna a cada PDF, al guardarlo, un **código** de 6 caracteres al azar, formado por letras mayúsculas sin tildes y números, distinto del de todos los PDF guardados. Cada PDF nuevo recibe un código nuevo, también al reemplazar otro. El código solo forma parte del nombre del archivo: EL SISTEMA nunca lo acepta para pedir un PDF.
- RF-7: Cuando se ve o se descarga, el PDF se llama así, con los datos vigentes en ese momento:
  - El de un movimiento: su fecha como aaaa-mm-dd, un espacio, su tipo sin tildes, un espacio y el código. Por ejemplo, "2026-10-24 Resolucion K7Q2MX.pdf" o "2026-10-24 Escrito presentado H3T9WA.pdf".
  - El de un fallo: "Fallo", un espacio, su fecha como aaaa-mm-dd, un espacio y el código. Por ejemplo, "Fallo 2019-05-12 P4N8RC.pdf".

  Ningún texto cargado por un usuario (descripción, carátula, sumario) forma parte del nombre.
- RF-8: EL SISTEMA no guarda, no muestra y no escribe en sus registros nada del nombre con el que se subió el archivo, ni el tipo que informa el navegador.
- RF-9: EL SISTEMA registra de cada PDF su tamaño, quién lo subió y cuándo. Muestra el tamaño sin decimales, redondeado al entero más cercano, con 1 KB = 1.024 bytes y 1 MB = 1.048.576 bytes:
  - En KB, si el redondeo da menos de 1.024 KB, con un mínimo de "1 KB".
  - En MB, si no.

  Por ejemplo: "1 KB", "850 KB", "2 MB", "5 MB".

### En el formulario
- RF-10: EL SISTEMA ofrece adjuntar, reemplazar y quitar el PDF dentro del formulario de carga y del de modificación del movimiento o del fallo. Los cambios del PDF se guardan al guardar el formulario, junto con los demás datos, en una sola operación: se guarda todo o nada.
- RF-11: SI el PDF o algún otro dato del formulario se rechaza, ENTONCES EL SISTEMA no guarda nada: ni el movimiento o el fallo, ni el PDF. El formulario conserva lo escrito. Si se rechazó otro dato, conserva también el archivo elegido; si se rechazó el archivo, lo descarta y hay que elegir otro. MIENTRAS haya un archivo rechazado, en la pantalla o por la api, sin elegir otro ni descartarlo, EL SISTEMA no envía el formulario y muestra el mensaje "El PDF elegido no se adjuntó: <motivo>. Elegí otro archivo o descartalo"; con "Descartar" se puede guardar sin cambiar el PDF (agregado el 11/11/2026, en la demo manual: antes se guardaba el resto sin avisar que el PDF no había cambiado).
- RF-12: MIENTRAS se sube un PDF, EL SISTEMA muestra que la subida está en curso y no permite enviar el formulario de nuevo hasta que termine. La subida cuenta como uso de la sesión (spec 001, RF-12) mientras dura: la sesión no vence durante una subida en curso. SI la subida se interrumpe, ENTONCES EL SISTEMA no guarda nada, ni los datos ni el archivo, muestra el mensaje "No se pudo guardar. Probá de nuevo" y el formulario conserva lo escrito y el archivo elegido.
- RF-13: CUANDO se guarda un formulario que reemplaza o quita un PDF guardado, EL SISTEMA pide antes confirmación, con el mensaje "El PDF actual se borrará definitivamente y será reemplazado por el nuevo. No se puede deshacer" o "El PDF se borrará definitivamente. No se puede deshacer", según corresponda. Si no se confirma, no guarda nada y el formulario sigue abierto con lo escrito.
- RF-14: CUANDO se guarda un reemplazo o un quitado confirmado, EL SISTEMA borra el PDF anterior de la base de datos. El sistema ya no lo conserva ni lo puede recuperar.
- RF-15: EL SISTEMA no ofrece una opción de visibilidad propia del PDF: en el formulario de un movimiento, la única marca de visibilidad es la del movimiento (spec 003). SI el servidor recibe una visibilidad del PDF (`pdfVisible`), ENTONCES la rechaza como cualquier campo desconocido, con el mensaje "El campo pdfVisible no está permitido", sin guardar nada (modificado el 12/11/2026: antes el PDF tenía una marca de visibilidad propia, que nacía desmarcada).

### PDF de un movimiento
- RF-16: CUANDO un integrante adjunta un PDF a un movimiento no anulado de una causa activa, EL SISTEMA lo guarda y registra quién lo subió y cuándo. El cliente lo ve si puede ver el movimiento (RF-33): un PDF adjuntado o reemplazado en un movimiento visible queda a la vista del cliente al guardar.
- RF-17: EL SISTEMA no registra una visibilidad propia del PDF de un movimiento: el PDF es visible para el cliente si y solo si el cliente puede ver el movimiento (spec 003, RF-30). CUANDO el movimiento pasa a no visible o se anula, o el PDF se quita, el cliente deja de verlo a partir de su siguiente acción (spec 004, RF-3). CUANDO el PDF se reemplaza, el cliente ve el nuevo.
- RF-18: CUANDO un integrante deja a la vista del cliente un PDF, EL SISTEMA muestra un único aviso informativo, que no exige confirmación:
  - Si el movimiento pasa a visible y tiene PDF: el aviso de la spec 003 (RF-9), con el agregado "El cliente también podrá ver y descargar el PDF".
  - Si el movimiento ya era visible, sigue siéndolo y se le adjunta o reemplaza el PDF: "El cliente podrá ver y descargar este PDF".

  En un movimiento que no queda visible no hay aviso del PDF. Si en la misma operación corresponde además el aviso de la spec 003 (RF-13), se muestran los dos, primero el de la spec 003. Adjuntar, reemplazar o quitar el PDF no dispara por sí solo el aviso de la spec 003 (RF-13).
- RF-19: CUANDO un integrante restaura un movimiento marcado como visible que tiene PDF, EL SISTEMA le muestra antes el aviso "Al restaurarlo, el cliente volverá a ver este movimiento y su PDF" y le pide confirmación. Si no confirma, no lo restaura.
- RF-20: EL SISTEMA cuenta como modificación del movimiento (spec 003, RF-2) adjuntar, reemplazar o quitar su PDF. Como en la spec 003 (RF-10), no son modificación de la causa.
- RF-21: EL SISTEMA registra en el historial de cambios del movimiento (spec 003, RF-20) el PDF como un dato más del movimiento: como valores anterior y nuevo, si tiene PDF y, si lo tiene, su código y su tamaño. Nunca registra su contenido. En pantalla, cada valor muestra solo el tamaño (por ejemplo, "17 KB"), o "Sin PDF"; el código queda registrado, pero no se muestra. Los cambios registrados antes del 12/11/2026 guardan además la visibilidad propia que tenía el PDF, que no se muestra.
- RF-22: SI se intenta adjuntar, reemplazar o quitar el PDF de un movimiento anulado, ENTONCES EL SISTEMA lo rechaza con el mensaje de la spec 003 (RF-15): "El movimiento está anulado. Restauralo para modificarlo". El PDF se conserva mientras el movimiento está anulado, y los integrantes lo pueden ver y descargar. Al restaurar el movimiento, el cliente vuelve a ver el PDF si el movimiento es visible (spec 003, RF-18).
- RF-23: SI se intenta adjuntar, reemplazar o quitar el PDF de un movimiento de una causa desactivada, ENTONCES EL SISTEMA lo rechaza con el mensaje de la spec 003 (RF-28): "La causa está desactivada". Los integrantes pueden seguir viendo y descargando el PDF. CUANDO la causa se reactiva, los clientes vinculados vuelven a ver los PDF de sus movimientos visibles (spec 002, RF-42).

### PDF de un fallo
- RF-24: CUANDO un integrante adjunta un PDF a un fallo activo, al cargarlo o al modificarlo, EL SISTEMA lo guarda y registra quién lo subió y cuándo. Adjuntar, reemplazar o quitar el PDF cuenta como modificación del fallo (spec 005, RF-2). El reemplazo y el quitado siguen RF-13 y RF-14.
- RF-25: MIENTRAS EL SISTEMA espera que el integrante confirme el aviso de fallo repetido (spec 005, RF-18), no guarda nada. Si confirma, guarda el fallo con el archivo elegido, sin que haya que volver a elegirlo. Si no confirma, no guarda nada y el formulario conserva lo escrito y el archivo elegido. El aviso no tiene en cuenta el PDF: dos fallos con el mismo PDF no lo disparan, y adjuntar un PDF tampoco.
- RF-26: SI se intenta adjuntar, reemplazar o quitar el PDF de un fallo desactivado, ENTONCES EL SISTEMA lo rechaza con el mensaje de la spec 005 (RF-30): "El fallo está desactivado. Reactivalo para modificarlo". El PDF se conserva y los integrantes lo pueden ver y descargar. Al reactivar el fallo, lo conserva.
- RF-27: EL SISTEMA nunca entrega el PDF de un fallo, ni indica que un fallo tiene PDF, a nadie que no sea administrador o abogado (spec 005, RF-36). El PDF de un fallo no tiene marca de visibilidad.

### Ver y descargar
- RF-28: EL SISTEMA ofrece, en cada lugar donde muestra un PDF, dos opciones:
  - "Ver PDF": lo abre en una pestaña nueva, con el visor del navegador. La pestaña nueva queda aislada: el PDF no recibe la dirección del panel ni del portal y no puede controlar la pestaña de la que se abrió (como en la spec 005, RF-19).
  - "Descargar PDF": lo descarga con el nombre de RF-7.

  Cada opción se anuncia con el dato que la identifica, para que no se lean todas iguales (por ejemplo, "Ver el PDF del movimiento del 24/10/2026"), y "Ver PDF" anuncia que se abre en una pestaña nueva.
- RF-29: EL SISTEMA solo permite pedir un PDF a través de su causa y su movimiento, o de su fallo. El PDF no tiene un identificador propio, y su código (RF-6) no sirve para pedirlo.
- RF-30: CUANDO un integrante consulta el historial de movimientos de una causa (spec 003, RF-24), EL SISTEMA muestra además, en cada movimiento que tiene PDF, la leyenda "PDF".
- RF-31: CUANDO un integrante consulta un movimiento (spec 003, RF-22), EL SISTEMA muestra además, si tiene PDF, su tamaño (RF-9), quién lo subió y cuándo, y las opciones de RF-28.
- RF-32: CUANDO un integrante consulta el listado de jurisprudencia (spec 005, RF-22), EL SISTEMA muestra además la leyenda "PDF" en cada fallo que tiene uno. CUANDO consulta un fallo (spec 005, RF-19), muestra además, si tiene PDF, su tamaño, quién lo subió y cuándo, y las opciones de RF-28.

### PDF en el portal del cliente
- RF-33: EL SISTEMA considera que un cliente puede ver el PDF de un movimiento si y solo si el movimiento tiene PDF y el cliente puede ver el movimiento (spec 003, RF-30): es visible, no está anulado y el cliente está vinculado a su causa, que está activa.

  Esta es la única regla que decide qué PDF ve un cliente, y se aplica siempre en el servidor, en cada acción del cliente (spec 004, RF-3). Un cliente solo puede ver PDF de sus propias causas.
- RF-34: CUANDO un cliente consulta los movimientos de su causa (spec 004, RF-21) o abre un movimiento (spec 004, RF-22), EL SISTEMA muestra la leyenda "PDF" y las opciones de RF-28 solo en los movimientos cuyo PDF puede ver. En los demás no muestra ninguna opción ni indicio de PDF, así que el portal nunca le ofrece pedir un PDF que no puede ver.
- RF-35: EL SISTEMA solo envía al cliente, de cada PDF que puede ver, lo necesario para verlo y descargarlo: que lo tiene y, al pedirlo, el archivo con su nombre (RF-7). Esto se suma a lo que enumera la spec 004 (RF-30). El portal no muestra el tamaño. Nunca le envía:
  - Si un movimiento que no puede ver tiene PDF.
  - Quién subió, reemplazó o quitó el PDF, ni cuándo.
  - Si el PDF fue reemplazado o quitado.
- RF-36: EL SISTEMA no deja copias del PDF en la caché del navegador, ni en el portal ni en el panel. Ver o descargar un PDF cuenta como acción del cliente (spec 004, RF-3). Una copia que el usuario descarga queda en su dispositivo, fuera del sistema: cuando la sesión se cierra, el portal no muestra nada de esa sesión (spec 004, RF-5), pero el archivo descargado sigue ahí.

### Abrir un PDF sin permiso
- RF-37: CUANDO alguien abre la dirección de un PDF, desde "Ver PDF" o "Descargar PDF", o escribiéndola o copiándola:
  - Sin sesión, o con la sesión vencida: EL SISTEMA lo lleva a la pantalla de ingreso. Después de ingresar no abre el PDF: lo lleva a la pantalla que le corresponde según la spec 001 (RF-8).
  - Con un cambio de contraseña pendiente: sigue la spec 001 (RF-11).
  - Con sesión, si no puede ver ese PDF: EL SISTEMA lo lleva a su pantalla de inicio (el panel para un integrante, el portal para un cliente, spec 001, RF-20) con el mensaje "No existe ese PDF".

  Para un cliente, no puede ver el PDF si la causa no existe, es ajena o está desactivada, si el movimiento no existe, no pertenece a esa causa, está oculto o anulado, si no tiene PDF, o si el PDF es de un fallo. Para un integrante, si la causa, el movimiento o el fallo no existen o no tienen PDF. En todos esos casos EL SISTEMA responde siempre lo mismo, sin revelar de cuál se trata.

### Permisos e integridad
- RF-38: EL SISTEMA solo permite a administradores y abogados, solo desde el panel, adjuntar, reemplazar, quitar, ver y descargar el PDF de cualquier movimiento y de cualquier fallo. Un cliente solo ve y descarga, desde el portal, los PDF de RF-33. Cualquier otro intento de un cliente o de un visitante se rechaza según la spec 001 (RF-18 y RF-19), o según RF-37 si abre la dirección de un PDF. Un integrante con cambio de contraseña pendiente tampoco accede (spec 001, RF-11). Este control se hace siempre en el servidor, aunque la interfaz oculte la opción.
- RF-39: SI la causa, el movimiento o el fallo de un formulario no existen, ENTONCES EL SISTEMA rechaza la operación con el mensaje de su spec: "No existe esa causa" o "No existe ese movimiento" (spec 003, RF-34), o "No existe ese fallo" (spec 005, RF-33).
- RF-40: CUANDO se desactiva la cuenta de un integrante (spec 001), EL SISTEMA conserva su autoría en los PDF que subió y en el historial de cambios, y lo muestra como desactivado (como en la spec 003, RF-36, y la spec 005, RF-35).

### Modo demo
- RF-41: MIENTRAS el modo demo está encendido (spec 009, RF-15), EL SISTEMA permite adjuntar, reemplazar, quitar, ver y descargar PDF igual que con el modo demo apagado, pero la base tiene como máximo 4 PDF en total, contando los de muestra. SI se intenta guardar un PDF nuevo cuando ya hay 4, ENTONCES EL SISTEMA lo rechaza con el mensaje "En la demo se pueden tener hasta 4 PDF. Quitá uno para subir otro". Un reemplazo no suma, porque borra el anterior. El tope se respeta aunque dos personas suban a la vez. Con el modo demo apagado no hay tope.
- RF-42: EL SISTEMA trae en los datos de muestra (spec 009) dos PDF ficticios de una página, hechos para la demo, que dicen que son documentos de muestra:
  - Uno en un movimiento visible de una causa de la cliente de prueba, para que la cliente de prueba lo vea en el portal.
  - Uno en un fallo.

  Ninguno contiene datos del estudio para el que se hizo el sistema ni de personas reales (spec 009, RF-12). El plan elige el movimiento y el fallo.
- RF-43: CUANDO se ejecuta el restablecimiento de la demo (spec 009, RF-20), EL SISTEMA borra todos los PDF, también los que subieron los visitantes, y vuelve a cargar los dos de RF-42, dentro de la misma operación: si algo falla, la base queda como estaba. Al correr las fechas (spec 009, RF-22), se corren también las de subida de los PDF. Con el tope de RF-41, el restablecimiento sigue terminando en menos de un minuto (spec 009).

## Requisitos no funcionales
- Seguridad del archivo:
  - EL SISTEMA entrega el PDF siempre como un documento PDF para ver o descargar, nunca como una página del sistema, y le indica al navegador que no intente adivinar otro tipo. Así, un archivo que además de PDF es otra cosa (por ejemplo, uno que tiene escondida una página web con código) nunca se ejecuta como página: no puede ejecutar código dentro del panel ni del portal, ni usar la sesión de quien lo abre.
  - EL SISTEMA no analiza ni ejecuta el contenido del PDF más allá de buscar su marca de inicio (RF-3).
  - La dirección de un PDF no alcanza para abrirlo: hace falta una sesión con permiso para verlo (RF-33, RF-37, RF-38).
- Copias en el camino: entre el servidor y el navegador puede haber intermediarios que guardan copias de lo que pasa para entregarlo más rápido (el proxy del servidor, una red de distribución de contenidos, el proxy de una empresa). Las respuestas con un PDF se marcan como privadas y para no guardar: ni el navegador ni ningún intermediario guarda una copia para entregársela a otra persona.
- Validación: el servidor valida el archivo y todos los datos recibidos, y rechaza los campos desconocidos, sin confiar en las validaciones de la interfaz (como en las specs 001 a 005). La interfaz rechaza antes de enviar un archivo que no es PDF o que supera los 5 MB, con los mensajes de RF-4, para no hacer esperar la subida, pero el servidor vuelve a verificarlo.
- Registros del servidor: el contenido de los PDF, el nombre con el que se subieron y el tipo que informa el navegador nunca se escriben en los registros del servidor ni en los mensajes de error (RF-8). Los mensajes indican la regla incumplida, sin repetir nada del archivo.
- Aislamiento: la regla de RF-33 se aplica en el servidor en toda consulta de un cliente. Un cliente nunca recibe un PDF que no puede ver, ni el PDF de un fallo, ni un indicio de que existen (principio 5).
- Privacidad por defecto: ningún PDF de un movimiento es visible para el cliente sin una acción expresa de un integrante: hacer visible el movimiento, que nace oculto (spec 003).
- Persistencia: los PDF se guardan solo en la base de datos y solo se accede a ellos a través de la api (principio 5). El archivo elegido en un formulario vive solo en la memoria de la página mientras el formulario está abierto: nunca se guarda en el almacenamiento del navegador. Una copia que el usuario descarga queda en su dispositivo, fuera del sistema. Se acepta.
- Respaldo: "borrar" un PDF (RF-14) es quitarlo de la base. Puede seguir en copias de seguridad anteriores, y en los archivos internos de MySQL hasta que se reescriban, fuera del alcance del sistema. Las copias de seguridad las administra quien opera el servidor.
- Rendimiento, medido en el servidor, sin contar la conexión del usuario, con hasta 5 subidas o descargas al mismo tiempo:
  - Los listados (historial de movimientos, listado de jurisprudencia y movimientos del portal) mantienen los tiempos de sus specs (2 segundos con los volúmenes que fijan), aunque todos los movimientos o fallos tengan un PDF de 5 MB: los listados nunca cargan el contenido de los archivos, solo si tienen uno.
  - Al ver o descargar un PDF de 5 MB, el servidor empieza a enviarlo en menos de 2 segundos.
  - Una vez recibido un PDF de 5 MB, el servidor termina de guardar el formulario en menos de 3 segundos.
- Plataformas: ver y descargar funcionan en la computadora y en el celular. En un celular, "Ver PDF" puede descargar el archivo en lugar de mostrarlo, según el navegador. Se acepta.
- Accesibilidad: las opciones para elegir, ver, descargar y quitar un PDF se usan con el teclado y se anuncian con el dato que las identifica (RF-28).
- Fechas: las fechas de subida se registran y se muestran en hora de Buenos Aires (UTC−3), como en las specs anteriores.
- Stack: no se agrega ninguna dependencia sin justificarla en el plan, con su alternativa descartada (principio 1). Los cambios de la base se hacen con migraciones de TypeORM.
- Idioma: todos los mensajes y textos de la interfaz en español.

## Casos límite
- **Formato y tamaño:**
  - PDF firmado digitalmente: se acepta, y se descarga idéntico, con la firma válida. El sistema no verifica la firma (RF-5).
  - PDF con algunos bytes antes de la marca `%PDF-` (lo hacen ciertos programas): se acepta si la marca está dentro de los primeros 1.024 bytes (RF-3).
  - Archivo de Word, imagen o texto renombrado como ".pdf": se rechaza, porque no tiene la marca de un PDF (RF-3, RF-4).
  - PDF renombrado sin la extensión ".pdf": se acepta, porque lo que cuenta es el contenido (RF-3).
  - PDF de exactamente 5 MB (5.242.880 bytes): se acepta. Con un byte más, se rechaza, y el servidor deja de recibirlo en cuanto lo supera (RF-3, RF-4).
  - Archivo vacío: se rechaza (RF-4).
  - Escrito escaneado como imagen (JPG, PNG): se rechaza. Hay que convertirlo a PDF antes de subirlo (RF-3).
  - PDF dañado que tiene la marca de inicio: se acepta. El sistema no verifica que se pueda abrir. Se corrige reemplazándolo (RF-3, RF-13).
  - PDF protegido con contraseña: se acepta. Quien lo abre necesita esa contraseña, que el sistema no conoce. Se acepta por ahora.
  - PDF con formularios, enlaces o código propio: se acepta. Se abre en el visor del navegador, en una pestaña aislada, sin acceso a los datos del sistema (RF-28, requisitos no funcionales).
  - Archivo que es PDF y además esconde una página web: tiene la marca de inicio y se acepta, pero nunca se ejecuta como página (requisitos no funcionales).
  - Escaneo de más de 5 MB: se rechaza. Hay que comprimirlo o dividirlo, y como hay un solo PDF por movimiento, cargar el resto en otro movimiento (RF-1, RF-3).
  - Dos archivos elegidos a la vez: se rechaza (RF-4).
- **Nombre y tamaño:**
  - Archivo subido como "escrito <final> {v2}.pdf": nada de ese nombre se guarda, se muestra ni se registra (RF-8).
  - Movimiento de tipo "Resolución" o "Notificación": el archivo se llama "… Resolucion ….pdf" o "… Notificacion ….pdf" (RF-7).
  - Se cambia la fecha o el tipo del movimiento, o la fecha del fallo: el PDF se descarga con el nombre nuevo y el mismo código (RF-7).
  - Dos movimientos del mismo día y del mismo tipo, o dos fallos de la misma fecha: sus PDF se descargan con nombres distintos, por el código (RF-6, RF-7).
  - PDF de 300 bytes: se muestra "1 KB". PDF de 1.048.000 bytes: se muestra "1023 KB". PDF de 1.048.500 bytes: se muestra "1 MB" (RF-9).
- **Formulario:**
  - Movimiento con datos válidos y un PDF que se rechaza: no se guarda nada; el formulario conserva lo escrito y hay que elegir otro archivo (RF-11).
  - Archivo rechazado y "Guardar" sin elegir otro: no se envía nada y se avisa que el PDF no se adjuntó. Con "Descartar", se guarda el resto sin cambiar el PDF (RF-11).
  - Movimiento con un PDF válido y una descripción con `<`: no se guarda nada; el formulario conserva lo escrito y el archivo elegido (RF-11).
  - Formulario de un movimiento, con PDF o sin él: la única marca de visibilidad es la del movimiento (RF-15).
  - Pedido al servidor, armado a mano, que envía una visibilidad del PDF: se rechaza con "El campo pdfVisible no está permitido" y no se guarda nada (RF-15).
  - Subida interrumpida (se corta la conexión): no se guarda nada, ni el movimiento ni el PDF (RF-12).
  - Subida lenta desde el celular que dura más que la sesión sin uso: la sesión no vence mientras dura la subida (RF-12).
  - La sesión vence antes de guardar el formulario: el guardado se rechaza como cualquier acción sin sesión (spec 001, RF-17), y hay que volver a ingresar y elegir el archivo.
- **Reemplazo y quitado:**
  - Subir un PDF a un movimiento que ya tiene uno: al guardar se pide confirmación, y el anterior se borra definitivamente (RF-13, RF-14).
  - PDF de un movimiento visible reemplazado: el cliente ve el nuevo desde su siguiente acción. El aviso de RF-18 lo advierte (RF-16, RF-17).
  - Reemplazo por un PDF del mismo tamaño: el historial registra el cambio, con quién y cuándo, aunque en pantalla los valores anterior y nuevo se vean iguales (RF-21).
  - PDF quitado por error: no se puede recuperar desde el sistema. Hay que volver a subirlo (RF-14). Puede seguir en una copia de seguridad anterior (requisitos no funcionales).
  - PDF con datos que no debían estar: al quitarlo o reemplazarlo, desaparece de la base. Si el cliente ya lo había descargado, conserva su copia, que queda fuera del sistema. Se acepta (RF-14, RF-36).
- **Visibilidad para el cliente:**
  - Movimiento visible con PDF: el cliente ve los dos (RF-33).
  - Movimiento oculto con PDF: el cliente no ve ninguno de los dos (RF-33).
  - Movimiento con PDF que pasa a visible: el aviso de la spec 003 (RF-9) dice que el cliente también podrá ver el PDF (RF-18).
  - PDF adjuntado a un movimiento visible: el cliente lo ve desde su siguiente acción. El aviso de RF-18 lo advierte.
  - Movimiento que se quiere mostrar sin su documento (por ejemplo, una pericia con datos de terceros): no se le adjunta el PDF, o se lo adjunta a otro movimiento que queda oculto (RF-17).
  - Movimiento visible con PDF que se anula: el cliente deja de ver los dos a partir de su siguiente acción. Al restaurarlo, se pide confirmación con el aviso de RF-19 y el cliente vuelve a verlos (RF-19, RF-22, RF-33).
  - Causa desactivada y después reactivada: los clientes vinculados dejan de ver sus PDF y después vuelven a verlos (RF-23).
  - Cliente con la pantalla abierta cuando el movimiento se oculta o el PDF se quita: al elegir "Ver PDF" o "Descargar PDF", es llevado al portal con el mensaje "No existe ese PDF" (RF-37).
  - Cliente con la pantalla abierta cuando el PDF se reemplaza: recibe el PDF nuevo, porque se pide por su movimiento (RF-29). Se acepta.
  - Cliente que escribe la dirección del PDF de un movimiento oculto, de una causa ajena o de un fallo: es llevado al portal con el mensaje "No existe ese PDF", igual en todos los casos (RF-37).
  - Cliente que copia la dirección de un PDF y la abre después de cerrar sesión, o la comparte: lleva a la pantalla de ingreso, y después de ingresar no abre el PDF (RF-37).
  - Dos clientes vinculados a la misma causa: ven los mismos PDF. No hay visibilidad por cliente, como en la spec 003.
- **Movimientos y causas:**
  - Movimiento anulado con PDF: el PDF se conserva y los integrantes lo ven, pero no se puede reemplazar ni quitar hasta restaurar el movimiento (RF-22).
  - Movimiento cargado en la causa equivocada, con PDF: se anula y se carga de nuevo en la correcta, volviendo a subir el PDF (spec 003, RF-12). Si no se quiere conservar el del movimiento anulado, se restaura, se quita el PDF y se lo vuelve a anular. Mientras está restaurado, los clientes de la causa equivocada pueden volver a ver el movimiento y su PDF si eran visibles. Se acepta por ahora (RF-19, RF-22).
  - Causa desactivada: sus PDF se ven y se descargan desde el panel, pero no se pueden cambiar (RF-23).
  - Causa Archivada o Finalizada: sus PDF se gestionan como en cualquier causa activa (spec 003, RF-29).
- **Fallos:**
  - Fallo desactivado con PDF: el PDF se conserva y se ve, pero no se puede cambiar hasta reactivarlo (RF-26).
  - Fallo con PDF que dispara el aviso de repetido: al confirmar, se guarda con el archivo elegido, sin volver a elegirlo (RF-25).
  - Dos fallos con el mismo PDF: no hay aviso de repetido (RF-25).
  - Fallo con enlace a la fuente y PDF: se muestran los dos (spec 005, RF-19; RF-32).
- **Historial:**
  - PDF reemplazado varias veces: el historial de cambios del movimiento registra cada reemplazo, con quién y cuándo, y el tamaño de cada PDF, pero ninguno de los anteriores se puede abrir (RF-14, RF-21).
  - Quién dejó el PDF a la vista del cliente: se ve en el historial de cambios del movimiento, por quién lo hizo visible o le adjuntó el PDF siendo visible (RF-21; spec 003, RF-20).
  - Fallos: como en la spec 005, solo se registran la carga y la última modificación, así que no queda un historial de los PDF de un fallo (spec 005, fuera de alcance).
- **Concurrencia:**
  - Dos integrantes suben a la vez un PDF al mismo movimiento o fallo: queda el último y el primero se borra, sin que nadie haya confirmado ese borrado. En un movimiento, los dos quedan en el historial de cambios. Se acepta (RF-14, RF-21).
  - Un integrante guarda un formulario abierto antes de que otro reemplazara el PDF u ocultara el movimiento: puede volver a mostrar un movimiento recién ocultado, con su PDF. Se acepta por ahora; queda en el historial de cambios (RF-21).
  - Un integrante quita un PDF mientras otro lo descarga: la descarga en curso puede terminar o fallar. Después del quitado, nadie más lo recibe. Se acepta.
  - Un integrante anula el movimiento mientras otro guarda un formulario con un PDF: se resuelven de a una. Si la anulación queda primero, el guardado se rechaza y no se guarda nada (RF-11, RF-22).
- **Demo:**
  - La cliente de prueba entra a la causa del movimiento de muestra: ve y descarga su PDF (RF-42).
  - Con 4 PDF en la base, un visitante intenta subir otro: se rechaza. Si reemplaza uno, se permite (RF-41).
  - Dos visitantes suben a la vez el cuarto y el quinto PDF: se guarda uno solo (RF-41).
  - Un visitante sube un PDF ofensivo o con datos personales reales a un movimiento visible: los demás visitantes pueden verlo hasta el próximo restablecimiento. Se acepta, como los textos en la spec 009.
  - Un visitante quita los PDF de muestra: el restablecimiento los vuelve a cargar (RF-43).
  - El restablecimiento falla a mitad de camino: la base queda con los datos y los PDF que tenía antes (RF-43; spec 009, RF-20).
- **Accesos no permitidos:**
  - Visitante sin sesión que abre la dirección de un PDF: es llevado a la pantalla de ingreso (RF-37).
  - Integrante que abre la dirección de un movimiento sin PDF: es llevado al panel con el mensaje "No existe ese PDF" (RF-37).
  - Integrante con cambio de contraseña pendiente: no ve ni sube PDF hasta cambiarla (RF-38).
  - Copias descargadas en un equipo compartido: quedan en el dispositivo, fuera del sistema. Se acepta (RF-36).

## Fuera de alcance
- Más de un PDF por movimiento o por fallo.
- Otros formatos de archivo (Word, imágenes, audio, video).
- Archivos adjuntos a causas, partes, cuentas o modelos de escritos.
- Que los clientes suban archivos.
- PDF de los fallos para clientes o visitantes (spec 005, RF-36).
- Recuperar un PDF quitado o reemplazado, o guardar sus versiones anteriores.
- Verificar firmas digitales.
- Análisis de virus o de contenido malicioso de los archivos.
- Búsqueda dentro del texto de los PDF, vista previa en miniatura y cantidad de páginas.
- Comprimir, unir, dividir, convertir o reconocer el texto (OCR) de los archivos.
- Filtrar el historial de movimientos o el listado de jurisprudencia por "con PDF".
- Límite de espacio total o de cantidad de PDF fuera del modo demo.
- Límite de subidas o descargas simultáneas.
- Detección de formularios desactualizados o de ediciones simultáneas.
- Avisos al cliente cuando se le comparte un PDF.
- Descargar juntos todos los PDF de una causa.
- Guardar los archivos fuera de la base de datos (en carpetas del servidor o en servicios de almacenamiento).
- Visibilidad distinta del PDF para cada cliente de una misma causa.
- Una visibilidad del PDF distinta de la de su movimiento (RF-17).

## Criterios de finalización
- Todos los RF y todos los requisitos no funcionales con al menos un test en verde. Solo se verifican en la demo manual el visor del navegador y el comportamiento en un celular real.
- Tests que verifiquen, en la api:
  - Que se rechazan un archivo que no es PDF aunque tenga la extensión ".pdf", uno con la marca de inicio después del byte 1.024, uno vacío, uno de 5.242.881 bytes y dos archivos a la vez, y que se aceptan uno de 5.242.880 bytes, uno con bytes antes de la marca y un PDF firmado digitalmente. En todos los rechazos no se guarda nada (RF-3, RF-4, RF-11).
  - Que el servidor deja de recibir un archivo en cuanto supera los 5 MB, y que nunca lo escribe en archivos del servidor fuera de la base (RF-2, RF-4).
  - Que el PDF se entrega idéntico al que se subió, también uno firmado digitalmente, con el nombre de RF-7 (tipo sin tildes y código), y que el código es nuevo en cada PDF y no sirve para pedirlo (RF-5 a RF-7, RF-29).
  - Que nada del nombre original ni del tipo informado se guarda ni aparece en los registros del servidor (RF-8).
  - Que cargar o modificar un movimiento o un fallo con su PDF se guarda todo o nada, también si la subida se interrumpe (RF-10 a RF-12).
  - Que la sesión no vence durante una subida en curso (RF-12).
  - Que el cliente ve el PDF de un movimiento solo si ve el movimiento, también después de reemplazarlo (RF-16, RF-17).
  - Que reemplazar y quitar borran el PDF anterior de la base (RF-14).
  - Que se rechaza una visibilidad propia del PDF, con PDF o sin él (RF-15).
  - La regla de RF-33, con los casos de movimiento oculto, movimiento anulado, movimiento sin PDF, movimiento restaurado, cliente desvinculado, causa desactivada y causa reactivada (RF-23, RF-33).
  - Que cada caso de RF-37 lleva al lugar que corresponde, y que todos los casos sin permiso responden exactamente lo mismo.
  - Que ninguna respuesta del portal incluye quién subió el PDF, cuándo, su tamaño o su historial (RF-35), ni datos de los PDF de los fallos (RF-27).
  - Que un cliente no puede abrir el PDF de un fallo ni el de una causa ajena, y que un visitante y un integrante con cambio de contraseña pendiente no pueden abrir ni subir ninguno (RF-37, RF-38).
  - Que en un movimiento anulado, en una causa desactivada y en un fallo desactivado no se puede adjuntar, reemplazar ni quitar el PDF, pero sí verlo (RF-22, RF-23, RF-26).
  - Que adjuntar, reemplazar y quitar el PDF cuentan como modificación del movimiento o del fallo y quedan en el historial de cambios del movimiento con su código y su tamaño, sin su contenido (RF-20, RF-21, RF-24).
  - Que el aviso de fallo repetido no tiene en cuenta el PDF (RF-25).
  - Que las respuestas con un PDF indican su tipo, piden al navegador no adivinar otro y se marcan como privadas y para no guardar, en el panel y en el portal (RF-36, requisitos no funcionales).
  - Que los listados no cargan el contenido de los PDF y cumplen sus tiempos con todos los movimientos o fallos con un PDF de 5 MB, y los tiempos de ver, descargar y guardar un PDF de 5 MB con 5 operaciones a la vez (requisitos no funcionales).
  - Que el contenido de los PDF no aparece en los registros del servidor ni en los mensajes de error.
  - El tope de 4 PDF en el modo demo, que un reemplazo no suma, que se respeta con dos subidas a la vez y que no existe con el modo demo apagado (RF-41).
  - Que el restablecimiento de la demo borra los PDF de los visitantes, vuelve a cargar los dos de muestra, corre sus fechas, termina en menos de un minuto y, si falla, deja la base como estaba (RF-42, RF-43).
- Tests que verifiquen, en la web:
  - El formato del tamaño en KB y MB, sin decimales (RF-9).
  - Que la interfaz rechaza un archivo que no es PDF o que supera los 5 MB antes de enviarlo, con los mensajes de RF-4.
  - Que el formulario conserva lo escrito y, según el caso, el archivo elegido después de un rechazo o una interrupción (RF-11, RF-12).
  - Que no se puede enviar el formulario dos veces mientras sube (RF-12).
  - Las confirmaciones de reemplazo y de quitado, y que sin confirmar no se guarda nada (RF-13).
  - Que el formulario no ofrece una visibilidad propia del PDF y no la envía (RF-15).
  - Cada aviso de RF-18 y su orden con el de la spec 003 (RF-13), y el aviso con confirmación al restaurar (RF-19).
  - Que el portal solo muestra la leyenda y las opciones del PDF en los movimientos cuyo PDF el cliente puede ver, y nunca el tamaño (RF-34, RF-35).
  - Que "Ver PDF" abre una pestaña nueva aislada y que cada opción se anuncia con su dato (RF-28).
  - Las leyendas "PDF" del historial de movimientos y del listado de jurisprudencia, y los datos del PDF en la consulta de un movimiento y de un fallo (RF-30 a RF-32).
  - Que el archivo elegido no se guarda en el almacenamiento del navegador (requisitos no funcionales).
- `pnpm test` y `pnpm lint` sin errores.
- Demo manual:
  1. Con un abogado, cargar un movimiento oculto con un PDF firmado digitalmente y verificar que el cliente no ve ninguno de los dos. Descargarlo y verificar que la firma sigue válida. Verificar que se rechazan una imagen renombrada como ".pdf", un archivo vacío y un PDF de más de 5 MB, y que en esos casos el formulario conserva lo escrito.
  2. Abrir el movimiento y verificar el tamaño, quién lo subió y cuándo. Ver el PDF en una pestaña nueva y descargarlo, y verificar su nombre (por ejemplo, "2026-10-24 Resolucion K7Q2MX.pdf").
  3. Marcar el movimiento como visible, verificar el aviso de RF-18 y que el cliente ve el movimiento y descarga el PDF, también desde un celular.
  4. Reemplazar el PDF, verificar la confirmación y el aviso de RF-18, y que el cliente descarga el nuevo. Ocultar el movimiento y verificar que el cliente, con la pantalla abierta, es llevado al portal con "No existe ese PDF".
  5. Quitar el PDF, verificar la confirmación y que el historial de cambios del movimiento registra la subida, el reemplazo y el quitado, con quién y cuándo.
  6. Anular el movimiento visible con PDF y verificar que el cliente deja de verlo, que el integrante lo sigue viendo y que no se puede reemplazar. Restaurarlo, verificar el aviso con confirmación y que el cliente lo vuelve a ver.
  7. Con un administrador, adjuntar un PDF a un fallo, verificar la leyenda "PDF" en el listado, verlo y descargarlo con el nombre "Fallo aaaa-mm-dd código.pdf". Desactivar el fallo y verificar que no se puede cambiar el PDF, pero sí verlo.
  8. Ingresar como cliente y escribir la dirección del PDF de un fallo y la de un movimiento de otra causa: debe llevar al portal con "No existe ese PDF". Cerrar sesión y abrir la dirección de un PDF que sí veía: debe llevar a la pantalla de ingreso y, después de ingresar, al portal, sin abrir el PDF.
  9. Con el modo demo encendido, verificar que la cliente de prueba ve el PDF de muestra. Subir PDF hasta llegar a 4 y verificar que el quinto se rechaza y que un reemplazo se permite. Ejecutar el restablecimiento y verificar que quedan solo los dos de muestra.

## Dudas abiertas
Ninguna.
