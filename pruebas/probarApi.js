/**
 * Prueba rápida de todos los servicios de la API.
 *
 * Cómo usarlo (con la API corriendo en otra terminal y después de npm run seed):
 *   npm run probar
 *
 * Recorre los endpoints en orden (registro, login, CRUD de proyectos,
 * impactos, actividades, monitoreos, reportes...) y revisa que cada uno
 * devuelva el código HTTP que esperamos. Al final guarda las peticiones y
 * respuestas en docs/ejemplos-respuestas.json, que usamos para armar la
 * documentación de los servicios.
 *
 * No usa librerías: solo fetch, que ya viene en Node 18 o superior.
 */
const fs = require('fs');
const path = require('path');

const URL_BASE = process.env.URL_API || 'http://localhost:3000/api';
const PASSWORD_DEMO = 'Ambiental2026';

const ejemplos = {};
let aprobadas = 0;
let fallidas = 0;

async function peticion(nombre, metodo, ruta, { token, cuerpo, esperado, crudo } = {}) {
  const opciones = { method: metodo, headers: {} };
  if (token) opciones.headers.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined || crudo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = crudo !== undefined ? crudo : JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(`${URL_BASE}${ruta}`, opciones);
  const texto = await respuesta.text();
  let json;
  try { json = JSON.parse(texto); } catch { json = texto; }

  const paso = respuesta.status === esperado;
  if (paso) aprobadas += 1; else fallidas += 1;
  console.log(`${paso ? 'OK   ' : 'FALLA'} [${respuesta.status}] ${metodo.padEnd(6)} ${ruta}  -> ${nombre}`);
  if (!paso) console.log('       Esperado:', esperado, 'Respuesta:', JSON.stringify(json));

  ejemplos[nombre] = {
    peticion: { metodo, url: `/api${ruta}`, conToken: Boolean(token), cuerpo: cuerpo ?? (crudo !== undefined ? crudo : null) },
    respuesta: { estado: respuesta.status, cuerpo: json }
  };
  return json;
}

async function ejecutarPruebas() {
  console.log(`\nProbando la API en ${URL_BASE}\n`);

  // ---------------- Salud ----------------
  await peticion('salud', 'GET', '/salud', { esperado: 200 });

  // ---------------- Autenticación ----------------
  const correoNuevo = `laura.mendoza.${Date.now()}@correo.com`;
  const registro = await peticion('registro_ok', 'POST', '/auth/registro', {
    cuerpo: { nombre: 'Laura Mendoza', correo: correoNuevo, password: 'Manglar2026', rol: 'gestor' },
    esperado: 201
  });
  const tokenLaura = registro.datos.token;
  const idLaura = registro.datos.usuario.id;

  await peticion('registro_correo_repetido', 'POST', '/auth/registro', {
    cuerpo: { nombre: 'Otra Persona', correo: 'admin@plataforma.com', password: 'Prueba2026' },
    esperado: 409
  });
  await peticion('registro_datos_invalidos', 'POST', '/auth/registro', {
    cuerpo: { nombre: 'Al', correo: 'correo-malo', password: '123', rol: 'admin' },
    esperado: 400
  });

  const loginAdmin = await peticion('login_ok', 'POST', '/auth/login', {
    cuerpo: { correo: 'admin@plataforma.com', password: PASSWORD_DEMO }, esperado: 200
  });
  const tokenAdmin = loginAdmin.datos.token;
  await peticion('login_fallido', 'POST', '/auth/login', {
    cuerpo: { correo: 'admin@plataforma.com', password: 'claveEquivocada1' }, esperado: 401
  });
  const tokenRoycer = (await peticion('login_gestor', 'POST', '/auth/login', {
    cuerpo: { correo: 'roycer.cervantes@plataforma.com', password: PASSWORD_DEMO }, esperado: 200
  })).datos.token;
  const tokenSebastian = (await peticion('login_gestor_2', 'POST', '/auth/login', {
    cuerpo: { correo: 'sebastian.rodriguez@plataforma.com', password: PASSWORD_DEMO }, esperado: 200
  })).datos.token;
  const tokenConsultor = (await peticion('login_consultor', 'POST', '/auth/login', {
    cuerpo: { correo: 'consultor@plataforma.com', password: PASSWORD_DEMO }, esperado: 200
  })).datos.token;

  await peticion('perfil', 'GET', '/auth/perfil', { token: tokenRoycer, esperado: 200 });
  await peticion('perfil_sin_token', 'GET', '/auth/perfil', { esperado: 401 });
  await peticion('token_invalido', 'GET', '/auth/perfil', { token: 'abc.def.ghi', esperado: 401 });

  // ---------------- Usuarios ----------------
  await peticion('usuarios_listar', 'GET', '/usuarios?limite=5', { token: tokenAdmin, esperado: 200 });
  await peticion('usuarios_listar_sin_permiso', 'GET', '/usuarios', { token: tokenConsultor, esperado: 403 });
  await peticion('usuario_obtener', 'GET', `/usuarios/${idLaura}`, { token: tokenLaura, esperado: 200 });
  await peticion('usuario_obtener_ajeno', 'GET', `/usuarios/${idLaura}`, { token: tokenConsultor, esperado: 403 });
  await peticion('usuario_actualizar', 'PUT', `/usuarios/${idLaura}`, {
    token: tokenLaura, cuerpo: { nombre: 'Laura Mendoza Pérez' }, esperado: 200
  });
  await peticion('usuario_cambiar_rol', 'PATCH', `/usuarios/${idLaura}/rol`, {
    token: tokenAdmin, cuerpo: { rol: 'consultor' }, esperado: 200
  });

  // ---------------- Proyectos ----------------
  await peticion('proyectos_listar', 'GET', '/proyectos?limite=5', { token: tokenConsultor, esperado: 200 });
  await peticion('proyectos_filtrar', 'GET', '/proyectos?estado=ejecucion&buscar=manglar', { token: tokenConsultor, esperado: 200 });
  await peticion('proyectos_filtro_invalido', 'GET', '/proyectos?estado=terminado', { token: tokenConsultor, esperado: 400 });

  const nuevoProyecto = {
    nombre: 'Reforestación de la cuenca alta del río Gaira',
    descripcion: 'Siembra de especies nativas en zonas de recarga hídrica afectadas por incendios.',
    tipo: 'restauracion',
    municipio: 'Santa Marta',
    departamento: 'Magdalena',
    latitud: 11.112,
    longitud: -74.071,
    fechaInicio: '2026-11-01',
    fechaFin: '2027-10-31',
    presupuesto: 120000000
  };
  const proyecto = await peticion('proyecto_crear', 'POST', '/proyectos', {
    token: tokenRoycer, cuerpo: nuevoProyecto, esperado: 201
  });
  const idProyecto = proyecto.datos.id;

  await peticion('proyecto_crear_invalido', 'POST', '/proyectos', {
    token: tokenRoycer,
    cuerpo: { ...nuevoProyecto, tipo: 'mineria', fechaFin: '2026-01-01', latitud: 200 },
    esperado: 400
  });
  await peticion('proyecto_crear_sin_permiso', 'POST', '/proyectos', {
    token: tokenConsultor, cuerpo: nuevoProyecto, esperado: 403
  });
  await peticion('proyecto_obtener', 'GET', '/proyectos/1', { token: tokenConsultor, esperado: 200 });
  await peticion('proyecto_id_invalido', 'GET', '/proyectos/abc', { token: tokenConsultor, esperado: 400 });
  await peticion('proyecto_actualizar', 'PUT', `/proyectos/${idProyecto}`, {
    token: tokenRoycer, cuerpo: { presupuesto: 135000000, descripcion: 'Siembra de 15.000 árboles nativos en zonas de recarga hídrica.' }, esperado: 200
  });
  await peticion('proyecto_actualizar_ajeno', 'PUT', `/proyectos/${idProyecto}`, {
    token: tokenSebastian, cuerpo: { presupuesto: 1 }, esperado: 403
  });
  await peticion('proyecto_cambiar_estado', 'PATCH', `/proyectos/${idProyecto}/estado`, {
    token: tokenRoycer, cuerpo: { estado: 'ejecucion' }, esperado: 200
  });

  // ---------------- Impactos ----------------
  const impacto = await peticion('impacto_crear', 'POST', `/proyectos/${idProyecto}/impactos`, {
    token: tokenRoycer,
    cuerpo: {
      componente: 'suelo',
      descripcion: 'Erosión por remoción de maleza en pendientes fuertes',
      naturaleza: 'negativo',
      magnitud: 8,
      probabilidad: 9,
      medidaManejo: 'Siembra en curvas de nivel y trinchos de contención'
    },
    esperado: 201
  });
  const idImpacto = impacto.datos.id;
  await peticion('impacto_crear_invalido', 'POST', `/proyectos/${idProyecto}/impactos`, {
    token: tokenRoycer, cuerpo: { componente: 'ruido', descripcion: 'x', naturaleza: 'neutro', magnitud: 15, probabilidad: 0 }, esperado: 400
  });
  await peticion('impactos_listar', 'GET', `/proyectos/${idProyecto}/impactos?nivel=critico`, { token: tokenConsultor, esperado: 200 });
  await peticion('impacto_obtener', 'GET', `/impactos/${idImpacto}`, { token: tokenConsultor, esperado: 200 });
  await peticion('impacto_actualizar', 'PUT', `/impactos/${idImpacto}`, {
    token: tokenRoycer, cuerpo: { magnitud: 5 }, esperado: 200
  });

  // ---------------- Actividades ----------------
  const actividad = await peticion('actividad_crear', 'POST', `/proyectos/${idProyecto}/actividades`, {
    token: tokenRoycer,
    cuerpo: {
      titulo: 'Construcción del vivero temporal',
      descripcion: 'Vivero para 5.000 plántulas de guáimaro y ceiba',
      fechaLimite: '2026-12-15',
      responsableId: 2
    },
    esperado: 201
  });
  const idActividad = actividad.datos.id;
  await peticion('actividad_crear_fecha_invalida', 'POST', `/proyectos/${idProyecto}/actividades`, {
    token: tokenRoycer, cuerpo: { titulo: 'Tarea con fecha mala', fechaLimite: '2026-01-10' }, esperado: 400
  });
  await peticion('actividades_listar', 'GET', `/proyectos/${idProyecto}/actividades`, { token: tokenConsultor, esperado: 200 });
  await peticion('actividad_obtener', 'GET', `/actividades/${idActividad}`, { token: tokenConsultor, esperado: 200 });
  await peticion('actividad_actualizar', 'PUT', `/actividades/${idActividad}`, {
    token: tokenRoycer, cuerpo: { fechaLimite: '2026-12-20', estado: 'en_progreso' }, esperado: 200
  });
  await peticion('actividad_cambiar_estado', 'PATCH', `/actividades/${idActividad}/estado`, {
    token: tokenRoycer, cuerpo: { estado: 'completada' }, esperado: 200
  });

  // ---------------- Monitoreos ----------------
  const monitoreo = await peticion('monitoreo_crear', 'POST', `/proyectos/${idProyecto}/monitoreos`, {
    token: tokenRoycer,
    cuerpo: {
      parametro: 'Oxígeno disuelto',
      valor: 3.2,
      unidad: 'mg/L',
      limitePermisible: 4,
      tipoLimite: 'minimo',
      puntoMuestreo: 'Quebrada Mamatoco',
      fechaMuestreo: '2026-10-20',
      observaciones: 'Muestreo después de lluvias fuertes'
    },
    esperado: 201
  });
  const idMonitoreo = monitoreo.datos.id;
  await peticion('monitoreo_crear_fecha_futura', 'POST', `/proyectos/${idProyecto}/monitoreos`, {
    token: tokenRoycer, cuerpo: { parametro: 'pH', valor: 7, unidad: 'unidades', fechaMuestreo: '2030-01-01' }, esperado: 400
  });
  await peticion('monitoreos_listar', 'GET', `/proyectos/${idProyecto}/monitoreos?cumpleNorma=false`, { token: tokenConsultor, esperado: 200 });
  await peticion('monitoreo_obtener', 'GET', `/monitoreos/${idMonitoreo}`, { token: tokenConsultor, esperado: 200 });
  await peticion('monitoreo_actualizar', 'PUT', `/monitoreos/${idMonitoreo}`, {
    token: tokenRoycer, cuerpo: { valor: 5.6, observaciones: 'Segundo muestreo, ya en norma' }, esperado: 200
  });

  // ---------------- Reportes ----------------
  await peticion('reporte_dashboard', 'GET', '/reportes/dashboard', { token: tokenConsultor, esperado: 200 });
  await peticion('reporte_proyecto', 'GET', `/reportes/proyectos/${idProyecto}`, { token: tokenConsultor, esperado: 200 });

  // ---------------- Eliminaciones ----------------
  await peticion('monitoreo_eliminar', 'DELETE', `/monitoreos/${idMonitoreo}`, { token: tokenRoycer, esperado: 200 });
  await peticion('actividad_eliminar', 'DELETE', `/actividades/${idActividad}`, { token: tokenRoycer, esperado: 200 });
  await peticion('impacto_eliminar', 'DELETE', `/impactos/${idImpacto}`, { token: tokenRoycer, esperado: 200 });
  await peticion('impacto_no_existe', 'GET', `/impactos/${idImpacto}`, { token: tokenRoycer, esperado: 404 });
  await peticion('proyecto_eliminar', 'DELETE', `/proyectos/${idProyecto}`, { token: tokenRoycer, esperado: 200 });
  await peticion('proyecto_no_existe', 'GET', `/proyectos/${idProyecto}`, { token: tokenRoycer, esperado: 404 });

  await peticion('usuario_desactivar', 'DELETE', `/usuarios/${idLaura}`, { token: tokenAdmin, esperado: 200 });
  await peticion('login_usuario_desactivado', 'POST', '/auth/login', {
    cuerpo: { correo: correoNuevo, password: 'Manglar2026' }, esperado: 403
  });
  await peticion('usuario_activar', 'PATCH', `/usuarios/${idLaura}/activar`, { token: tokenAdmin, esperado: 200 });

  // ---------------- Errores generales ----------------
  await peticion('ruta_inexistente', 'GET', '/esta-ruta-no-existe', { esperado: 404 });
  await peticion('json_mal_formado', 'POST', '/auth/login', { crudo: '{"correo": "admin@plataforma.com",}', esperado: 400 });

  // ---------------- Resultado ----------------
  const rutaEjemplos = path.join(__dirname, '..', 'docs', 'ejemplos-respuestas.json');
  fs.writeFileSync(rutaEjemplos, JSON.stringify(ejemplos, null, 2));

  console.log(`\nResultado: ${aprobadas} pruebas OK, ${fallidas} con falla.`);
  console.log(`Ejemplos guardados en ${rutaEjemplos}\n`);
  if (fallidas > 0) process.exitCode = 1;
}

ejecutarPruebas().catch((error) => {
  console.error('No se pudo terminar la prueba:', error.message);
  console.error('¿Está corriendo la API? (npm run dev)');
  process.exitCode = 1;
});
