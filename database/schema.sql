-- =====================================================================
--  Plataforma Digital Integral para la Gestión de Proyectos de
--  Impacto Ambiental - Base de datos
--  Autores: Roycer Cervantes y Sebastián Rodríguez
--  SENA - Análisis y Desarrollo de Software (228118)
--  Evidencia GA7-220501096-AA5-EV03
--
--  Motor: MySQL 8 (también corre en MariaDB 10.5+)
--  Cómo usarlo: abrir en MySQL Workbench / phpMyAdmin y ejecutar todo,
--  o desde consola:  mysql -u root -p < database/schema.sql
-- =====================================================================

DROP DATABASE IF EXISTS impacto_ambiental_db;
CREATE DATABASE impacto_ambiental_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci;

USE impacto_ambiental_db;

-- ---------------------------------------------------------------------
-- Usuarios del sistema
--   admin     -> administra todo (usuarios, proyectos, etc.)
--   gestor    -> crea y maneja sus propios proyectos
--   consultor -> solo consulta (auditores, comunidad, docentes)
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100)  NOT NULL,
  correo          VARCHAR(120)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  rol             ENUM('admin','gestor','consultor') NOT NULL DEFAULT 'consultor',
  activo          TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Proyectos con impacto ambiental (obras, restauraciones, monitoreos...)
-- ---------------------------------------------------------------------
CREATE TABLE proyectos (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  codigo           VARCHAR(20)   UNIQUE,
  nombre           VARCHAR(150)  NOT NULL,
  descripcion      TEXT,
  tipo             ENUM('infraestructura','restauracion','conservacion',
                        'saneamiento','energia','educacion','otro') NOT NULL,
  municipio        VARCHAR(80)   NOT NULL,
  departamento     VARCHAR(80)   NOT NULL,
  latitud          DECIMAL(9,6),
  longitud         DECIMAL(9,6),
  fecha_inicio     DATE          NOT NULL,
  fecha_fin        DATE,
  presupuesto      DECIMAL(15,2) DEFAULT 0,
  estado           ENUM('planeacion','ejecucion','finalizado','suspendido')
                                 NOT NULL DEFAULT 'planeacion',
  responsable_id   INT           NOT NULL,
  creado_en        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_proyecto_responsable
    FOREIGN KEY (responsable_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Impactos ambientales identificados en cada proyecto
-- importancia = magnitud x probabilidad (escala 1 a 100)
-- ---------------------------------------------------------------------
CREATE TABLE impactos_ambientales (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  proyecto_id      INT           NOT NULL,
  componente       ENUM('agua','aire','suelo','flora','fauna','paisaje','social') NOT NULL,
  descripcion      VARCHAR(255)  NOT NULL,
  naturaleza       ENUM('positivo','negativo') NOT NULL,
  magnitud         TINYINT       NOT NULL,   -- 1 a 10
  probabilidad     TINYINT       NOT NULL,   -- 1 a 10
  importancia      TINYINT       NOT NULL,   -- calculada por la API
  nivel            ENUM('bajo','moderado','alto','critico') NOT NULL,
  medida_manejo    TEXT,
  creado_en        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_impacto_proyecto
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Actividades / tareas del plan de manejo de cada proyecto
-- ---------------------------------------------------------------------
CREATE TABLE actividades (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  proyecto_id      INT           NOT NULL,
  titulo           VARCHAR(150)  NOT NULL,
  descripcion      TEXT,
  fecha_limite     DATE          NOT NULL,
  estado           ENUM('pendiente','en_progreso','completada') NOT NULL DEFAULT 'pendiente',
  responsable_id   INT,
  creado_en        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_actividad_proyecto
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
  CONSTRAINT fk_actividad_responsable
    FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Monitoreos: mediciones de parámetros ambientales (pH, DBO5, OD, PM10...)
-- tipo_limite: 'maximo' -> el valor no puede pasar el límite
--              'minimo' -> el valor no puede quedar por debajo (ej. oxígeno disuelto)
-- ---------------------------------------------------------------------
CREATE TABLE monitoreos (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  proyecto_id        INT           NOT NULL,
  parametro          VARCHAR(80)   NOT NULL,
  valor              DECIMAL(12,4) NOT NULL,
  unidad             VARCHAR(30)   NOT NULL,
  limite_permisible  DECIMAL(12,4),
  tipo_limite        ENUM('maximo','minimo') NOT NULL DEFAULT 'maximo',
  cumple_norma       TINYINT(1),   -- NULL cuando no hay límite de referencia
  punto_muestreo     VARCHAR(120),
  fecha_muestreo     DATE          NOT NULL,
  observaciones      TEXT,
  creado_en          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_monitoreo_proyecto
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Índices para los filtros que más usa el front
CREATE INDEX idx_proyectos_estado   ON proyectos(estado);
CREATE INDEX idx_impactos_nivel     ON impactos_ambientales(nivel);
CREATE INDEX idx_actividades_estado ON actividades(estado);
