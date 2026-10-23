/**
 * Configuración de la aplicación Express.
 *
 * Separamos app.js (la configuración) de server.js (el que la pone a
 * escuchar en un puerto). Así podemos usar la app en pruebas sin levantar
 * el servidor de verdad.
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const rutas = require('./routes');
const { rutaNoEncontrada, manejadorErrores } = require('./middlewares/manejoErrores');

const app = express();

// CORS: permite que el front en React (http://localhost:5173 o :3001)
// pueda consumir la API aunque esté en otro puerto.
app.use(cors());

// Para poder leer el body en formato JSON (máximo 1 MB)
app.use(express.json({ limit: '1mb' }));

// Muestra en consola cada petición: método, ruta, código y tiempo
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Página de bienvenida, para que al abrir http://localhost:3000 no salga un error
app.get('/', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Bienvenido a la API de la Plataforma de Gestión de Proyectos de Impacto Ambiental',
    documentacion: '/api/docs',
    salud: '/api/salud'
  });
});

// Documentación interactiva (Swagger UI) en /api/docs
const rutaOpenApi = path.join(__dirname, '..', 'docs', 'openapi.yaml');
if (fs.existsSync(rutaOpenApi)) {
  const documentoOpenApi = YAML.parse(fs.readFileSync(rutaOpenApi, 'utf8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(documentoOpenApi));
}

app.use('/api', rutas);

// Siempre al final: 404 y manejador de errores
app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
