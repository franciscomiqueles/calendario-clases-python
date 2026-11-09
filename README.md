# Calendario de clases de Python

Aplicación web para que una profesora de programación gestione su disponibilidad y sus alumnos soliciten clases privadas de 60 minutos.

## Estado

Proyecto en desarrollo. La base de Next.js, TypeScript, Prisma y las validaciones centrales de intervalos ya están configuradas.

## Tecnologías

- Next.js
- TypeScript
- PostgreSQL
- Prisma
- FullCalendar
- Auth.js
- Zod

## Requisitos

- Node.js 24 o superior
- npm
- PostgreSQL local

## Configuración local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` como `.env.local` y completa sus valores.

Para subir screenshots desde el panel de la profesora, crea un Blob Store en
Vercel y agrega su `BLOB_READ_WRITE_TOKEN` en `.env.local`. El token es
privado y no debe subirse al repositorio.

`NEXT_PUBLIC_CALENDAR_URL` debe apuntar al enlace público completo de la
profesora, por ejemplo `http://localhost:3000/calendar/ID_DE_LA_PROFESORA`
en local o `https://tu-dominio.vercel.app/calendar/ID_DE_LA_PROFESORA` en
producción. Ese valor alimenta el botón para que los alumnos agenden desde la
página principal.

3. Genera el cliente de Prisma:

   ```bash
   npm run db:generate
   ```

4. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

5. Abre <http://localhost:3000>.

Para crear la primera migración cuando PostgreSQL esté disponible:

```bash
npm run db:migrate
```

La documentación completa de modelos, migraciones y uso se ampliará cuando se implementen esos módulos.

El panel privado usa Auth.js con credenciales. Para probarlo hace falta
crear una cuenta administrativa con una contraseña hasheada. No existe
registro público para alumnos ni administradores.

Para crear o actualizar una cuenta administrativa, define temporalmente estas
variables en PowerShell y ejecuta el script:

```powershell
$env:TEACHER_NAME="Tu nombre"
$env:TEACHER_EMAIL="tu-correo@example.com"
$env:TEACHER_PASSWORD="una-contraseña-de-al-menos-8-caracteres"
npm run db:create-teacher
Remove-Item Env:\TEACHER_NAME, Env:\TEACHER_EMAIL, Env:\TEACHER_PASSWORD
```

El script utiliza `upsert`: si el correo ya existe, actualiza el nombre y la
contraseña; si no existe, crea la cuenta. Las variables se eliminan al final
de la sesión indicada y nunca deben añadirse a GitHub.

## Validación actual

La lógica de agenda ya contempla:

- Clases de 60 minutos exactos.
- Horarios con minutos arbitrarios, como `10:07` o `18:05`.
- Clases consecutivas sin solapamiento.
- Rechazo de intervalos fuera de una ventana de disponibilidad.

El panel privado muestra un calendario interactivo. El horario base de lunes a
viernes es de `08:00` a `19:30`, y sábados y domingos de `10:00` a `23:00`.
La profesora solo debe agregar bloqueos para indicar excepciones no
disponibles. Los minutos arbitrarios como `10:07` o `18:05` se conservan.

El calendario público permite seleccionar una clase de 60 minutos y enviar
una solicitud pendiente. El servidor vuelve a validar bloqueos y conflictos
antes de guardar la solicitud.

La interfaz permite seleccionar varias clases antes de enviar el formulario.
Cada horario se guarda como una solicitud independiente para que puedan ser
aceptadas o rechazadas por separado.

Las solicitudes públicas solicitan un teléfono con código internacional,
preseleccionado en `+56` para Chile. Se conservan las columnas antiguas de
correo como compatibilidad con registros creados antes de este cambio.

La profesora puede revisar las solicitudes pendientes desde el dashboard y
aceptarlas o rechazarlas individualmente. Al aceptar una solicitud se crea
una clase confirmada mediante una transacción.

Las clases confirmadas aparecen con el nombre del alumno en el calendario
privado. En el calendario público ocupan el horario como “No disponible”, sin
exponer la identidad ni el motivo.

El calendario público impide seleccionar intervalos que se crucen con
bloqueos, clases confirmadas o selecciones previas. Los errores se muestran
en la misma página y desplazan suavemente la vista hacia el aviso.

Las solicitudes múltiples se envían secuencialmente para evitar conflictos
transaccionales innecesarios; cada horario sigue siendo una solicitud
independiente.

La profesora puede editar o cancelar clases confirmadas desde el dashboard.
Los cambios se validan contra bloqueos y otras clases antes de guardarse.

El dashboard también conserva un historial de solicitudes aceptadas y
rechazadas, incluyendo el motivo de rechazo cuando fue indicado. Las
solicitudes rechazadas pueden eliminarse individualmente; las aceptadas se
conservan porque están vinculadas a sus clases hasta que pasa la fecha de la
clase; después se eliminan automáticamente junto con la clase al consultar el
dashboard o cualquiera de los calendarios. Las solicitudes pendientes se
conservan aunque su fecha haya pasado.

Cada solicitud pública entrega un código de seguimiento. El alumno puede
usarlo en el mismo enlace público para consultar si está pendiente, aceptada,
rechazada o si una clase aceptada fue cancelada.

El panel privado incluye un botón visible para cerrar la sesión administrativa.

El dashboard y sus formularios incluyen ajustes responsive para pantallas
pequeñas, foco visible para navegación con teclado y respeto por la
preferencia de movimiento reducido del sistema.

## PostgreSQL

La migración inicial todavía no se ha ejecutado porque PostgreSQL debe estar
disponible en `localhost:5432`. Con la base de datos iniciada y `.env.local`
configurado, ejecuta:

```bash
npm run db:migrate -- --name init
```

La ruta `GET /api/availability?teacherId=...` ya permite consultar ventanas
guardadas. Las operaciones de escritura quedarán protegidas por autenticación
cuando se implemente el panel de la profesora.
