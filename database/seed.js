/**
 * Carga datos de prueba en la base de datos.
 *
 *   npm run seed
 *
 * OJO: borra lo que haya en las tablas y vuelve a insertar todo.
 * Primero hay que haber ejecutado database/schema.sql.
 *
 * Usuarios que quedan creados (todos con contraseña Ambiental2026):
 *   admin@plataforma.com        -> admin
 *   roycer.cervantes@plataforma.com    -> gestor
 *   sebastian.rodriguez@plataforma.com -> gestor
 *   consultor@plataforma.com    -> consultor
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');
const { calcularImportancia, clasificarNivel, evaluarCumplimiento } = require('../src/utils/matrizImpacto');

const PASSWORD_DEMO = 'Ambiental2026';

const usuarios = [
  { nombre: 'Administrador General', correo: 'admin@plataforma.com', rol: 'admin' },
  { nombre: 'Roycer Cervantes', correo: 'roycer.cervantes@plataforma.com', rol: 'gestor' },
  { nombre: 'Sebastián Rodríguez', correo: 'sebastian.rodriguez@plataforma.com', rol: 'gestor' },
  { nombre: 'Consultor Externo', correo: 'consultor@plataforma.com', rol: 'consultor' }
];

// responsable = posición en el arreglo de usuarios (1 = Roycer, 2 = Sebastián)
const proyectos = [
  {
    nombre: 'Restauración de manglar en la Ciénaga Grande de Santa Marta',
    descripcion: 'Siembra de propágulos de mangle rojo y recuperación de caños para mejorar el intercambio de agua dulce y salada.',
    tipo: 'restauracion', municipio: 'Pueblo Viejo', departamento: 'Magdalena',
    latitud: 10.991, longitud: -74.282, fechaInicio: '2026-02-01', fechaFin: '2027-01-31',
    presupuesto: 450000000, estado: 'ejecucion', responsable: 1,
    impactos: [
      { componente: 'flora', descripcion: 'Recuperación de cobertura de manglar', naturaleza: 'positivo', magnitud: 8, probabilidad: 9, medidaManejo: 'Seguimiento trimestral de supervivencia de plántulas' },
      { componente: 'agua', descripcion: 'Aumento temporal de sólidos suspendidos por dragado de caños', naturaleza: 'negativo', magnitud: 6, probabilidad: 7, medidaManejo: 'Uso de barreras de sedimentos y dragado en marea baja' },
      { componente: 'social', descripcion: 'Empleo para pescadores de la zona como sembradores', naturaleza: 'positivo', magnitud: 5, probabilidad: 8, medidaManejo: 'Contratación prioritaria de la comunidad local' }
    ],
    actividades: [
      { titulo: 'Recolección de propágulos de mangle rojo', fechaLimite: '2026-03-15', estado: 'completada', responsable: 1 },
      { titulo: 'Dragado manual del caño Clarín', fechaLimite: '2026-09-30', estado: 'en_progreso', responsable: 1 },
      { titulo: 'Informe semestral a Corpamag', fechaLimite: '2026-10-10', estado: 'pendiente', responsable: 2 }
    ],
    monitoreos: [
      { parametro: 'Salinidad', valor: 28.5, unidad: 'PSU', limitePermisible: 35, tipoLimite: 'maximo', puntoMuestreo: 'Caño Clarín', fechaMuestreo: '2026-08-20' },
      { parametro: 'Oxígeno disuelto', valor: 3.1, unidad: 'mg/L', limitePermisible: 4, tipoLimite: 'minimo', puntoMuestreo: 'Boca de la Barra', fechaMuestreo: '2026-08-20', observaciones: 'Valor bajo, posible proliferación de algas' }
    ]
  },
  {
    nombre: 'Planta de tratamiento de aguas residuales del sector Gaira',
    descripcion: 'Construcción de una PTAR con lagunas de estabilización para reducir vertimientos directos al mar.',
    tipo: 'saneamiento', municipio: 'Santa Marta', departamento: 'Magdalena',
    latitud: 11.183, longitud: -74.226, fechaInicio: '2026-05-10', fechaFin: '2027-12-15',
    presupuesto: 1800000000, estado: 'planeacion', responsable: 2,
    impactos: [
      { componente: 'agua', descripcion: 'Reducción de vertimientos de aguas residuales al mar', naturaleza: 'positivo', magnitud: 9, probabilidad: 9, medidaManejo: 'Monitoreo mensual del efluente' },
      { componente: 'aire', descripcion: 'Generación de olores en las lagunas', naturaleza: 'negativo', magnitud: 5, probabilidad: 6, medidaManejo: 'Barrera viva perimetral y control de carga orgánica' },
      { componente: 'suelo', descripcion: 'Remoción de cobertura vegetal en el lote', naturaleza: 'negativo', magnitud: 4, probabilidad: 9, medidaManejo: 'Compensación forestal 1:3' }
    ],
    actividades: [
      { titulo: 'Estudio de suelos del lote', fechaLimite: '2026-07-30', estado: 'completada', responsable: 2 },
      { titulo: 'Tramitar permiso de vertimientos', fechaLimite: '2026-11-30', estado: 'en_progreso', responsable: 2 }
    ],
    monitoreos: [
      { parametro: 'DBO5 (agua cruda)', valor: 320, unidad: 'mg/L', limitePermisible: 90, tipoLimite: 'maximo', puntoMuestreo: 'Colector principal', fechaMuestreo: '2026-07-12', observaciones: 'Línea base antes del tratamiento' }
    ]
  },
  {
    nombre: 'Monitoreo de calidad del agua del río Manzanares',
    descripcion: 'Campañas de muestreo para evaluar la calidad del río a su paso por la ciudad.',
    tipo: 'conservacion', municipio: 'Santa Marta', departamento: 'Magdalena',
    latitud: 11.237, longitud: -74.188, fechaInicio: '2026-01-15', fechaFin: '2026-12-15',
    presupuesto: 85000000, estado: 'ejecucion', responsable: 1,
    impactos: [
      { componente: 'agua', descripcion: 'Información para la toma de decisiones sobre vertimientos ilegales', naturaleza: 'positivo', magnitud: 6, probabilidad: 8, medidaManejo: 'Publicar resultados en la plataforma' }
    ],
    actividades: [
      { titulo: 'Campaña de muestreo temporada seca', fechaLimite: '2026-03-30', estado: 'completada', responsable: 1 },
      { titulo: 'Campaña de muestreo temporada de lluvias', fechaLimite: '2026-11-15', estado: 'pendiente', responsable: 1 }
    ],
    monitoreos: [
      { parametro: 'pH', valor: 7.4, unidad: 'unidades', limitePermisible: 9, tipoLimite: 'maximo', puntoMuestreo: 'Puente de Bavaria', fechaMuestreo: '2026-03-18' },
      { parametro: 'Coliformes totales', valor: 24000, unidad: 'NMP/100mL', limitePermisible: 20000, tipoLimite: 'maximo', puntoMuestreo: 'Desembocadura', fechaMuestreo: '2026-03-18' }
    ]
  }
];

async function sembrarDatos() {
  console.log('Limpiando tablas...');
  await pool.query('DELETE FROM monitoreos');
  await pool.query('DELETE FROM actividades');
  await pool.query('DELETE FROM impactos_ambientales');
  await pool.query('DELETE FROM proyectos');
  await pool.query('DELETE FROM usuarios');

  console.log('Creando usuarios...');
  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);
  const idsUsuarios = [];
  for (const usuario of usuarios) {
    const [resultado] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES (?, ?, ?, ?)',
      [usuario.nombre, usuario.correo, passwordHash, usuario.rol]
    );
    idsUsuarios.push(resultado.insertId);
  }

  console.log('Creando proyectos con sus impactos, actividades y monitoreos...');
  for (const proyecto of proyectos) {
    const [resultado] = await pool.query(
      `INSERT INTO proyectos
        (nombre, descripcion, tipo, municipio, departamento, latitud, longitud,
         fecha_inicio, fecha_fin, presupuesto, estado, responsable_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proyecto.nombre, proyecto.descripcion, proyecto.tipo, proyecto.municipio, proyecto.departamento,
        proyecto.latitud, proyecto.longitud, proyecto.fechaInicio, proyecto.fechaFin,
        proyecto.presupuesto, proyecto.estado, idsUsuarios[proyecto.responsable]
      ]
    );
    const proyectoId = resultado.insertId;
    const codigo = `PIA-${proyecto.fechaInicio.slice(0, 4)}-${String(proyectoId).padStart(4, '0')}`;
    await pool.query('UPDATE proyectos SET codigo = ? WHERE id = ?', [codigo, proyectoId]);

    for (const impacto of proyecto.impactos) {
      const importancia = calcularImportancia(impacto.magnitud, impacto.probabilidad);
      await pool.query(
        `INSERT INTO impactos_ambientales
          (proyecto_id, componente, descripcion, naturaleza, magnitud, probabilidad, importancia, nivel, medida_manejo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [proyectoId, impacto.componente, impacto.descripcion, impacto.naturaleza, impacto.magnitud,
          impacto.probabilidad, importancia, clasificarNivel(importancia), impacto.medidaManejo]
      );
    }

    for (const actividad of proyecto.actividades) {
      await pool.query(
        `INSERT INTO actividades (proyecto_id, titulo, descripcion, fecha_limite, estado, responsable_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [proyectoId, actividad.titulo, actividad.descripcion || null, actividad.fechaLimite,
          actividad.estado, idsUsuarios[actividad.responsable]]
      );
    }

    for (const monitoreo of proyecto.monitoreos) {
      const cumple = evaluarCumplimiento(monitoreo.valor, monitoreo.limitePermisible, monitoreo.tipoLimite);
      await pool.query(
        `INSERT INTO monitoreos
          (proyecto_id, parametro, valor, unidad, limite_permisible, tipo_limite, cumple_norma,
           punto_muestreo, fecha_muestreo, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [proyectoId, monitoreo.parametro, monitoreo.valor, monitoreo.unidad, monitoreo.limitePermisible,
          monitoreo.tipoLimite, cumple === null ? null : Number(cumple), monitoreo.puntoMuestreo,
          monitoreo.fechaMuestreo, monitoreo.observaciones || null]
      );
    }
  }

  console.log('Listo. Datos de prueba cargados.');
  console.log(`Contraseña de todos los usuarios de prueba: ${PASSWORD_DEMO}`);
}

// Solo se ejecuta si corremos el archivo directamente (npm run seed)
if (require.main === module) {
  sembrarDatos()
    .catch((error) => {
      console.error('Error cargando los datos de prueba:', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { sembrarDatos, PASSWORD_DEMO };
