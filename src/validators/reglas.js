/**
 * Reglas de validación de cada recurso.
 * Las tenemos todas juntas aquí para que sea fácil compararlas con el
 * diccionario de datos y con los formularios del front (ProjectForm, etc.).
 */

const ROLES = ['admin', 'gestor', 'consultor'];
const TIPOS_PROYECTO = ['infraestructura', 'restauracion', 'conservacion', 'saneamiento', 'energia', 'educacion', 'otro'];
const ESTADOS_PROYECTO = ['planeacion', 'ejecucion', 'finalizado', 'suspendido'];
const COMPONENTES = ['agua', 'aire', 'suelo', 'flora', 'fauna', 'paisaje', 'social'];
const NATURALEZAS = ['positivo', 'negativo'];
const NIVELES = ['bajo', 'moderado', 'alto', 'critico'];
const ESTADOS_ACTIVIDAD = ['pendiente', 'en_progreso', 'completada'];
const TIPOS_LIMITE = ['maximo', 'minimo'];

const reglasRegistro = {
  nombre: { requerido: true, tipo: 'texto', min: 3, max: 100 },
  correo: { requerido: true, tipo: 'correo' },
  password: { requerido: true, tipo: 'texto', min: 8, max: 64 },
  // En el registro público nadie se puede crear como admin
  rol: { tipo: 'texto', opciones: ['gestor', 'consultor'] }
};

const reglasLogin = {
  correo: { requerido: true, tipo: 'correo' },
  password: { requerido: true, tipo: 'texto' }
};

const reglasActualizarUsuario = {
  nombre: { tipo: 'texto', min: 3, max: 100 },
  correo: { tipo: 'correo' },
  password: { tipo: 'texto', min: 8, max: 64 }
};

const reglasProyecto = {
  nombre: { requerido: true, tipo: 'texto', min: 5, max: 150 },
  descripcion: { tipo: 'texto', max: 2000 },
  tipo: { requerido: true, tipo: 'texto', opciones: TIPOS_PROYECTO },
  municipio: { requerido: true, tipo: 'texto', min: 2, max: 80 },
  departamento: { requerido: true, tipo: 'texto', min: 2, max: 80 },
  latitud: { tipo: 'numero', min: -90, max: 90 },
  longitud: { tipo: 'numero', min: -180, max: 180 },
  fechaInicio: { requerido: true, tipo: 'fecha' },
  fechaFin: { tipo: 'fecha' },
  presupuesto: { tipo: 'numero', min: 0, max: 9999999999999 },
  estado: { tipo: 'texto', opciones: ESTADOS_PROYECTO },
  responsableId: { tipo: 'entero', min: 1 }
};

const reglasImpacto = {
  componente: { requerido: true, tipo: 'texto', opciones: COMPONENTES },
  descripcion: { requerido: true, tipo: 'texto', min: 5, max: 255 },
  naturaleza: { requerido: true, tipo: 'texto', opciones: NATURALEZAS },
  magnitud: { requerido: true, tipo: 'entero', min: 1, max: 10 },
  probabilidad: { requerido: true, tipo: 'entero', min: 1, max: 10 },
  medidaManejo: { tipo: 'texto', max: 2000 }
};

const reglasActividad = {
  titulo: { requerido: true, tipo: 'texto', min: 3, max: 150 },
  descripcion: { tipo: 'texto', max: 2000 },
  fechaLimite: { requerido: true, tipo: 'fecha' },
  estado: { tipo: 'texto', opciones: ESTADOS_ACTIVIDAD },
  responsableId: { tipo: 'entero', min: 1 }
};

const reglasMonitoreo = {
  parametro: { requerido: true, tipo: 'texto', min: 2, max: 80 },
  valor: { requerido: true, tipo: 'numero', min: -99999999, max: 99999999 },
  unidad: { requerido: true, tipo: 'texto', min: 1, max: 30 },
  limitePermisible: { tipo: 'numero', min: -99999999, max: 99999999 },
  tipoLimite: { tipo: 'texto', opciones: TIPOS_LIMITE },
  puntoMuestreo: { tipo: 'texto', max: 120 },
  fechaMuestreo: { requerido: true, tipo: 'fecha' },
  observaciones: { tipo: 'texto', max: 2000 }
};

module.exports = {
  ROLES,
  TIPOS_PROYECTO,
  ESTADOS_PROYECTO,
  COMPONENTES,
  NATURALEZAS,
  NIVELES,
  ESTADOS_ACTIVIDAD,
  TIPOS_LIMITE,
  reglasRegistro,
  reglasLogin,
  reglasActualizarUsuario,
  reglasProyecto,
  reglasImpacto,
  reglasActividad,
  reglasMonitoreo
};
