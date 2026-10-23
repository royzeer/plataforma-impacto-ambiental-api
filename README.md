# API – Plataforma Digital Integral para la Gestión de Proyectos de Impacto Ambiental

Servicios web (API REST) de nuestro proyecto formativo del SENA.
Con esta API el front en React puede registrar usuarios, iniciar sesión, crear proyectos ambientales, identificar sus impactos, planear actividades de manejo, registrar monitoreos (pH, oxígeno disuelto, DBO5...) y ver reportes para el dashboard.

| | |
|---|---|
| **Programa** | Análisis y Desarrollo de Software (228118) – SENA |
| **Evidencia** | GA7-220501096-AA5-EV03 – Diseño y desarrollo de servicios web – proyecto |
| **Aprendices** | Roycer Cervantes · Sebastián Rodríguez |
| **Tecnologías** | Node.js · Express · MySQL · JWT · bcrypt · Swagger (OpenAPI 3) |

---

## 1. ¿Qué necesito tener instalado?

- **Node.js 18 o superior** (`node -v` para revisar)
- **MySQL 8** o MariaDB (sirve el de XAMPP)
- Postman (opcional, para probar a mano)

## 2. Cómo ponerla a correr

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de configuración
cp .env.example .env        # en Windows: copy .env.example .env
#    y poner ahí el usuario/contraseña de MySQL

# 3. Crear la base de datos (en MySQL Workbench, phpMyAdmin o consola)
mysql -u root -p < database/schema.sql

# 4. Cargar datos de prueba
npm run seed

# 5. Levantar la API
npm run dev
```

Si todo salió bien, en consola sale `API escuchando en http://localhost:3000`.

- Bienvenida: http://localhost:3000
- Estado: http://localhost:3000/api/salud
- **Documentación interactiva (Swagger):** http://localhost:3000/api/docs

### Usuarios de prueba (contraseña de todos: `Ambiental2026`)

| Correo | Rol |
|---|---|
| admin@plataforma.com | admin |
| roycer.cervantes@plataforma.com | gestor |
| sebastian.rodriguez@plataforma.com | gestor |
| consultor@plataforma.com | consultor |

### Probar todos los servicios de una

Con la API corriendo, en otra terminal:

```bash
npm run probar
```

Ejecuta 58 peticiones (casos buenos y casos de error) y dice cuáles pasaron.

## 3. Estructura del proyecto

```
├── database/
│   ├── schema.sql          # tablas, llaves foráneas e índices (MySQL)
│   └── seed.js             # datos de prueba
├── docs/
│   ├── openapi.yaml        # documentación OpenAPI (se ve en /api/docs)
│   ├── ejemplos-respuestas.json
│   └── Documentacion_Servicios_Web_AA5_EV03.docx / .pdf
├── pruebas/
│   └── probarApi.js        # prueba automática de los endpoints
└── src/
    ├── config/db.js        # pool de conexiones a MySQL
    ├── controllers/        # lógica de cada servicio
    ├── middlewares/        # token, roles, errores
    ├── models/             # consultas SQL (clases *Modelo)
    ├── routes/             # definición de las rutas
    ├── utils/              # validaciones, matriz de impacto, paginación...
    ├── validators/reglas.js
    ├── app.js              # configuración de Express
    └── server.js           # arranque del servidor
```

Usamos una arquitectura por capas: **rutas → controladores → modelos → MySQL**. Los controladores nunca escriben SQL y los modelos nunca responden HTTP.

## 4. Servicios (endpoints)

Todas las rutas empiezan por `/api`. 🔒 = requiere token (`Authorization: Bearer <token>`).

| Método | Ruta | Descripción | Quién |
|---|---|---|---|
| GET | `/salud` | Estado de la API y la BD | Público |
| POST | `/auth/registro` | Registrar usuario | Público |
| POST | `/auth/login` | Iniciar sesión | Público |
| GET | `/auth/perfil` | Perfil del usuario del token | 🔒 Todos |
| GET | `/usuarios` | Listar usuarios | 🔒 admin |
| GET | `/usuarios/:id` | Ver usuario | 🔒 admin / el mismo |
| PUT | `/usuarios/:id` | Editar nombre, correo o contraseña | 🔒 admin / el mismo |
| PATCH | `/usuarios/:id/rol` | Cambiar rol | 🔒 admin |
| PATCH | `/usuarios/:id/activar` | Reactivar usuario | 🔒 admin |
| DELETE | `/usuarios/:id` | Desactivar usuario | 🔒 admin |
| GET | `/proyectos` | Listar (filtros + paginación) | 🔒 Todos |
| POST | `/proyectos` | Crear proyecto | 🔒 admin, gestor |
| GET | `/proyectos/:id` | Ver proyecto completo | 🔒 Todos |
| PUT | `/proyectos/:id` | Editar proyecto | 🔒 admin / responsable |
| PATCH | `/proyectos/:id/estado` | Cambiar estado | 🔒 admin / responsable |
| DELETE | `/proyectos/:id` | Eliminar proyecto | 🔒 admin / responsable |
| GET | `/proyectos/:proyectoId/impactos` | Listar impactos | 🔒 Todos |
| POST | `/proyectos/:proyectoId/impactos` | Registrar impacto | 🔒 admin / responsable |
| GET | `/impactos/:id` | Ver impacto | 🔒 Todos |
| PUT | `/impactos/:id` | Editar impacto | 🔒 admin / responsable |
| DELETE | `/impactos/:id` | Eliminar impacto | 🔒 admin / responsable |
| GET | `/proyectos/:proyectoId/actividades` | Listar actividades | 🔒 Todos |
| POST | `/proyectos/:proyectoId/actividades` | Crear actividad | 🔒 admin / responsable |
| GET | `/actividades/:id` | Ver actividad | 🔒 Todos |
| PUT | `/actividades/:id` | Editar actividad | 🔒 admin / responsable |
| PATCH | `/actividades/:id/estado` | Cambiar estado | 🔒 admin / responsable |
| DELETE | `/actividades/:id` | Eliminar actividad | 🔒 admin / responsable |
| GET | `/proyectos/:proyectoId/monitoreos` | Listar monitoreos | 🔒 Todos |
| POST | `/proyectos/:proyectoId/monitoreos` | Registrar monitoreo | 🔒 admin / responsable |
| GET | `/monitoreos/:id` | Ver monitoreo | 🔒 Todos |
| PUT | `/monitoreos/:id` | Editar monitoreo | 🔒 admin / responsable |
| DELETE | `/monitoreos/:id` | Eliminar monitoreo | 🔒 admin / responsable |
| GET | `/reportes/dashboard` | Resumen general | 🔒 Todos |
| GET | `/reportes/proyectos/:id` | Resumen de un proyecto | 🔒 Todos |

La explicación detallada de cada servicio (parámetros, ejemplos de petición y respuesta, códigos de error) está en `docs/Documentacion_Servicios_Web_AA5_EV03.docx` y en Swagger.

## 5. Decisiones que tomamos

- **Importancia del impacto = magnitud × probabilidad** (1 a 100). La calcula la API, no el usuario: bajo (≤20), moderado (≤40), alto (≤70), crítico (>70). Es una versión simplificada de las matrices que vemos en Ingeniería Ambiental.
- **Cumplimiento de norma automático** en los monitoreos. Hay parámetros con límite máximo (DBO5, coliformes) y otros con límite mínimo (oxígeno disuelto), por eso existe `tipoLimite`.
- **Los usuarios no se borran, se desactivan**, para no perder quién fue responsable de cada proyecto.
- **Mismo formato de respuesta en todo**: `{ ok, mensaje, datos }` o `{ ok: false, mensaje, errores }`.
- **Contraseñas con bcrypt** y sesión con **JWT** (8 horas).
- Consultas SQL con **parámetros (`?`)** para evitar inyección SQL.

## 6. Estándares de codificación

Seguimos lo definido en la evidencia AA1-EV02:

- Variables y funciones en `camelCase` y en español (`obtenerProyecto`, `fechaInicio`).
- Clases en `PascalCase` (`ProyectoModelo`, `ErrorApi`).
- Constantes en `MAYUSCULAS_CON_GUION` (`RONDAS_BCRYPT`, `ESTADOS_PROYECTO`).
- Columnas de la BD en `snake_case` (`fecha_inicio`) y en el JSON en `camelCase` (`fechaInicio`).
- Rutas en plural y en minúscula (`/proyectos`, `/actividades`).
- Archivos: rutas `xxxRutas.js`, controladores `xxxController.js`, modelos `XxxModelo.js`.
- Cada archivo y función tiene comentarios explicando qué hace y por qué.

## 7. Autores

- **Roycer Cervantes**
- **Sebastián Rodríguez**

SENA – Tecnología en Análisis y Desarrollo de Software – 2026
