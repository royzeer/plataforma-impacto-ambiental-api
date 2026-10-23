/**
 * Reglas de quién puede modificar qué.
 *
 * Lo pensamos así:
 *  - admin: puede todo.
 *  - gestor: puede crear proyectos y modificar SOLO los proyectos donde él
 *            es el responsable (y todo lo que cuelga de ellos: impactos,
 *            actividades y monitoreos).
 *  - consultor: solo puede ver.
 */
const ProyectoModelo = require('../models/ProyectoModelo');
const { ErrorApi } = require('./respuesta');

function puedeEditarProyecto(usuario, proyecto) {
  if (usuario.rol === 'admin') return true;
  return usuario.rol === 'gestor' && proyecto.responsableId === usuario.id;
}

/**
 * Busca el proyecto y revisa permisos en un solo paso.
 * Si no existe -> 404. Si se va a modificar y no tiene permiso -> 403.
 */
async function obtenerProyectoConPermiso(proyectoId, usuario, { paraEditar = false } = {}) {
  const proyecto = await ProyectoModelo.buscarPorId(proyectoId);
  if (!proyecto) {
    throw new ErrorApi(404, `No existe un proyecto con id ${proyectoId}`);
  }
  if (paraEditar && !puedeEditarProyecto(usuario, proyecto)) {
    throw new ErrorApi(403, 'Solo el responsable del proyecto o un administrador pueden modificarlo');
  }
  return proyecto;
}

module.exports = { puedeEditarProyecto, obtenerProyectoConPermiso };
