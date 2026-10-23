/**
 * Punto de entrada: carga las variables de entorno y levanta el servidor.
 *   npm run dev   -> con nodemon (se reinicia solo al guardar)
 *   npm start     -> normal
 */
require('dotenv').config();

const app = require('./app');
const { probarConexion } = require('./config/db');

const PUERTO = process.env.PORT || 3000;

async function iniciarServidor() {
  if (!process.env.JWT_SECRET) {
    console.error('Falta JWT_SECRET en el archivo .env (copia .env.example como .env)');
    process.exit(1);
  }

  try {
    await probarConexion();
    console.log('Conectado a MySQL correctamente');
  } catch (error) {
    // No detenemos el servidor: así /api/salud puede avisar que la BD está caída
    console.warn('No se pudo conectar a MySQL:', error.message);
    console.warn('Revisa que MySQL esté encendido y los datos del archivo .env');
  }

  app.listen(PUERTO, () => {
    console.log(`API escuchando en http://localhost:${PUERTO}`);
    console.log(`Documentación en http://localhost:${PUERTO}/api/docs`);
  });
}

iniciarServidor();
