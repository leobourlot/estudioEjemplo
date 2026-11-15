# Spec 011 — Planes de suscripción

## Contexto y objetivo
El sistema se ofrece a cada estudio en dos planes, Básico y Premium, y cada estudio tiene su propia publicación y su propia base de datos (spec 009: un estudio por publicación). Hoy todas las publicaciones tienen todas las funcionalidades. Esta spec hace que cada publicación funcione según el plan contratado. El plan Básico incluye la gestión de causas, partes y cuentas, los movimientos con su historial, el portal del cliente, los modelos de escritos y el sitio público, con hasta 2 integrantes del estudio habilitados. El plan Premium suma la jurisprudencia (spec 005), los PDF de movimientos y fallos (spec 010), con un espacio total de 10 GB, y los integrantes sin límite. Quien opera el servidor elige el plan de cada publicación. El estudio no puede cambiarlo desde el sistema. En el plan Básico, el panel muestra lo que es del plan Premium con un aviso para contratarlo, y el portal no muestra nada de eso. Cambiar de plan nunca borra datos: lo que es del plan Premium queda guardado y vuelve a verse si el estudio vuelve a ese plan.

Esta spec amplía las specs 001, 002, 003, 004, 005, 006, 008, 009 y 010 sin reescribirlas (spec 009, RF-12). Donde agrega algo a un requisito de esas specs, lo indica con su número. Modifica dos requisitos, que llevan una nota que remite a esta: la spec 009 (RF-13), que exceptuaba solo el archivo de marca, y la spec 010 (RF-33), cuya regla de qué PDF ve un cliente suma la condición del plan. La spec 010 dejaba fuera de alcance un límite de espacio fuera del modo demo, y también lleva una nota. La constitución (principio 5) suma la excepción de los datos de contacto de Bourder Web (RF-34).

El dominio del sitio (un subdominio en el plan Básico, el dominio propio en el Premium) y el soporte son condiciones de la publicación y del servicio, no del sistema, así que esta spec no los trata.

## Usuarios / actores
- **Quien opera el servidor** (Bourder Web): elige el plan de cada publicación y, si un estudio lo pide, le da más espacio para PDF.
- **Administrador** (spec 001): ve el plan del estudio y el espacio usado, ve qué integrantes quedan fuera del plan y elige a quién habilitar.
- **Abogado** (spec 001): usa lo que incluye el plan, ve el plan y el espacio usado en el inicio del panel, y ve el aviso de lo que no incluye.
- **Cliente** (spec 001): usa el portal. Nunca ve nada que sea del plan Premium si el estudio no lo tiene, ni un aviso de que existe.
- **Visitante** (spec 001): el sitio público no cambia con el plan.

## Historias de usuario
- H1: Como quien opera el servidor quiero elegir el plan de cada publicación en su configuración, para que el estudio use lo que contrató sin mantener dos versiones del código.
- H2: Como quien opera el servidor quiero que el sistema no arranque si el plan no está indicado o es inválido, para que un error de configuración no deje a un estudio Premium sin sus funcionalidades, ni a uno Básico con las del Premium.
- H3: Como integrante de un estudio con el plan Básico quiero ver que la jurisprudencia y los PDF existen, con un aviso de cómo contratarlos, para saber qué gano al pasar al plan Premium.
- H4: Como cliente de un estudio con el plan Básico quiero un portal limpio, sin opciones que no puedo usar.
- H5: Como administrador quiero que, si el estudio pasa al plan Básico, no se borre nada, para recuperar todo si vuelve al plan Premium.
- H6: Como administrador de un estudio que pasó al plan Básico con más de 2 integrantes quiero saber quiénes quedaron fuera del plan y elegir yo a quién habilitar, sin que el sistema habilite a nadie por su cuenta.
- H7: Como integrante de un estudio Premium quiero que me avisen cuando el espacio para PDF esté por completarse, para pedir más espacio a tiempo.
- H8: Como integrante quiero saber por qué no se guardó un PDF cuando el espacio se completó.

## Requisitos funcionales (criterios de aceptación en EARS)

### El plan de cada publicación
- RF-1: EL SISTEMA funciona con uno de dos planes, Básico o Premium, indicado en la configuración del servidor de cada publicación (el plan decide cómo). Nunca se cambia desde el panel, el portal ni el sitio público, y no se guarda en el navegador.
- RF-2: SI la configuración no indica el plan, o indica un valor que no es Básico ni Premium, ENTONCES EL SISTEMA no arranca y muestra el problema en la consola del servidor, como con las demás variables de la configuración. No hay plan por defecto.
- RF-3: CUANDO quien opera el servidor cambia el plan y vuelve a publicar, EL SISTEMA aplica el plan nuevo en la siguiente acción de cada usuario (spec 004, RF-3), sin cerrar sesiones salvo las de RF-21. No borra, modifica ni mueve ningún dato del estudio: lo único que registra es qué integrantes quedan fuera del plan (RF-20, RF-25).
- RF-4: EL SISTEMA aplica las reglas del plan siempre en el servidor, en cada acción, aunque la interfaz oculte la opción (como la spec 001, RF-19).

### Qué incluye cada plan
- RF-5: EL SISTEMA ofrece en los dos planes todo lo de las specs 001 a 004 y 006 a 009: cuentas, causas, partes, movimientos con su historial y su visibilidad, el portal del cliente, los modelos de escritos, el sitio público y la marca. La única excepción es el límite de integrantes del plan Básico (RF-17 a RF-25). Las cuentas de clientes no tienen límite en ninguno de los dos planes.
- RF-6: EL SISTEMA ofrece solo en el plan Premium:
  - La jurisprudencia (spec 005), con los PDF de sus fallos.
  - Los PDF de los movimientos (spec 010), para los integrantes y para los clientes.
  - Más de 2 integrantes habilitados.

### Jurisprudencia en el plan Básico
- RF-7: MIENTRAS el plan es Básico, EL SISTEMA mantiene en el menú del panel la opción "Jurisprudencia" (spec 008, RF-6), en su lugar, con la etiqueta T-1. CUANDO un integrante la elige, o abre una dirección de la jurisprudencia (listado, detalle, carga o modificación de un fallo, o el PDF de un fallo), EL SISTEMA muestra la pantalla T-2 en lugar de la jurisprudencia, sin consultar si el fallo existe. Una dirección que no corresponde a ninguna pantalla de la jurisprudencia se trata como cualquier dirección inexistente (spec 007, RF-10).
- RF-8: MIENTRAS el plan es Básico, SI se pide a la api cualquier consulta u operación de jurisprudencia (fallos, palabras clave, sugerencias, búsqueda o PDF de un fallo), ENTONCES EL SISTEMA la rechaza con el mensaje T-4, sin consultar ni cambiar nada. Ninguna otra pantalla del panel muestra datos de jurisprudencia.
- RF-9: EL SISTEMA conserva los fallos, sus palabras clave y sus PDF mientras el plan es Básico. CUANDO el plan vuelve a ser Premium, se ven y se usan como antes, sin cambios.

### PDF en el plan Básico
- RF-10: MIENTRAS el plan es Básico, EL SISTEMA no ofrece adjuntar, reemplazar ni quitar el PDF de un movimiento. En su lugar, muestra el aviso T-3 en el formulario de carga y en el de modificación del movimiento, también cuando el formulario de carga se abre desde un escrito completado (spec 006, RF-54). El resto del formulario funciona como en la spec 003.
- RF-11: MIENTRAS el plan es Básico, SI se envía a la api un PDF, o el pedido de quitar uno, en un movimiento o en un fallo, ENTONCES EL SISTEMA rechaza toda la operación con el mensaje T-4 y no guarda nada (como en la spec 010, RF-11).
- RF-12: MIENTRAS el plan es Básico, EL SISTEMA no muestra ni envía a los integrantes ningún dato de los PDF guardados en los movimientos: ni la leyenda "PDF" del historial de movimientos (spec 010, RF-30), ni el tamaño, el autor, la fecha ni las opciones del PDF en la consulta de un movimiento (spec 010, RF-31). Lo único que les envía es si el movimiento tiene un PDF guardado, y solo para mostrar el aviso T-11 (RF-15). SI un integrante abre la dirección del PDF de un movimiento, ENTONCES EL SISTEMA lo lleva al panel con el mensaje T-4, sin consultar si la causa, el movimiento o el PDF existen.
- RF-13: MIENTRAS el plan es Básico, EL SISTEMA no le muestra ni le envía al cliente nada de los PDF: ni la leyenda "PDF", ni sus opciones, ni ninguna señal de que un movimiento tiene uno. Modifica la spec 010 (RF-33): un cliente puede ver el PDF de un movimiento si y solo si el plan es Premium y se cumple lo que esa spec indica. SI el cliente abre la dirección de un PDF en el plan Básico, ENTONCES EL SISTEMA responde como indica la spec 010 (RF-37), con "No existe ese PDF", igual que en cualquier otro caso sin permiso.
- RF-14: EL SISTEMA conserva los PDF de los movimientos mientras el plan es Básico, aunque el movimiento se modifique, se anule, se restaure o cambie de visibilidad. Modificar un movimiento sin tocar su PDF no lo quita. CUANDO el plan vuelve a ser Premium, los integrantes los vuelven a ver, y el cliente vuelve a ver los de los movimientos que puede ver (spec 010, RF-33).
- RF-15: MIENTRAS el plan es Básico, CUANDO un integrante deja visible para el cliente un movimiento que tiene un PDF guardado, al marcarlo como visible o al restaurarlo siendo visible, EL SISTEMA muestra, además del aviso de la spec 003 (RF-9), el aviso informativo T-11, que no exige confirmación. El PDF sigue oculto para el cliente mientras el plan sea Básico, y el cliente lo verá si el estudio vuelve al plan Premium. Los avisos de la spec 010 (RF-18 y RF-19) no se muestran en el plan Básico.
- RF-16: MIENTRAS el plan es Básico, EL SISTEMA muestra en el historial de cambios del movimiento (spec 003, RF-20) los cambios del PDF sin ningún dato: en lugar del tamaño o de "Sin PDF" (spec 010, RF-21), cada valor anterior y nuevo del PDF dice T-15. El resto del cambio (quién, cuándo y los demás datos) se ve como siempre. Lo registrado no se altera: con el plan Premium, se vuelve a ver como indica la spec 010.

### Integrantes del estudio en el plan Básico
- RF-17: EL SISTEMA llama **integrantes habilitados** a las cuentas de administradores y de abogados que están activas y no están fuera del plan (RF-20), con cambio de contraseña pendiente o sin él. Las desactivadas, las que están fuera del plan y las de clientes no cuentan.
- RF-18: MIENTRAS el plan es Básico, SI un administrador intenta crear un integrante, reactivar una cuenta de integrante o habilitar una cuenta fuera del plan (RF-23) cuando ya hay 2 integrantes habilitados, ENTONCES EL SISTEMA lo rechaza con el mensaje T-5 y no guarda nada. El control se hace en el servidor y se respeta aunque dos administradores lo intenten a la vez. Cambiar el rol de un integrante habilitado entre administrador y abogado (spec 001, RF-28) no cambia la cantidad y se permite.
- RF-19: MIENTRAS el plan es Básico, EL SISTEMA muestra a los administradores, en la lista de cuentas (spec 001, RF-26), cuántos integrantes habilitados hay sobre los 2 del plan (T-10). Con 2 habilitados, el formulario "Nueva cuenta" sigue permitiendo crear clientes, pero los roles de administrador y abogado aparecen no disponibles, con el mensaje T-5 junto al campo del rol. SI aun así llega a la api el alta de un integrante, ENTONCES EL SISTEMA la rechaza según RF-18.
- RF-20: CUANDO EL SISTEMA arranca con el plan Básico y hay más de 2 integrantes habilitados (por ejemplo, porque el estudio pasó del plan Premium al Básico), marca como **fuera del plan** a todos menos 2:
  - El administrador principal (spec 001, RF-31 y RF-32), que siempre está activo y nunca queda fuera del plan.
  - El integrante habilitado con la fecha de creación de la cuenta más antigua (spec 001, RF-4) entre los demás. Si dos tienen la misma, el que se creó primero. Una cuenta desactivada y reactivada conserva su fecha de creación.

  EL SISTEMA no desactiva a los que quedan fuera del plan ni les cambia ningún otro dato.
- RF-21: SI un integrante fuera del plan ingresa su DNI y su contraseña correctos, ENTONCES EL SISTEMA no inicia la sesión y muestra el mensaje T-6. Ese ingreso cuenta como un intento fallido para el límite de la spec 001 (RF-10). Con datos incorrectos, el mensaje sigue siendo el genérico de la spec 001 (RF-9). SI tenía una sesión abierta, ENTONCES EL SISTEMA la cierra en su siguiente acción y lo lleva a la pantalla de ingreso con el mensaje T-6 (como la spec 001, RF-14).
- RF-22: EL SISTEMA muestra a los administradores, en la lista de cuentas y en la consulta de cada cuenta, el estado T-7 en los integrantes fuera del plan, y permite filtrarlos con el filtro de estado (spec 001, RF-26).
- RF-23: EL SISTEMA solo permite, sobre una cuenta fuera del plan, consultarla (spec 001, RF-34), desactivarla (spec 001, RF-29) y habilitarla. SI se intenta modificar sus datos, restablecer su contraseña, cambiar su rol o transferirle la condición de administrador principal, ENTONCES EL SISTEMA lo rechaza con el mensaje T-14 y no cambia nada.
  - CUANDO un administrador elige "Habilitar en el plan" (T-16) en una cuenta fuera del plan y hay menos de 2 integrantes habilitados, EL SISTEMA le quita la marca. La cuenta conserva su contraseña y puede ingresar. Con 2 habilitados, se rechaza según RF-18.
  - CUANDO se desactiva una cuenta fuera del plan, EL SISTEMA le quita la marca. Si después se reactiva, se aplica RF-18.
- RF-24: CUANDO un administrador desactiva a un integrante habilitado, EL SISTEMA no habilita a nadie en su lugar: el lugar queda libre hasta que un administrador habilite una cuenta fuera del plan, cree un integrante o reactive uno (RF-18, RF-23).
- RF-25: CUANDO EL SISTEMA arranca con el plan Premium, quita la marca de todas las cuentas fuera del plan: todos los integrantes activos pueden ingresar, sin que nadie tenga que reactivarlos ni habilitarlos.
- RF-26: EL SISTEMA conserva la autoría de los integrantes fuera del plan en causas, movimientos, historiales, fallos, PDF y cuentas, y los sigue mostrando donde aparecen, sin marcarlos de ninguna forma especial fuera de la gestión de cuentas. Siguen figurando como abogados de las causas donde ya estaban (spec 002), pero no se los puede agregar como abogados de otra causa mientras estén fuera del plan: no aparecen entre las opciones, y la api lo rechaza con el mensaje T-14.

### Espacio para PDF en el plan Premium
- RF-27: EL SISTEMA tiene en el plan Premium un espacio para PDF de 10 GB en total (10 × 1.073.741.824 = 10.737.418.240 bytes). La configuración del servidor de la publicación puede indicar otro tamaño, en GB enteros, de 1 a 1.000 (el plan decide cómo), para darle más espacio a un estudio que lo pida. SI con el plan Premium el tamaño indicado no es un número entero de 1 a 1.000, ENTONCES EL SISTEMA no arranca (como RF-2). Con el plan Básico, ese valor no se usa. El espacio usado es la suma del tamaño de todos los PDF guardados en la base: de movimientos y de fallos, visibles u ocultos, anulados o desactivados.
- RF-28: SI al guardar un PDF el espacio usado más el tamaño del PDF nuevo, menos el del que reemplaza si es un reemplazo, supera el espacio del plan, ENTONCES EL SISTEMA rechaza toda la operación con el mensaje T-9 y no guarda nada (como en la spec 010, RF-11). El límite se respeta aunque varias personas suban a la vez. Quitar un PDF libera su espacio en el momento. SI un archivo incumple más de una regla, ENTONCES EL SISTEMA muestra un solo mensaje, en este orden: primero las reglas del archivo (spec 010, RF-4), después el tope de la demo (spec 010, RF-41) y por último el espacio (T-9).
- RF-29: MIENTRAS el espacio usado es el 90 % del espacio del plan o más (9 GB con los 10 GB), EL SISTEMA muestra a los integrantes el aviso T-8:
  - En el inicio del panel.
  - En el formulario de carga y en el de modificación de un movimiento y de un fallo, junto a la opción de adjuntar el PDF.

  El aviso no impide subir PDF mientras quede espacio.
- RF-30: EL SISTEMA muestra el espacio usado en GB con un decimal, redondeado hacia abajo, con 1 GB = 1.073.741.824 bytes, para que nunca muestre el espacio completo si todavía queda lugar. El espacio total se muestra en GB enteros. Por ejemplo: "0,0 GB de 10 GB", "9,3 GB de 10 GB".

### El plan en el panel
- RF-31: EL SISTEMA muestra a los administradores y a los abogados, en el inicio del panel, el plan del estudio con el texto T-10: en el plan Básico, los integrantes habilitados sobre 2; en el Premium, el espacio para PDF usado sobre el total.
- RF-32: EL SISTEMA no muestra el plan, sus avisos ni sus mensajes en el portal del cliente ni en el sitio público.
- RF-33: EL SISTEMA muestra en los avisos T-2, T-3, T-8 y T-9 el contacto de Bourder Web (T-12): el enlace a su sitio, el mismo de la leyenda "Diseñado por" del pie (spec 009, RF-10), y su WhatsApp. El WhatsApp abre la conversación con el mensaje T-13 que corresponde al aviso, con el nombre del estudio del archivo de marca. Los dos enlaces se abren en una pestaña nueva, aislada como los enlaces externos de la spec 005 (RF-19), y se anuncian con su destino ("Escribir a Bourder Web por WhatsApp", "Ir al sitio de Bourder Web"). El contacto lo agrega la interfaz: los mensajes de la api (T-4, T-5 y T-9) no lo incluyen.

### Datos de Bourder Web
- RF-34: EL SISTEMA toma los datos de Bourder Web (el enlace a su sitio, su WhatsApp, en la forma que se muestra y en la del enlace, y los mensajes T-13) de un único archivo, separado del archivo de marca, porque son los mismos para todos los estudios y no cambian con la marca. El enlace del pie (spec 009, RF-10) pasa a tomarse de ese archivo. Ningún otro archivo del código los repite. Son la excepción del principio 5 de la constitución para los datos de contacto de Bourder Web.
- RF-35: EL SISTEMA exceptúa ese archivo en el test de la spec 009 (RF-13), además del archivo de marca. El test sigue fallando si un dato de la marca aparece en cualquier otro archivo. Así, la marca de ejemplo de la demo, cuyo WhatsApp es el de Bourder Web (spec 009, anexo A), no hace fallar el test. Modifica la spec 009 (RF-13), que exceptuaba solo el archivo de marca.

### Modo demo
- RF-36: MIENTRAS el modo demo está encendido (spec 009, RF-15), EL SISTEMA exige el plan Premium, para mostrar todas las funcionalidades. SI el modo demo está encendido con el plan Básico, ENTONCES EL SISTEMA no arranca y lo indica en la consola del servidor (como RF-2). El tope de 4 PDF de la demo (spec 010, RF-41) se aplica además del espacio de RF-27.

## Requisitos no funcionales
- Seguridad: todas las reglas del plan las aplica el servidor (RF-4). En el plan Básico, ninguna respuesta de la api a un cliente incluye datos ni señales de un PDF (RF-13). Ninguna respuesta a un integrante incluye datos de jurisprudencia (RF-8) ni datos de un PDF, salvo si un movimiento tiene uno guardado (RF-12).
- Persistencia: cambiar de plan no borra, modifica ni mueve datos del estudio. Solo se registra qué cuentas están fuera del plan (RF-3, RF-20, RF-25). El plan no se guarda en el navegador (principio 5).
- Concurrencia: el límite de integrantes (RF-18) y el de espacio (RF-28) se respetan con pedidos simultáneos, como el tope de la demo (spec 010, RF-41).
- Rendimiento: el control de los integrantes habilitados y el cálculo del espacio usado no cambian los tiempos de las specs 001 y 010. El espacio usado se calcula con los tamaños registrados, sin leer el contenido de los PDF.
- Operación: el espacio de RF-27 vive en la base del estudio, en el MySQL del VPS. Antes de dar más espacio a un estudio, quien opera el servidor verifica el disco y el tamaño de las copias de seguridad (README).
- Configuración: el plan y el espacio se indican en la configuración de cada publicación y en la de desarrollo y tests. Quien opera el servidor los agrega a mano en los archivos de configuración, que el sistema no versiona. Los tests que necesitan otro plan lo indican en su propia configuración, sin tocar esos archivos.
- Stack: no se agrega ninguna dependencia sin justificarla en el plan (principio 1). La marca de fuera del plan (RF-20) se agrega a la base con una migración de TypeORM.
- Accesibilidad: la etiqueta T-1 forma parte del nombre de la opción del menú para el lector de pantalla ("Jurisprudencia, plan Premium"). Los avisos se anuncian como texto informativo, no como error, salvo T-5, T-6, T-9 y T-14. Los roles no disponibles del formulario de alta (RF-19) se anuncian como no disponibles, con el motivo.
- Idioma: todos los textos y mensajes en español.

## Casos límite
- **Configuración:**
  - Plan sin indicar, mal escrito o en mayúsculas distintas de las que fija el plan: el sistema no arranca (RF-2).
  - Una publicación existente, como la demo, o la configuración de desarrollo o de tests, se actualiza a esta versión sin indicar el plan: no arranca hasta indicarlo (RF-2). El README lo avisa.
  - Modo demo con el plan Básico: no arranca (RF-36).
  - Espacio para PDF indicado como 0, 1.001, 10,5 o "diez" con el plan Premium: no arranca. Con el plan Básico, se ignora (RF-27).
- **Paso del plan Premium al Básico:**
  - Un integrante tenía abierto el listado de jurisprudencia: en su siguiente acción ve la pantalla T-2 (RF-3, RF-7).
  - Un integrante estaba cargando un movimiento con un PDF: al guardar, se rechaza todo con T-4. El formulario conserva lo escrito y descarta el archivo (RF-11; spec 010, RF-11).
  - Una subida en curso cuando se vuelve a publicar con el plan nuevo: se guarda completa con el plan anterior o no se guarda nada, con el mensaje de la spec 010 (RF-12). El siguiente intento sigue el plan nuevo.
  - Un cliente tenía abierto un movimiento con PDF: en su siguiente acción deja de ver la leyenda y las opciones. Si elige "Descargar PDF" con la pantalla vieja, recibe "No existe ese PDF" (RF-13).
  - Un movimiento visible con PDF se anula y se restaura en el plan Básico: aviso T-11, sin el aviso de la spec 010 (RF-19). El PDF sigue guardado y oculto (RF-14, RF-15).
  - Un movimiento oculto con PDF pasa a visible en el plan Básico: aviso T-11 (RF-15). Si el estudio vuelve al plan Premium, el cliente ve el PDF.
  - Un movimiento cuyo historial tiene cambios del PDF: en el plan Básico, esos valores dicen T-15 (RF-16).
  - Hay 4 integrantes activos: al arrancar quedan habilitados el principal y el de cuenta más antigua. Los otros 2 quedan fuera del plan: no pueden ingresar y figuran con el estado T-7 (RF-20 a RF-22).
  - El integrante de cuenta más antigua es el principal: queda habilitado el siguiente más antiguo (RF-20).
  - Un integrante desactivado hace años y reactivado hace una semana: conserva su fecha de creación, así que puede ser el más antiguo (RF-20).
  - El administrador quiere que siga trabajando el tercero y no el segundo: desactiva al segundo y habilita al tercero con "Habilitar en el plan" (RF-23, RF-24).
  - El administrador desactiva al segundo y no habilita a nadie: el estudio sigue con un solo integrante habilitado. Nadie se habilita solo (RF-24).
  - El administrador intenta modificar el email, restablecer la contraseña o cambiar el rol de una cuenta fuera del plan: se rechaza con T-14 (RF-23).
  - El principal intenta transferir su condición a un administrador fuera del plan: se rechaza con T-14 (RF-23).
  - Un integrante fuera del plan figura como abogado de una causa: sigue figurando, pero no se lo puede agregar a otra (RF-26).
  - Un integrante fuera del plan tiene cambio de contraseña pendiente: no ingresa, igual que los demás fuera del plan (RF-21).
  - Alguien intenta varias veces ingresar con una cuenta fuera del plan: cada intento cuenta para el bloqueo de la spec 001 (RF-10, RF-21).
- **Paso del plan Básico al Premium:**
  - Vuelven a verse la jurisprudencia, los PDF y los datos del PDF en el historial, sin cambios (RF-9, RF-14, RF-16).
  - Al arrancar, los integrantes fuera del plan pierden la marca y vuelven a ingresar (RF-25).
  - El espacio usado ya supera el del plan: no se borra nada. Los PDF nuevos se rechazan con T-9 hasta que se libere espacio o se dé más (RF-28).
  - El estudio vuelve después al plan Básico: al arrancar, se vuelve a marcar quién queda fuera del plan, con la regla de RF-20.
- **Plan Básico, uso normal:**
  - Un estudio con 1 integrante crea el segundo: se permite. El tercero se rechaza con T-5 (RF-18).
  - Con 2 habilitados, un administrador crea un cliente: se permite. En el formulario, los roles de integrante aparecen no disponibles (RF-19).
  - Un estudio con 2 integrantes habilitados desactiva uno y crea otro: se permite (RF-18, RF-24).
  - Dos administradores crean un integrante a la vez con 1 habilitado: se crea uno solo (RF-18).
  - Un pedido a la api armado a mano para subir un PDF o cargar un fallo: se rechaza con T-4 (RF-8, RF-11).
  - Un abogado elige "Jurisprudencia": ve la pantalla T-2 (RF-7).
  - Un integrante abre la dirección de un fallo o de un PDF que no existe: ve T-2 o T-4, igual que si existiera, porque en el plan Básico no se consulta (RF-7, RF-12).
  - Un integrante escribe una dirección de la jurisprudencia que no corresponde a ninguna pantalla: se trata como dirección inexistente (RF-7).
  - Un integrante registra como movimiento un escrito completado: el formulario muestra T-3 en lugar del PDF (RF-10).
  - Un cliente nunca ve la etiqueta, los avisos ni los mensajes del plan (RF-32).
- **Espacio para PDF:**
  - Espacio usado de 9,99 GB: se muestra "9,9 GB de 10 GB" y el aviso T-8 (RF-29, RF-30).
  - Sin ningún PDF: se muestra "0,0 GB de 10 GB" (RF-30).
  - Un PDF de 5 MB cuando quedan 3 MB: se rechaza con T-9 (RF-28).
  - Un archivo que no es PDF cuando el espacio está completo: se rechaza con "El archivo debe ser un PDF", no con T-9 (RF-28).
  - Reemplazar un PDF de 4 MB por uno de 5 MB cuando queda 1 MB: se permite, porque el anterior se descuenta (RF-28).
  - Dos subidas a la vez cuando solo entra una: se guarda una sola (RF-28).
  - Quitar un PDF cuando el espacio estaba completo: se libera en el momento y se puede subir otro (RF-28).
  - Los PDF de movimientos anulados o de fallos desactivados ocupan espacio. Para liberarlo, hay que restaurarlos o reactivarlos y quitar el PDF (RF-27; spec 010, RF-22 y RF-26).
  - Quien opera el servidor da 20 GB a un estudio: el aviso pasa a mostrarse desde los 18 GB (RF-27, RF-29).
- **Demo:**
  - La demo funciona con el plan Premium y sus 3 integrantes de muestra, con el tope de 4 PDF (RF-36).
- **Contacto de Bourder Web:**
  - En la demo, el WhatsApp de la marca y el de Bourder Web son el mismo: el test de la spec 009 (RF-13) no falla, porque los dos archivos están exceptuados (RF-35).
  - Alguien escribe el WhatsApp de Bourder Web en un componente: con la marca de ejemplo, el test de la spec 009 (RF-13) falla y dice dónde, porque coincide con el de la marca. Con otra marca no lo detecta. Se acepta (RF-34).
  - Cambia el WhatsApp de Bourder Web: se edita un solo archivo y se publica cada estudio con la versión nueva (RF-34).
  - Un aviso en el celular: el WhatsApp abre la aplicación, como el botón del sitio público (spec 007).

## Fuera de alcance
- Cobros, pagos, facturación, vencimiento del plan o suspensión automática por falta de pago.
- Cambiar el plan desde el panel, que el estudio lo pida desde el sistema, o un período de prueba.
- Otros planes, o límites distintos de los de esta spec, salvo el espacio para PDF (RF-27).
- Límite de cantidad de clientes, causas, movimientos o modelos de escritos.
- Avisos por email o por WhatsApp sobre el plan o el espacio.
- Borrar los datos del plan Premium al pasar al Básico, o exportarlos.
- Avisar al administrador de los intentos de ingreso de las cuentas fuera del plan.
- Que el plan y el espacio usado no se puedan deducir por medios indirectos (tiempos de respuesta, datos en la caché del navegador después de cambiar de plan). Se acepta por ahora.
- El dominio del sitio y el soporte (contexto y objetivo).
- Varios estudios en una misma publicación (spec 009).

## Criterios de finalización
- Todos los RF con al menos un test en verde, con los dos planes.
- Tests que verifiquen, en la api:
  - Que no arranca sin plan, con un plan inválido, con un espacio inválido en el plan Premium o con el modo demo y el plan Básico, y que con el plan Básico ignora el espacio (RF-2, RF-27, RF-36).
  - Que en el plan Básico se rechaza toda consulta y operación de jurisprudencia, y toda subida o quitado de un PDF de un movimiento o de un fallo, sin guardar nada (RF-8, RF-11).
  - Que en el plan Básico las respuestas a integrantes solo indican si un movimiento tiene PDF, sin otros datos; que el historial de cambios no incluye el tamaño ni el código del PDF; que las respuestas del portal no incluyen ninguna señal de un PDF; y que la dirección de un PDF responde lo que indican RF-12 y RF-13, exista o no (RF-12, RF-13, RF-16).
  - Que modificar, anular y restaurar un movimiento en el plan Básico conserva su PDF, y que al volver al Premium se ve otra vez (RF-9, RF-14).
  - El límite de 2 integrantes habilitados al crear, al reactivar y al habilitar, también con pedidos simultáneos; que se pueden crear clientes con 2 habilitados; y que cambiar el rol no cuenta (RF-17 a RF-19).
  - La marca de RF-20 al arrancar con el plan Básico, con el principal y con el desempate por fecha de creación, y que al arrancar con el Premium se quita (RF-20, RF-25).
  - Que un integrante fuera del plan no ingresa con su contraseña correcta, que el intento cuenta para el bloqueo, que recibe el mensaje genérico con una contraseña incorrecta y que pierde su sesión abierta en su siguiente acción (RF-21).
  - Que sobre una cuenta fuera del plan solo se permiten consultar, desactivar y habilitar; que desactivar a un habilitado no habilita a nadie; y que un integrante fuera del plan no se puede agregar a una causa (RF-23, RF-24, RF-26).
  - El espacio de RF-27 y RF-28: el rechazo al superarlo, el reemplazo que descuenta el anterior, el quitado que libera, el valor configurado, las subidas simultáneas y el orden de los mensajes.
  - Que el modo demo con el plan Premium aplica el tope de 4 PDF (RF-36).
- Tests que verifiquen, en la web:
  - La etiqueta T-1 en el menú y la pantalla T-2 en las direcciones de la jurisprudencia con el plan Básico, y su ausencia con el Premium (RF-7).
  - El aviso T-3 en los formularios de movimiento, también en el que se abre desde un escrito, con el plan Básico (RF-10).
  - Que el portal no muestra ninguna señal de PDF en el plan Básico (RF-13, RF-32).
  - El aviso T-11 al hacer visible y al restaurar, y que no aparecen los de la spec 010 (RF-18 y RF-19) en el plan Básico (RF-15).
  - T-15 en el historial de cambios en el plan Básico (RF-16).
  - El contador T-10, los roles no disponibles con T-5 en "Nueva cuenta", el estado T-7 con su filtro y "Habilitar en el plan" (RF-19, RF-22, RF-23).
  - El mensaje T-6 en el ingreso (RF-21).
  - El aviso T-8 desde el 90 % y el formato de los GB, redondeado hacia abajo (RF-29, RF-30).
  - El plan en el inicio del panel para administradores y abogados (RF-31).
  - Que cada aviso muestra el contacto T-12, que los dos enlaces abren una pestaña nueva aislada y que el WhatsApp lleva el mensaje T-13 que corresponde, con el nombre del estudio de la marca (RF-33).
  - Que el enlace del pie y el contacto de los avisos salen del archivo de datos de Bourder Web, y que el test de la spec 009 (RF-13) pasa con la marca de ejemplo, falla con un dato de la marca escrito en otro archivo y no revisa los archivos exceptuados (RF-34, RF-35).
- Que siguen en verde los tests de las specs 001 a 010 con el plan Premium.
- `pnpm test` y `pnpm lint` sin errores.
- README actualizado: la spec 011 en la hoja de ruta, cómo indicar el plan y el espacio para PDF de una publicación, y el aviso de que una publicación existente, y la configuración de desarrollo y de tests, no arrancan sin indicar el plan.
- Demo manual:
  1. Con el plan Premium, verificar que todo funciona como en las specs 001 a 010 y que el inicio muestra el espacio usado.
  2. Pasar al plan Básico con 3 integrantes activos y PDF cargados. Verificar la etiqueta y la pantalla de jurisprudencia, el aviso en el formulario de movimiento, que no se ven los PDF en el panel ni en el portal ni sus datos en el historial, y que el tercer integrante no ingresa y figura como fuera del plan.
  3. Desactivar al segundo integrante y verificar que el tercero sigue sin poder ingresar. Habilitarlo y verificar que ingresa. Intentar crear otro integrante y verificar el mensaje T-5, y crear un cliente.
  4. Hacer visible un movimiento con PDF y verificar el aviso T-11.
  5. Volver al plan Premium y verificar que la jurisprudencia, los PDF y todos los integrantes activos vuelven sin cambios.
  6. Con un espacio de prueba chico, verificar el aviso desde el 90 % y el rechazo al superarlo.

## Dudas abiertas
Ninguna. Resueltas el 12/11/2026, en la especificación:
- El límite de 2 cuenta a administradores y abogados juntos (RF-17).
- Al pasar al plan Básico no se borra nada: lo del plan Premium queda guardado y no se ve hasta volver a ese plan (RF-9, RF-14).
- El cliente no ve nada del plan Premium (RF-13, RF-32).
- Al completarse el espacio se rechaza el PDF, y se avisa desde el 90 % (RF-28, RF-29).
- La demo funciona con el plan Premium (RF-36).
- En el plan Básico, lo del plan Premium se ve en el panel con un aviso (RF-7, RF-10).
- Los avisos muestran el enlace al sitio de Bourder Web y su WhatsApp, desde un archivo propio de Bourder Web (RF-33 a RF-35).

Resueltas el 12/11/2026, en la clarificación:
- La antigüedad de un integrante es la fecha de creación de su cuenta (RF-20).
- El ingreso de una cuenta fuera del plan cuenta para el bloqueo por intentos (RF-21).
- Las cuentas fuera del plan no se modifican: solo se consultan, se desactivan o se habilitan (RF-23).
- Desactivar a un integrante habilitado no habilita a otro: el administrador elige a quién habilitar. Por eso la marca de fuera del plan se guarda (RF-20, RF-24).
- Administradores y abogados ven lo mismo del plan en el inicio (RF-31).
- En el plan Básico, el historial de cambios no muestra datos del PDF (RF-16), y a los integrantes solo se les indica si un movimiento tiene PDF, para el aviso T-11 (RF-12, RF-15).
- Con 2 habilitados se siguen creando clientes (RF-19).
- El contador muestra los integrantes habilitados, por ejemplo "2 de 2" (RF-19, T-10).
- Al restaurar un movimiento visible con PDF en el plan Básico, el PDF sigue oculto hasta volver al plan Premium (RF-15).
- Las excepciones a la spec 009 (RF-13), a la spec 010 (RF-33) y al principio 5 de la constitución se agregan con una nota en cada una.
- El plan y el espacio en los archivos de configuración los agrega quien opera el servidor, a mano.

## Anexo A — Textos
- **T-1** Etiqueta en el menú: "Premium".
- **T-2** Pantalla de jurisprudencia en el plan Básico:
  - Título: "Jurisprudencia"
  - Texto: "La jurisprudencia está disponible en el plan Premium: cargá fallos con su sumario, sus palabras clave y su PDF, y encontralos con el buscador. Para sumarla, contactá a Bourder Web."
  - Contacto: T-12, con el mensaje T-13 del plan Premium.
- **T-3** Aviso en el formulario de movimiento: "Adjuntar el PDF del escrito, la cédula o la resolución está disponible en el plan Premium. Para sumarlo, contactá a Bourder Web." y el contacto T-12, con el mensaje T-13 del plan Premium.
- **T-4** Rechazo por el plan: "Tu plan no incluye esta función. Está disponible en el plan Premium."
- **T-5** Límite de integrantes: "El plan Básico incluye hasta 2 integrantes del estudio habilitados. Para sumar otro, desactivá uno o pasá al plan Premium."
- **T-6** Ingreso de un integrante fuera del plan: "Tu cuenta no está habilitada en el plan actual del estudio. Consultá con quien administra el estudio."
- **T-7** Estado de la cuenta: "Fuera del plan".
- **T-8** Aviso de espacio: "El estudio está usando <usado> de los <total> para PDF. Cuando se complete, no se van a poder subir más. Si necesitás más espacio, contactá a Bourder Web." y el contacto T-12, con el mensaje T-13 de espacio.
- **T-9** Rechazo por espacio: "Se completó el espacio para PDF del estudio (<total>). Quitá algún PDF que no necesites o pedí más espacio a Bourder Web." En la interfaz, seguido del contacto T-12, con el mensaje T-13 de espacio.
- **T-10** Plan en el inicio y en la gestión de cuentas:
  - Básico: "Plan Básico · <n> de 2 integrantes", con n los integrantes habilitados.
  - Premium: "Plan Premium · PDF: <usado> de <total>"
- **T-11** Aviso al hacer visible o restaurar un movimiento con PDF en el plan Básico: "Este movimiento tiene un PDF guardado de cuando el estudio tenía el plan Premium. El cliente no lo ve ahora, pero podrá verlo y descargarlo si el estudio vuelve a ese plan."
- **T-12** Contacto de Bourder Web, debajo del texto del aviso:
  - "WhatsApp: +54 9 345 401-7104", que abre la conversación con 5493454017104.
  - "bourderweb.com.ar", que lleva a https://bourderweb.com.ar.
- **T-13** Mensajes del WhatsApp, con el nombre completo del estudio del archivo de marca:
  - Plan Premium (T-2 y T-3): "Hola, te escribo desde el sistema de <nombre del estudio>. Quiero consultar por el plan Premium."
  - Espacio (T-8 y T-9): "Hola, te escribo desde el sistema de <nombre del estudio>. Necesitamos más espacio para PDF."
- **T-14** Acción sobre una cuenta fuera del plan: "Esta cuenta está fuera del plan Básico. Habilitala para modificarla."
- **T-15** Valor del PDF en el historial de cambios con el plan Básico: "Disponible en el plan Premium".
- **T-16** Botón en la consulta de una cuenta fuera del plan: "Habilitar en el plan". Para el lector de pantalla: "Habilitar a <nombre y apellido> en el plan Básico".
