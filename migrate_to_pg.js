
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URI de Supavisor (Soporta IPv4) — configurar en .env o variable de entorno
const PG_URL = process.env.DATABASE_URL;
if (!PG_URL) {
    console.error('❌ DATABASE_URL no definida. Configúrala en .env o variable de entorno.');
    process.exit(1);
}
const SQLITE_PATH = path.join(__dirname, 'mantenimiento.db');

async function migrate() {
    console.log('--- Iniciando Migración a Supabase (IPv4 Pooler) ---');
    
    // Configuración SSL forzada para evitar errores de certificados self-signed
    const pool = new pg.Pool({ 
        connectionString: PG_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    let pgClient;
    try {
        console.log('Intentando conectar...');
        pgClient = await pool.connect();
        console.log('✅ Conexión exitosa a PostgreSQL');
    } catch (e) {
        console.error('❌ Error de conexión:', e.message);
        console.error(e);
        process.exit(1);
    }

    const SQL = await initSqlJs();
    const db = new SQL.Database(fs.readFileSync(SQLITE_PATH));

    try {
        await pgClient.query('BEGIN');

        const migrateTable = async (tableName) => {
            console.log(`Migrando tabla: ${tableName}...`);
            const res = db.exec(`SELECT * FROM ${tableName}`);
            if (res.length === 0) return;
            
            const rows = res[0].values;
            const cols = res[0].columns;

            for (const row of rows) {
              const obj = {};
              cols.forEach((col, i) => obj[col] = row[i]);
              
              const keys = Object.keys(obj).filter(k => k !== 'id');
              const values = keys.map(k => obj[k]);
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
              
              const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
              await pgClient.query(query, values);
            }
        };

        console.log('Preparando esquema en PostgreSQL...');
        const schema = [
            `CREATE TABLE IF NOT EXISTS assets (
                id SERIAL PRIMARY KEY,
                codigo_patrimonial TEXT UNIQUE NOT NULL,
                tipo_unidad TEXT NOT NULL,
                fuente TEXT DEFAULT '',
                placa_principal TEXT DEFAULT '',
                placa_secundaria TEXT DEFAULT '',
                anio_fabricacion INTEGER,
                estado TEXT DEFAULT 'Operativo',
                criticidad TEXT DEFAULT 'Media',
                forma_control TEXT DEFAULT 'Kilometraje',
                km_actual REAL DEFAULT 0,
                horometro_actual REAL DEFAULT 0,
                fecha_alta DATE DEFAULT CURRENT_DATE,
                observaciones TEXT DEFAULT '',
                calidad_dato_inicial TEXT DEFAULT 'no disponible',
                horas_programadas_estandar REAL DEFAULT 8,
                activo INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS operators (
                id SERIAL PRIMARY KEY,
                nombre TEXT NOT NULL,
                area TEXT DEFAULT '',
                observaciones TEXT DEFAULT '',
                activo INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS catalogs (
                id SERIAL PRIMARY KEY,
                tipo TEXT NOT NULL,
                valor TEXT NOT NULL,
                activo INTEGER DEFAULT 1,
                UNIQUE(tipo, valor)
            )`,
            `CREATE TABLE IF NOT EXISTS initial_diagnosis (
                id SERIAL PRIMARY KEY,
                asset_id INTEGER NOT NULL UNIQUE REFERENCES assets(id),
                km_actual REAL DEFAULT 0,
                horometro_actual REAL DEFAULT 0,
                fecha_ultimo_preventivo TEXT,
                lectura_ultimo_preventivo REAL DEFAULT 0,
                estado_tecnico_inicial TEXT DEFAULT '',
                observacion_tecnica TEXT DEFAULT '',
                calidad_dato TEXT DEFAULT 'no disponible',
                recomendacion_manual TEXT DEFAULT '',
                prioridad_manual TEXT DEFAULT '',
                fecha_diagnostico TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS daily_records (
                id SERIAL PRIMARY KEY,
                fecha DATE NOT NULL,
                asset_id INTEGER NOT NULL REFERENCES assets(id),
                operador_id INTEGER REFERENCES operators(id),
                horas_programadas REAL DEFAULT 8,
                horas_reales REAL DEFAULT 0,
                horas_parada REAL DEFAULT 0,
                hora_inicio_parada TEXT DEFAULT '',
                hora_fin_parada TEXT DEFAULT '',
                km_inicial REAL,
                km_final REAL,
                km_recorridos REAL,
                horometro_inicial REAL,
                horometro_final REAL,
                estado_dia TEXT DEFAULT 'Operativo',
                observaciones TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS failures (
                id SERIAL PRIMARY KEY,
                fecha DATE NOT NULL,
                asset_id INTEGER NOT NULL REFERENCES assets(id),
                operador_id INTEGER REFERENCES operators(id),
                hora_inicio TEXT,
                hora_fin TEXT,
                duracion_horas REAL DEFAULT 0,
                tipo_evento TEXT,
                clasificacion_falla TEXT,
                sistema_afectado TEXT,
                severidad TEXT,
                descripcion TEXT,
                causa_probable TEXT,
                accion_correctiva TEXT,
                inmovilizo_unidad INTEGER DEFAULT 0,
                es_correctiva_no_programada INTEGER DEFAULT 1,
                costo_reparacion REAL,
                observaciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS preventive_events (
                id SERIAL PRIMARY KEY,
                asset_id INTEGER NOT NULL REFERENCES assets(id),
                tipo_preventivo TEXT,
                fecha_mantenimiento DATE NOT NULL,
                lectura_al_momento REAL DEFAULT 0,
                intervalo REAL DEFAULT 0,
                unidad_control TEXT DEFAULT 'km',
                siguiente_objetivo REAL DEFAULT 0,
                estado TEXT DEFAULT 'Ejecutado',
                costo REAL,
                observaciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS preventive_config (
                id SERIAL PRIMARY KEY,
                asset_id INTEGER REFERENCES assets(id),
                tipo_unidad TEXT,
                tipo_preventivo TEXT NOT NULL,
                intervalo REAL NOT NULL,
                unidad_control TEXT DEFAULT 'km',
                criterio_alerta_temprana REAL DEFAULT 90,
                criterio_alerta_critica REAL DEFAULT 95
            )`,
            `CREATE TABLE IF NOT EXISTS water_readings (
                id SERIAL PRIMARY KEY,
                fecha DATE NOT NULL,
                distrito TEXT NOT NULL,
                zona TEXT NOT NULL,
                presion REAL NOT NULL,
                continuidad REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(fecha, distrito, zona)
            )`
        ];

        for (const q of schema) await pgClient.query(q);

        const tables = ['assets', 'operators', 'catalogs', 'initial_diagnosis', 'daily_records', 'failures', 'preventive_events', 'preventive_config', 'water_readings'];
        for (const t of tables) await migrateTable(t);

        await pgClient.query('COMMIT');
        console.log('--- MIGRACION COMPLETADA EXITOSAMENTE ---');
    } catch (err) {
        if (pgClient) await pgClient.query('ROLLBACK');
        console.error('Error durante migración:', err);
    } finally {
        if (pgClient) pgClient.release();
        await pool.end();
    }
}

migrate();
