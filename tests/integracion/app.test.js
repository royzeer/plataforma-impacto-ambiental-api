/**
 * Pruebas de integración de la app Express con Supertest.
 *
 * Usamos app.js directamente (sin levantar el servidor) y solo probamos
 * rutas que NO necesitan MySQL: bienvenida, Swagger, rutas inexistentes,
 * JSON mal escrito y la protección con token. Así estas pruebas corren
 * en cualquier PC y en GitHub Actions sin base de datos.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto_solo_para_pruebas';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');

afterAll(async () => {
  await pool.end();
});

describe('Rutas públicas', () => {
  test('GET / responde la bienvenida con los enlaces útiles', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.documentacion).toBe('/api/docs');
  });

  test('GET /api/docs/ sirve la documentación Swagger', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger');
  });
});

describe('Manejo de errores', () => {
  test('una ruta que no existe responde 404 con el formato estándar', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      ok: false,
      mensaje: 'La ruta GET /api/no-existe no existe en la API'
    });
  });

  test('un JSON mal escrito responde 400 y no 500', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"correo": "admin@plataforma.com",}');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe('Seguridad con JWT', () => {
  const rutasProtegidas = [
    ['get', '/api/auth/perfil'],
    ['get', '/api/usuarios'],
    ['get', '/api/proyectos'],
    ['post', '/api/proyectos'],
    ['get', '/api/reportes/dashboard']
  ];

  test.each(rutasProtegidas)('%s %s sin token responde 401', async (metodo, ruta) => {
    const res = await request(app)[metodo](ruta);
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  test('un token con firma falsa responde 401 "Token inválido"', async () => {
    const tokenFalso = jwt.sign({ id: 1 }, 'otra_clave_que_no_es_la_del_servidor');
    const res = await request(app)
      .get('/api/proyectos')
      .set('Authorization', `Bearer ${tokenFalso}`);
    expect(res.status).toBe(401);
    expect(res.body.mensaje).toBe('Token inválido');
  });

  test('un token vencido responde 401 pidiendo iniciar sesión de nuevo', async () => {
    const tokenVencido = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app)
      .get('/api/proyectos')
      .set('Authorization', `Bearer ${tokenVencido}`);
    expect(res.status).toBe(401);
    expect(res.body.mensaje).toMatch(/expiró/);
  });
});
