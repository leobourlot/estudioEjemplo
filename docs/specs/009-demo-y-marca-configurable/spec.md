# Spec 009 — Demo y marca configurable

## Contexto y objetivo
Este sistema nació para un estudio en particular, y su identidad está repartida por todo el código: el nombre, las integrantes, los datos de contacto, los colores, la tipografía, el logo y los textos aparecen en una decena de archivos y en unos 50 tests. Ahora el mismo sistema se va a mostrar a otros estudios, como una demo que pueden recorrer por su cuenta, y más adelante se va a adaptar a cada estudio que lo contrate. Esta spec hace tres cosas: reúne todo lo que identifica al estudio en un único archivo de marca, de modo que cambiar de estudio sea editar ese archivo y reemplazar las imágenes de una carpeta; hace que los tests lean lo esperado de ese archivo, para que cambiar la marca no rompa ninguno; y agrega un modo demo, apagado por defecto, con las credenciales de prueba a la vista en la pantalla de ingreso, las cuentas de prueba protegidas, los datos de muestra restablecidos todos los días y las páginas fuera de los buscadores. Con el modo demo apagado, el sistema funciona exactamente como lo definen las specs 001 a 008. La marca que se carga es ficticia (anexo A): ningún nombre, teléfono, email, foto, dirección ni texto personal del estudio para el que se hizo el sistema queda en el código.

## Usuarios / actores
- **Quien adapta el sistema** a un estudio (Bourder Web): edita el archivo de marca, reemplaza las imágenes y publica.
- **Posible cliente que prueba la demo**: un abogado o una abogada que recorre el sitio público y entra al panel y al portal con las cuentas de prueba, muchas veces sin que nadie le explique nada.
- **Visitante de la demo** (spec 001): cualquier persona que llega al sitio de la demo.
- **Quien opera la demo**: configura el restablecimiento diario en el servidor y puede correrlo a mano.

## Historias de usuario
- H1: Como quien adapta el sistema quiero cambiar de estudio editando un solo archivo y reemplazando las imágenes de una carpeta, para no buscar datos repartidos por el código.
- H2: Como quien adapta el sistema quiero que los tests sigan en verde después de cambiar la marca, para saber que el cambio no rompió nada.
- H3: Como quien adapta el sistema quiero que un test me avise si alguien escribió un dato de la marca fuera del archivo de marca, para que el archivo siga siendo la única fuente.
- H4: Como posible cliente quiero ver en la pantalla de ingreso con qué cuentas probar y completar el formulario con un botón, para entrar sin pedirle nada a nadie.
- H5: Como posible cliente quiero encontrar la demo siempre en orden, con datos recientes y las cuentas de prueba funcionando, aunque otros la hayan usado antes.
- H6: Como quien opera la demo quiero que los datos se restablezcan solos una vez por día y que el restablecimiento nunca pueda borrar otra base, para no tener que vigilarla.
- H7: Como quien adapta el sistema quiero que la demo no aparezca en los buscadores, para que nadie la confunda con un estudio real.
- H8: Como quien adapta el sistema quiero que, con el modo demo apagado, no quede nada de la demo a la vista, para usar el mismo código con un estudio real.

## Requisitos funcionales (criterios de aceptación en EARS)

### La marca en un único archivo
- RF-1: EL SISTEMA toma de un único archivo de marca todo lo que identifica al estudio:
  - El nombre completo y el nombre en dos líneas (spec 007, RF-3).
  - Las integrantes, en orden (RF-5).
  - Los textos del equipo: el nombre de la sección en el menú, su título, el acceso para volver a ella y la palabra de sus direcciones (RF-6).
  - Los WhatsApp, los emails, la dirección, los días y horarios de atención y las redes (spec 007, RF-22).
  - Los colores oscuro, claro y blanco, y la tipografía de los títulos (RF-8).
  - Las rutas del logo, del favicon, de la imagen para compartir, de las fotos y de los archivos de la tipografía (RF-3).
  - Los textos de la apertura, de los servicios y de sus pestañas, los mensajes de WhatsApp de cada página y la línea de derechos del pie de página (spec 007, T-1 a T-12, T-15 y T-18).
- RF-2: EL SISTEMA usa los datos del archivo de marca en todos los lugares donde aparece el estudio: el sitio público, la pantalla de ingreso, la de cambio de contraseña, el portal, el panel, el título y la descripción de cada página (spec 007, T-16), la vista previa al compartir, los datos para buscadores, la página que carga la aplicación, el favicon y los colores y la tipografía de toda la interfaz. Ningún otro archivo del código repite un dato de la marca (RF-13).
- RF-3: EL SISTEMA guarda las imágenes de la marca (logo, favicon, imagen para compartir y fotos de las integrantes) y los archivos de la tipografía en una única carpeta. Cambiar de estudio consiste en editar el archivo de marca y reemplazar los archivos de esa carpeta: no exige tocar ningún otro archivo del código.
- RF-4: EL SISTEMA mantiene en el archivo de marca solo datos públicos y fijos del estudio (constitución, principio 5). El archivo no depende de la interfaz (principio 3) y nunca contiene contraseñas, claves, credenciales ni datos de causas, clientes o cuentas.

### Integrantes y textos del equipo
- RF-5: EL SISTEMA toma del archivo de marca, por cada integrante: el nombre completo, la palabra de su dirección (spec 007, RF-8), si es abogada o abogado, su título profesional (spec 007, T-21), la foto, el resumen y el texto completo. A partir de eso arma, sin escribirlo en otro lado:
  - El tratamiento: "Dra." para una abogada y "Dr." para un abogado, en todos los lugares donde la spec 007 (RF-46) pide "Dra." adelante.
  - El texto alternativo de la foto: "Foto de la Dra. …" o "Foto del Dr. …" (spec 007, RF-21).
  - El nombre de "Más información" para el lector de pantalla: "Más información sobre la Dra. …" o "Más información sobre el Dr. …" (spec 007, RF-46).
  - Las iniciales, el título de su página y su descripción, como hoy (spec 007, RF-21 y T-16).
- RF-6: EL SISTEMA toma del archivo de marca el nombre de la sección del equipo en el menú y en el pie (hoy "Abogadas"), su título (hoy "Equipo de abogadas"), el acceso para volver a ella (hoy "Volver a abogadas") y la palabra de sus direcciones (hoy `abogadas`: `/#abogadas`, `/abogadas` y `/abogadas/<integrante>`). Las direcciones siguen las reglas de la spec 007 (RF-8): en minúsculas, sin tildes y con guiones.

### Contacto
- RF-7: EL SISTEMA muestra cada WhatsApp y cada email con el nombre que indica el archivo de marca, que puede ser el de una integrante o el del estudio (spec 007, RF-22). SI el archivo de marca tiene un solo WhatsApp, ENTONCES el botón de WhatsApp abre directamente la conversación, con el mensaje de la página (spec 007, RF-27), sin el menú de opciones de la spec 007 (RF-26). Con dos o más, el botón abre el menú como hoy. En los dos casos, el botón conserva su nombre para el lector de pantalla y su ubicación, y los enlaces del bloque de contacto, del pie y de la pantalla de ingreso siguen como hoy.

### Colores y tipografía
- RF-8: EL SISTEMA toma del archivo de marca los tres colores del estudio (oscuro, claro y blanco) y la tipografía de los títulos (su nombre, sus archivos y la de reemplazo mientras carga). Todos los usos de esos colores y de esa tipografía en la interfaz, en los íconos que llevan el blanco del estudio y en la cabecera de las páginas salen de ahí. Los tonos suaves de las specs 007 y 008 (fondos y tarjetas) se siguen derivando de esos colores. Los colores propios de las marcas de otras empresas (WhatsApp, Google Maps y las redes, spec 007, RF-23) no son de la marca del estudio y no cambian.
- RF-9: SI el blanco del estudio contrasta menos de 4,5 a 1 con el oscuro o con el claro, ENTONCES los tests fallan e indican qué par de colores no alcanza, para que una marca nueva no rompa la accesibilidad de las specs 007 y 008.

### Textos del sitio
- RF-10: EL SISTEMA arma el título de cada página y de cada pantalla con el nombre del estudio del archivo de marca, como indica la spec 007 (T-16), y la línea de derechos del pie con el nombre del estudio y el año en que se publicó el sitio (spec 007, T-18). La leyenda "Diseñado por" y el enlace a Bourder Web no son de la marca del estudio y no cambian.
- RF-11: EL SISTEMA conserva la estructura del sitio público de la spec 007: cuatro servicios, Derecho Laboral con las pestañas "Empresas" y "Trabajadores", y las mismas direcciones de los servicios. El archivo de marca cambia sus textos, no su cantidad ni sus direcciones.

### Marca de ejemplo
- RF-12: EL SISTEMA trae cargada la marca de ejemplo del anexo A, ficticia. Ningún archivo del código, de las imágenes publicadas, de los datos de muestra ni de los tests contiene el nombre, los apellidos, los teléfonos, los emails, la dirección, las redes, los colores, el logo, las fotos ni los textos personales (resúmenes y textos completos de las integrantes) del estudio para el que se hizo el sistema. Las specs 001 a 008 no se reescriben: quedan como historia.

### Tests sin datos de la marca escritos a mano
- RF-13: EL SISTEMA tiene un test que lee el archivo de marca y falla SI el nombre completo del estudio, la primera línea del nombre, un número de WhatsApp (en cualquiera de sus dos formas, la que se muestra y la del enlace), un email o uno de los tres colores (sin distinguir mayúsculas de minúsculas) aparece escrito en otro archivo del código del sitio, de sus scripts, de la página base o del código de la api. El aviso indica el archivo y el dato encontrado. El archivo de marca es el único exceptuado.
- RF-14: EL SISTEMA tiene tests que, para verificar un dato de la marca, toman el valor esperado del archivo de marca: con otra marca válida en ese archivo, todos los tests siguen en verde sin cambiar ninguno. Los tests que usaban los apellidos del estudio original solo como nombres de personas de prueba (por ejemplo, un administrador "Ana Sabalette" en un test de la api) pasan a usar nombres ficticios que no son de la marca.

### Modo demo
- RF-15: EL SISTEMA tiene un modo demo, apagado por defecto, que solo se enciende de forma explícita en la configuración de cada publicación (el plan decide cómo). MIENTRAS el modo demo está apagado, EL SISTEMA no muestra las cuentas de prueba, no protege ninguna cuenta, no restablece ningún dato y entrega las páginas y los archivos para buscadores como indica la spec 007: se comporta como lo definen las specs 001 a 008.

### Cuentas de prueba en la pantalla de ingreso
- RF-16: MIENTRAS el modo demo está encendido, EL SISTEMA muestra en la pantalla de ingreso, dentro de la tarjeta y debajo del texto T-3 de la spec 008, el recuadro "Cuentas de prueba" (anexo B) con tres cuentas de los datos de muestra, en este orden: la administradora, el abogado y la cliente. Cada una muestra su rol, su nombre, su DNI y la contraseña, y el botón "Usar esta cuenta".
- RF-17: CUANDO alguien elige "Usar esta cuenta", EL SISTEMA completa los campos "DNI o CUIT" y "Contraseña" con los de esa cuenta, reemplazando lo que hubiera escrito, borra el aviso de error si lo había y deja el foco en "Ingresar". No ingresa por su cuenta: el ingreso sigue siendo el de la spec 001, con sus mensajes y su límite de intentos.
- RF-18: EL SISTEMA muestra en el recuadro de RF-16 exactamente las mismas tres cuentas que protege RF-19, con los datos con los que se cargan en los datos de muestra, de modo que el recuadro nunca muestra una cuenta que no existe o que no ingresa.

### Cuentas de prueba protegidas
- RF-19: MIENTRAS el modo demo está encendido, SI alguien intenta, sobre una de las tres cuentas de prueba, cambiar su contraseña (también la propia, spec 001, RF-36 a RF-39), restablecerla, desactivarla, o modificar cualquiera de sus datos, ENTONCES EL SISTEMA lo rechaza con el mensaje del anexo B y no cambia nada. El rechazo lo hace el servidor, no solo la pantalla. Las demás cuentas, las de los datos de muestra y las que creen los visitantes, se usan, se modifican y se desactivan como siempre.

### Restablecimiento diario de los datos de muestra
- RF-20: CUANDO quien opera la demo, o la tarea programada del servidor, ejecuta el comando de restablecimiento, EL SISTEMA vacía todas las tablas de datos y vuelve a cargar los datos de muestra, con las fechas corridas (RF-22). La estructura de la base y el registro de migraciones no se tocan. SI algo falla en el medio, ENTONCES la base no queda a medias: queda con los datos que tenía antes, y el comando termina con error y un mensaje.
- RF-21: SI el modo demo está apagado, o la base no está identificada como la base de la demo, ENTONCES EL SISTEMA no ejecuta el restablecimiento: no borra ni carga nada, muestra el mensaje del anexo B y termina con error. La base de los tests e2e nunca está identificada como la de la demo, y los tests no pueden identificarla así. El restablecimiento solo se ejecuta desde la consola del servidor: no tiene ninguna dirección en la api.
- RF-22: CUANDO EL SISTEMA carga los datos de muestra en un restablecimiento, corre todas sus fechas y horas la misma cantidad de días, la que separa la fecha de referencia de los datos de muestra (24/10/2026, la fecha más reciente que tienen: el último ingreso de una cuenta; corregido el 03/11/2026, decía "la del movimiento más reciente") del día del restablecimiento, en la hora de Argentina. Así se conservan los intervalos entre fechas, la hora del día y el orden, y una fecha que era futura sigue siéndolo. Se corren las fechas de causas, partes, movimientos y su historial, cuentas (alta, modificación y último ingreso) y modelos de escritos, y las de alta y modificación de los fallos. La fecha de cada fallo no se corre: es la de un fallo real.
- RF-23: EL SISTEMA cierra todas las sesiones abiertas al restablecer los datos: quien estaba usando la demo vuelve a la pantalla de ingreso en su próxima acción (spec 001, RF-17), y las cuentas de prueba ingresan con la contraseña de los datos de muestra sin que se les pida cambiarla.
- RF-24: EL SISTEMA ejecuta el restablecimiento una vez por día, a las 4:00 de Argentina, con una tarea programada del servidor de la demo. El README explica cómo configurarla.

### Fuera de los buscadores
- RF-25: MIENTRAS el modo demo está encendido, EL SISTEMA:
  - Incluye en todas las páginas, públicas o no (también la de dirección inexistente y la que carga la aplicación), la indicación para que los buscadores no las listen.
  - Responde a la indicación general para buscadores que no recorran ninguna dirección del sitio.
  - No genera la lista de direcciones para buscadores, ni la menciona.

  Con el modo demo apagado, las páginas y esos archivos siguen la spec 007 (RF-37 y RF-38).

## Requisitos no funcionales
- Seguridad:
  - La protección de las cuentas de prueba (RF-19) la aplica el servidor, para cualquier pedido, aunque no venga de la pantalla.
  - El restablecimiento (RF-20, RF-21) solo existe como comando de consola, nunca como dirección de la api, y nunca se conecta a una base que no esté identificada como la de la demo.
  - Los tests no se conectan a la base de producción ni a la de la demo, y no tocan los archivos `.env`.
  - Con el modo demo apagado, el código publicado no muestra las credenciales de prueba.
- Rendimiento: el restablecimiento termina en menos de un minuto con los datos de muestra actuales.
- Accesibilidad: el recuadro de cuentas de prueba se usa con el teclado y cada botón "Usar esta cuenta" se anuncia con el rol y el nombre de su cuenta ("Usar la cuenta de la administradora Carolina Ferreyra"), para que no se lean todos iguales. En un celular de 360 × 640 px, el formulario de ingreso se sigue viendo sin desplazarse (spec 008, RF-12): el recuadro va debajo y se alcanza desplazando.
- Persistencia: el recuadro de cuentas de prueba no guarda nada en el navegador (principio 5).
- Stack: no se agrega ninguna dependencia. Si el plan necesitara una, la justifica con su alternativa descartada (principio 1). Si la base necesita un cambio para identificar la base de la demo, se hace con una migración de TypeORM.
- Idioma: todos los textos y mensajes en español.

## Casos límite
- **Marca:**
  - Archivo de marca con una sola integrante, o con una sin resumen o sin texto: se aplica la spec 007 (RF-20).
  - Integrante sin foto: se ven sus iniciales (spec 007, RF-21). Es el caso de la marca de ejemplo.
  - Marca sin dirección, sin horarios, sin emails o sin redes: no se muestran, como indica la spec 007 (RF-24).
  - Marca con un solo WhatsApp: el botón abre la conversación directamente (RF-7). Con dos o más, el menú.
  - Nombre del equipo con otra palabra (por ejemplo, "Equipo"): cambian el menú, el título, el acceso para volver y las direcciones, y las direcciones viejas muestran "No encontramos esa página" (spec 007, RF-9).
  - Colores nuevos con poco contraste con el blanco: los tests fallan (RF-9).
  - Alguien escribe a mano el nombre del estudio o un teléfono en un componente: el test de RF-13 falla y dice dónde.
  - Un texto de la interfaz que no es de la marca contiene la segunda línea del nombre (por ejemplo, "Abogados"): no cuenta como dato repetido, porque RF-13 no revisa la segunda línea sola.
- **Cuentas de prueba:**
  - El visitante elige "Usar esta cuenta" con algo escrito en los campos: se reemplaza (RF-17).
  - El visitante elige una cuenta y cambia la contraseña escrita antes de ingresar: el ingreso falla con el mensaje de la spec 001.
  - Muchos visitantes ingresan con la misma cuenta a la vez: se aplica la spec 001 (una sesión por cuenta), así que el ingreso de uno cierra la sesión del otro. Se acepta.
  - Varios intentos fallidos sobre una cuenta de prueba bloquean el ingreso por un rato (spec 001): se acepta, y el bloqueo vence solo.
  - La administradora de prueba intenta desactivar al abogado de prueba, cambiarle la contraseña o el DNI: se rechaza (RF-19).
  - Un visitante crea una cuenta nueva, le cambia la contraseña o la desactiva: se permite, y el restablecimiento la borra (RF-19, RF-20).
  - Un visitante desactiva a Sofía Lucero, que no figura en el recuadro: se permite, y el restablecimiento la vuelve a activar.
  - La cliente de prueba entra a "Mi cuenta" o a "Cambiar contraseña": ve sus datos; si intenta cambiar la contraseña, recibe el mensaje del anexo B (RF-19).
- **Restablecimiento:**
  - Un visitante cargó contenido ofensivo o datos personales reales: quedan a la vista hasta el próximo restablecimiento. Se acepta; los campos siguen sin aceptar caracteres que permitan inyectar código (spec 005, RF-3).
  - El restablecimiento corre dos veces el mismo día: el resultado es el mismo.
  - El servidor estuvo apagado a la hora del restablecimiento: los datos quedan como estaban hasta el día siguiente o hasta correrlo a mano.
  - La tarea programada corre con el modo demo apagado o contra otra base: no hace nada y termina con error (RF-21).
  - Alguien ingresa mientras corre el restablecimiento: puede ver un error o salir de la sesión; al volver a ingresar, encuentra los datos restablecidos.
  - Movimiento de muestra con fecha futura: sigue siendo futuro después de correr las fechas (RF-22).
  - El restablecimiento cae en un cambio de mes o de año: las fechas se corren por días, sin errores de calendario (RF-22).
  - No hay un administrador principal después de vaciar la base: los datos de muestra hacen principal a Carolina Ferreyra, como ya indican.
- **Buscadores:**
  - Con el modo demo encendido, alguien comparte la dirección de la demo: la vista previa sigue mostrando el título, la descripción y la imagen (spec 007, RF-36). Solo cambia que los buscadores no la listan.
  - El mismo código se publica para un estudio real con el modo demo apagado: los buscadores reciben la lista de direcciones y las indicaciones de la spec 007.

## Fuera de alcance
- Editar la marca desde el panel o desde un formulario.
- Varios estudios en una misma publicación, o elegir la marca al entrar.
- Cambiar la cantidad de servicios, de pestañas o sus direcciones (RF-11).
- Un aviso de "sitio de demostración" en el sitio público.
- Restablecer los datos desde la interfaz, o en otro horario que el de RF-24 (salvo a mano, desde la consola).
- Cambiar el contenido de los datos de muestra, salvo correr sus fechas (RF-22) y quitar del encabezado los datos del estudio original (RF-12).
- Fotos de las integrantes de la marca de ejemplo.
- Reescribir las specs 001 a 008.

## Criterios de finalización
- Todos los RF con al menos un test en verde, salvo lo que solo se puede ver (colores, tipografía y logo), que se verifica en la demo manual, y la tarea programada del servidor (RF-24), que se verifica al publicar.
- Tests que verifiquen:
  - Que el sitio público, el ingreso, el portal, el panel, los títulos, la cabecera de las páginas y los datos para buscadores toman el nombre, las integrantes, el contacto y los textos del archivo de marca (RF-1, RF-2, RF-5, RF-6, RF-10).
  - El tratamiento, el texto alternativo y "Más información" de una abogada y de un abogado (RF-5).
  - Las direcciones del equipo armadas con la palabra del archivo de marca (RF-6).
  - El botón de WhatsApp con un solo número y con dos (RF-7).
  - El contraste del blanco con los dos colores (RF-9).
  - El test de RF-13, que falla con un dato de la marca escrito en otro archivo y pasa sin él.
  - Que con el modo demo apagado no hay recuadro de cuentas, no hay protección, el restablecimiento se rechaza y los archivos para buscadores son los de la spec 007 (RF-15, RF-21, RF-25).
  - El recuadro de cuentas de prueba, "Usar esta cuenta", el foco y que no ingresa solo (RF-16, RF-17), y que sus cuentas son las mismas que se protegen (RF-18).
  - Que la api rechaza el cambio de contraseña, el restablecimiento, la desactivación y la edición de las cuentas de prueba, y permite todo sobre las demás (RF-19).
  - Que el restablecimiento vacía y recarga los datos, cierra las sesiones y deja ingresar a las cuentas de prueba; que se niega con el modo demo apagado o en una base que no es la de la demo; y que si falla deja la base como estaba (RF-20, RF-21, RF-23).
  - Que las fechas se corren la cantidad de días correcta, también en un cambio de mes y de año, y que la fecha de los fallos no cambia (RF-22).
  - Que con el modo demo encendido todas las páginas llevan la indicación para no listarlas, la indicación general rechaza todo y no hay lista de direcciones (RF-25).
  - Que siguen en verde los tests de las specs 001 a 008, leyendo de la marca lo que es de la marca (RF-14).
- Una búsqueda en todo el proyecto, salvo las specs 001 a 008, no encuentra el nombre, los apellidos, los teléfonos, los emails, la dirección, las redes ni los colores del estudio original (RF-12).
- `pnpm test` y `pnpm lint` sin errores.
- README actualizado: el nombre del proyecto, la spec 009 en la hoja de ruta, cómo cambiar de marca, cómo encender el modo demo y cómo configurar la tarea programada en Easypanel. El nombre del proyecto actualizado en AGENTS.md y en la constitución.
- Demo manual:
  1. Con el modo demo apagado, recorrer el sitio público, el ingreso, el portal y el panel, y verificar la marca de ejemplo: el nombre en dos líneas, el logo, los colores, la tipografía, las tres integrantes con sus iniciales y su tratamiento, y el WhatsApp y el email del anexo A. Verificar que el ingreso no muestra cuentas de prueba.
  2. Con el modo demo encendido, en el ingreso, elegir "Usar esta cuenta" en cada una de las tres cuentas e ingresar.
  3. Como administradora de prueba, intentar cambiar la contraseña propia y desactivar al abogado de prueba, y verificar el mensaje. Crear una cuenta nueva y desactivarla.
  4. Correr el restablecimiento a mano y verificar que la cuenta creada desapareció, que la sesión se cerró y que las fechas de los movimientos quedaron al día.
  5. Correr el restablecimiento con el modo demo apagado y verificar que no hace nada.
  6. Verificar en el sitio construido con el modo demo encendido la indicación de no listar en cada página, la indicación general para buscadores y que no hay lista de direcciones.
  7. Cambiar el archivo de marca por otra marca de prueba, correr los tests y verificar que siguen en verde. Volver a la marca de ejemplo.

## Dudas abiertas
Ninguna. Resueltas el 03/11/2026:
- Las integrantes del sitio público son las mismas personas de los datos de muestra (Carolina Ferreyra, Julián Ibarra y Sofía Lucero), sin fotos.
- Nombre, colores y tipografía: "Lucero | Ibarra - Abogados", gris pizarra y azul acero, y Cormorant Garamond (anexo A).
- Un único WhatsApp y un único email, los de Bourder Web, con el nombre del estudio de ejemplo (anexo A).
- Las tres cuentas de prueba se protegen (RF-19).
- Las fechas de los datos de muestra se corren al día del restablecimiento, salvo la de los fallos (RF-22).
- El restablecimiento corre a las 4:00 de Argentina (RF-24).

## Anexo A — Marca de ejemplo
Ficticia. Las integrantes son personas inventadas de los datos de muestra; el WhatsApp y el email son los de Bourder Web, para que quien prueba la demo y escribe le llegue a quien la mostró. Los textos de la apertura, de los servicios, de las pestañas y de los mensajes de WhatsApp son los de la spec 007 (T-1 a T-12 y T-15), que no identifican al estudio.

### Nombre
- Completo: "Lucero | Ibarra - Abogados"
- En dos líneas: "Lucero | Ibarra" y "Abogados"
- Logo: un monograma "LI" en los colores de la marca, sin texto ni imágenes de terceros. Con el mismo dibujo se arman el favicon y la imagen para compartir.

### Colores y tipografía
- Oscuro: #22303C (gris pizarra)
- Claro: #3E5C76 (azul acero)
- Blanco: #FAFCFD
- Títulos: Cormorant Garamond, con Georgia mientras carga.

### Equipo
- En el menú y en el pie: "Abogados"
- Título de la sección: "Equipo de abogados"
- Volver: "Volver a abogados"
- Palabra de las direcciones: `abogados` (`/#abogados`, `/abogados`, `/abogados/sofia-lucero`)

### Contacto
- WhatsApp: "Lucero | Ibarra", +54 9 345 401-7104
- Email: "Lucero | Ibarra", contacto@bourderweb.com.ar
- Dirección: "Córdoba 1452, piso 3, Rosario"
- Días y horarios: "Lunes a viernes, de 9 a 13 h y de 16 a 19 h"
- Redes: Instagram, "@luceroibarra.abogados", y LinkedIn, "Lucero | Ibarra Abogados". Como las cuentas son ficticias, los enlaces llevan a la página principal de cada red (https://www.instagram.com/ y https://www.linkedin.com/), como las redes de muestra de la spec 007 (RF-24).

### Pie de página
- Derechos: "© <año> - Lucero | Ibarra - Abogados. Todos los derechos reservados."

### Integrantes, en este orden
1. **Sofía Lucero**, abogada. Dirección: `sofia-lucero`.
   - Título profesional: "Abogada | Especialista en Derecho Laboral"
   - Resumen:
     > Me dedico al Derecho Laboral desde que me recibí. Escucho primero, explico con claridad y busco, con cada persona, la salida más conveniente para su caso.
   - Texto completo:
     > Me recibí de abogada en la Universidad Nacional de Rosario y desde el comienzo orienté mi práctica al Derecho Laboral, tanto del lado de los trabajadores como del de las empresas.
     >
     > Me especialicé en relaciones laborales y sigo formándome, porque las normas y los criterios de los tribunales cambian todo el tiempo.
     >
     > Creo que la mayoría de los conflictos laborales se resuelven mejor si se encaran a tiempo. Por eso le doy mucha importancia a la consulta preventiva y a un intercambio telegráfico bien hecho.
     >
     > Me dedico al Derecho Laboral desde que me recibí. Escucho primero, explico con claridad y busco, con cada persona, la salida más conveniente para su caso.
2. **Julián Ibarra**, abogado. Dirección: `julian-ibarra`.
   - Título profesional: "Abogado | Mediador | Especialista en Derecho de Daños"
   - Resumen:
     > Acompaño a quienes sufrieron un accidente o un daño para que obtengan una reparación completa. Prefiero un buen acuerdo a un juicio largo, pero cuando hace falta litigar, lo hago a fondo.
   - Texto completo:
     > Soy abogado y mediador. Desde hace más de diez años me dedico a los reclamos por accidentes de tránsito, accidentes de trabajo y daños personales y patrimoniales.
     >
     > Acompaño a quienes sufrieron un accidente o un daño para que obtengan una reparación completa, frente a la persona responsable o frente a su compañía de seguros.
     >
     > Mi formación como mediador me enseñó que muchas veces la mejor solución se alcanza en una negociación. Prefiero un buen acuerdo a un juicio largo, pero cuando hace falta litigar, lo hago a fondo.
3. **Carolina Ferreyra**, abogada. Dirección: `carolina-ferreyra`.
   - Título profesional: "Abogada | Especialista en Sucesiones"
   - Resumen:
     > Ayudo a las familias a resolver una sucesión con el menor desgaste posible. Quiero que cada heredero entienda el trámite y que los acuerdos lleguen antes que los conflictos.
   - Texto completo:
     > Me recibí de abogada en la Universidad Nacional de Rosario y me especialicé en Derecho de Familia y Sucesiones.
     >
     > Una sucesión llega casi siempre en un momento difícil. Ayudo a las familias a resolverla con el menor desgaste posible, desde la declaratoria de herederos hasta la inscripción de los bienes.
     >
     > Quiero que cada heredero entienda el trámite y que los acuerdos lleguen antes que los conflictos. Cuando hay diferencias, busco primero el diálogo; si no alcanza, defiendo los derechos de mis clientes en el juzgado.

## Anexo B — Textos de la demo

### Recuadro de cuentas de prueba (RF-16)
- Título: "Cuentas de prueba"
- Texto: "Esta es una demo con datos ficticios. Probala con cualquiera de estas cuentas: todos los días, a las 4 de la mañana, los datos vuelven a como estaban."
- Etiquetas: "DNI", "Contraseña"
- Botón: "Usar esta cuenta". Para el lector de pantalla: "Usar la cuenta de la administradora Carolina Ferreyra", "Usar la cuenta del abogado Julián Ibarra" y "Usar la cuenta de la cliente María Elena Gómez".
- Cuentas, de los datos de muestra, todas con la contraseña Muestra2026:
  - "Administradora": Carolina Ferreyra, DNI 23456781.
  - "Abogado": Julián Ibarra, DNI 24567892.
  - "Cliente": María Elena Gómez, DNI 28456123.

### Cuenta de prueba protegida (RF-19)
> Esta cuenta es de la demo y no se puede modificar.

### Comando de restablecimiento (RF-20 y RF-21)
- Terminó bien: "Datos de muestra restablecidos. Fechas corridas <n> días."
- Modo demo apagado: "El modo demo está apagado: no se restableció nada."
- Otra base: "Esta base no está identificada como la de la demo: no se restableció nada."
- Falló: "No se pudieron restablecer los datos de muestra: la base quedó como estaba."
