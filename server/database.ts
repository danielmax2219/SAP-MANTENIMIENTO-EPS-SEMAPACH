import pg from 'pg'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
    console.error('[DB] ❌ DATABASE_URL no definida. Revisa tu archivo .env')
    process.exit(1)
}
const cleanPgUrl = DATABASE_URL.split('?')[0]

const pool = new pg.Pool({
    connectionString: cleanPgUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
})

pool.on('error', (err) => {
    console.error('[DB] Error inesperado en el pool:', err)
})

export async function initDb() {
    try {
        const client = await pool.connect()
        console.log('[DB] ✅ Conexión exitosa a PostgreSQL (Supabase)')
        client.release()

        const migrations = [
            `ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS hora_inicio_jornada TEXT DEFAULT ''`,
            `ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS hora_fin_jornada TEXT DEFAULT ''`,
            `ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS jornada_completa INTEGER DEFAULT 0`,
            `UPDATE daily_records SET jornada_completa = 1 WHERE jornada_completa = 0 AND km_final IS NOT NULL`,
            // === MANTENIMIENTO UNIFICADO ===
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'fleet'`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS station_id INTEGER`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS marca TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS modelo TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS serie TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS potencia_hp REAL`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS potencia_kw REAL`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS voltaje TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS tension TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS especificaciones_tecnicas TEXT`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS activo INTEGER DEFAULT 1`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS calidad_dato_inicial TEXT DEFAULT 'no disponible'`,
            `ALTER TABLE assets ADD COLUMN IF NOT EXISTS horas_programadas_estandar INTEGER DEFAULT 8`,
            `CREATE INDEX IF NOT EXISTS idx_assets_categoria ON assets(categoria)`,
            `CREATE INDEX IF NOT EXISTS idx_assets_station ON assets(station_id)`,
            `CREATE TABLE IF NOT EXISTS ptap_readings (
              id SERIAL PRIMARY KEY, fecha DATE NOT NULL, hora TEXT NOT NULL, operador TEXT DEFAULT '',
              caudal REAL DEFAULT 0, dosis_aluminio REAL DEFAULT 0, dosis_anionico REAL DEFAULT 0,
              apertura_aluminio REAL DEFAULT 0, apertura_anionico REAL DEFAULT 0,
              ingreso_turbiedad REAL DEFAULT 0, ingreso_conductividad REAL DEFAULT 0,
              ingreso_color REAL DEFAULT 0, ingreso_alcalinidad REAL DEFAULT 0,
              ingreso_ph REAL DEFAULT 0, ingreso_aluminio REAL DEFAULT 0,
              ingreso_dureza REAL DEFAULT 0, ingreso_ovl REAL DEFAULT 0,
              decantador_turbiedad REAL DEFAULT 0, decantador_color REAL DEFAULT 0, decantador_ph REAL DEFAULT 0,
              filtros_ing_turb REAL DEFAULT 0, filtros_ing_col REAL DEFAULT 0, filtros_ing_ph REAL DEFAULT 0,
              filtros_sal_turb REAL DEFAULT 0, filtros_sal_col REAL DEFAULT 0, filtros_sal_ph REAL DEFAULT 0,
              tratada_turbiedad REAL DEFAULT 0, tratada_conductividad REAL DEFAULT 0,
              tratada_color REAL DEFAULT 0, tratada_ph REAL DEFAULT 0,
              tratada_aluminioReal REAL DEFAULT 0, tratada_cloro REAL DEFAULT 0,
              tratada_dureza REAL DEFAULT 0, tratada_ovl REAL DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === ESTACIONES HÍDRICAS ===
            `CREATE TABLE IF NOT EXISTS water_stations (
                id SERIAL PRIMARY KEY, codigo VARCHAR(50) UNIQUE NOT NULL, nombre VARCHAR(200) NOT NULL,
                tipo VARCHAR(50), zona VARCHAR(100), distrito VARCHAR(100), direccion TEXT,
                coordenadas_lat DECIMAL(10,8), coordenadas_lng DECIMAL(11,8),
                estado VARCHAR(50) DEFAULT 'Operativa', observaciones TEXT,
                activo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === EQUIPOS POR ESTACIÓN ===
            `CREATE TABLE IF NOT EXISTS station_equipment (
                id SERIAL PRIMARY KEY, station_id INTEGER REFERENCES water_stations(id) ON DELETE CASCADE,
                codigo VARCHAR(50) UNIQUE NOT NULL, tipo_equipo VARCHAR(100) NOT NULL,
                marca VARCHAR(100), modelo VARCHAR(100), serie VARCHAR(100),
                potencia_hp DECIMAL(10,2), potencia_kw DECIMAL(10,2), voltaje VARCHAR(50),
                horas_operacion DECIMAL(10,2) DEFAULT 0, ultimo_mantenimiento DATE, proximo_mantenimiento DATE,
                estado VARCHAR(50) DEFAULT 'Operativo', observaciones TEXT,
                activo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === ACTIVIDADES PLAN 2026 ===
            `CREATE TABLE IF NOT EXISTS maintenance_activities (
                id SERIAL PRIMARY KEY, codigo VARCHAR(10) UNIQUE NOT NULL, nombre VARCHAR(300) NOT NULL,
                presupuesto_anual DECIMAL(12,2) DEFAULT 0, presupuesto_t1 DECIMAL(12,2) DEFAULT 0,
                presupuesto_t2 DECIMAL(12,2) DEFAULT 0, presupuesto_t3 DECIMAL(12,2) DEFAULT 0,
                presupuesto_t4 DECIMAL(12,2) DEFAULT 0, activo INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === LOG DE MANTENIMIENTO POR ESTACIÓN ===
            `CREATE TABLE IF NOT EXISTS station_maintenance_log (
                id SERIAL PRIMARY KEY, station_id INTEGER REFERENCES water_stations(id) ON DELETE SET NULL,
                equipment_id INTEGER REFERENCES station_equipment(id) ON DELETE SET NULL,
                activity_code VARCHAR(10), fecha DATE NOT NULL, tipo VARCHAR(50) DEFAULT 'preventivo',
                descripcion TEXT, horas_trabajadas DECIMAL(6,2), costo DECIMAL(12,2),
                tecnico VARCHAR(200), observaciones TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === ACTAS DE MANTENIMIENTO ===
            `CREATE TABLE IF NOT EXISTS maintenance_records (
                id SERIAL PRIMARY KEY, station_id INTEGER REFERENCES water_stations(id) ON DELETE SET NULL,
                equipment_id INTEGER REFERENCES station_equipment(id) ON DELETE SET NULL,
                activity_code VARCHAR(10), fecha_inicio DATE, fecha_fin DATE,
                tecnico_responsable VARCHAR(200), trabajo_realizado TEXT, materiales_usados TEXT,
                horas_empleadas DECIMAL(6,2), costo_total DECIMAL(12,2),
                conformidad VARCHAR(50), observaciones TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // === SISTEMA DE AUTENTICACIÓN ===
            `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                dni VARCHAR(20) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // Migración: cambiar email por dni
            `DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
                    ALTER TABLE users DROP COLUMN IF EXISTS email CASCADE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'dni') THEN
                    ALTER TABLE users ADD COLUMN dni VARCHAR(20) UNIQUE NOT NULL DEFAULT '00000000';
                END IF;
            END $$`,
            // Fix previo: 'station' a 'stations' para consistencia con frontend
            `UPDATE assets SET categoria = 'stations' WHERE categoria = 'station'`,

            // === PRODUCCIÓN OPAPTAR 2026 ===
            `CREATE TABLE IF NOT EXISTS produccion_bd (
                id SERIAL PRIMARY KEY, mes INTEGER NOT NULL, dia INTEGER NOT NULL,
                fecha DATE, pz10_caudal REAL DEFAULT 0, pz10_horas REAL DEFAULT 0,
                pz10_inicio REAL DEFAULT 0, pz10_final REAL DEFAULT 0, pz10_m3 REAL DEFAULT 0,
                pz11_caudal REAL DEFAULT 0, pz11_horas REAL DEFAULT 0,
                pz11_inicio REAL DEFAULT 0, pz11_final REAL DEFAULT 0, pz11_m3 REAL DEFAULT 0,
                pz13_caudal REAL DEFAULT 0, pz13_horas REAL DEFAULT 0,
                pz13_inicio REAL DEFAULT 0, pz13_final REAL DEFAULT 0, pz13_m3 REAL DEFAULT 0,
                pzmed_caudal REAL DEFAULT 0, pzmed_horas REAL DEFAULT 0,
                pzmed_inicio REAL DEFAULT 0, pzmed_final REAL DEFAULT 0, pzmed_m3 REAL DEFAULT 0,
                gfmin_caudal REAL DEFAULT 0, gfmin_horas REAL DEFAULT 0,
                gfmin_inicio REAL DEFAULT 0, gfmin_final REAL DEFAULT 0, gfmin_m3 REAL DEFAULT 0,
                ptap1_caudal REAL DEFAULT 0, ptap1_horas REAL DEFAULT 0,
                ptap1_inicio REAL DEFAULT 0, ptap1_final REAL DEFAULT 0, ptap1_m3 REAL DEFAULT 0,
                gfnar_caudal REAL DEFAULT 0, gfnar_horas REAL DEFAULT 0,
                gfnar_inicio REAL DEFAULT 0, gfnar_final REAL DEFAULT 0, gfnar_m3 REAL DEFAULT 0,
                pzchb_caudal REAL DEFAULT 0, pzchb_horas REAL DEFAULT 0,
                pzchb_inicio REAL DEFAULT 0, pzchb_final REAL DEFAULT 0, pzchb_m3 REAL DEFAULT 0,
                pzcm_caudal REAL DEFAULT 0, pzcm_horas REAL DEFAULT 0,
                pzcm_inicio REAL DEFAULT 0, pzcm_final REAL DEFAULT 0, pzcm_m3 REAL DEFAULT 0,
                pztm_caudal REAL DEFAULT 0, pztm_horas REAL DEFAULT 0,
                pztm_inicio REAL DEFAULT 0, pztm_final REAL DEFAULT 0, pztm_m3 REAL DEFAULT 0,
                ebaphija_caudal REAL DEFAULT 0, ebaphija_horas REAL DEFAULT 0,
                ebaphija_inicio REAL DEFAULT 0, ebaphija_final REAL DEFAULT 0, ebaphija_m3 REAL DEFAULT 0,
                ebapalar_caudal REAL DEFAULT 0, ebapalar_horas REAL DEFAULT 0,
                ebapalar_inicio REAL DEFAULT 0, ebapalar_final REAL DEFAULT 0, ebapalar_m3 REAL DEFAULT 0,
                ebappnue_caudal REAL DEFAULT 0, ebappnue_horas REAL DEFAULT 0,
                ebappnue_inicio REAL DEFAULT 0, ebappnue_final REAL DEFAULT 0, ebappnue_m3 REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS produccion_surtidor (
                id SERIAL PRIMARY KEY, num_sem INTEGER, mes INTEGER, anio INTEGER,
                fecha DATE, surtidor VARCHAR(50), itm INTEGER, placa VARCHAR(50),
                tvehiculo VARCHAR(100), volumen_gln REAL DEFAULT 0, volumen_m3 REAL DEFAULT 0,
                consumo_ca REAL DEFAULT 0, programa VARCHAR(100),
                hipoclorito REAL DEFAULT 0, cloro_residual REAL DEFAULT 0,
                hora TEXT, operador VARCHAR(200),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS produccion_rsanjuan (
                id SERIAL PRIMARY KEY, anio INTEGER, mes INTEGER,
                fecha TEXT, hora TEXT, caudal REAL DEFAULT 0,
                etiqueta TEXT, caudal_max REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS produccion_dashboard (
                id SERIAL PRIMARY KEY, fecha_reporte DATE, semana INTEGER,
                titulo TEXT, valor TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            // Unique constraints for produccion tables (for ON CONFLICT DO NOTHING)
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_produccion_bd_fecha ON produccion_bd(fecha)`,
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_produccion_surtidor_row ON produccion_surtidor(fecha, surtidor, itm, placa)`,
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_produccion_rsanjuan_row ON produccion_rsanjuan(fecha, hora)`,
        ]
        for (const sql of migrations) {
            try { await pool.query(sql) } catch (e: any) {
                if (!e.message.includes('already exists') && !e.message.includes('does not exist')) console.log('[MIGRATION]', e.message)
            }
        }
        console.log('[DB] ✅ Migraciones aplicadas')

        // Seed actividades 2026
        try {
            const activities = [
                { c: 'A.01', n: 'Sistemas de puesta a tierra', p: 7155, t1: 1862.26, t2: 1862.26, t3: 0, t4: 0 },
                { c: 'A.02', n: 'Sistemas eléctricos generales', p: 17246, t1: 0, t2: 17246, t3: 0, t4: 0 },
                { c: 'A.03', n: 'Subestaciones de potencia', p: 41516, t1: 0, t2: 41516, t3: 0, t4: 0 },
                { c: 'A.04', n: 'Motores eléctricos verticales', p: 37504, t1: 0, t2: 37504, t3: 0, t4: 0 },
                { c: 'A.05', n: 'Motores horizontales y bombas centrífugas', p: 67792, t1: 0, t2: 67792, t3: 0, t4: 0 },
                { c: 'A.06', n: 'Sistemas de bombeo de pozos profundos', p: 19500, t1: 0, t2: 19500, t3: 0, t4: 0 },
                { c: 'A.07', n: 'Tableros de control y fuerza', p: 21240, t1: 2360, t2: 9440, t3: 9440, t4: 0 },
                { c: 'A.08', n: 'Electrobombas inmersibles tipo trompo', p: 26042, t1: 0, t2: 0, t3: 0, t4: 26042 },
                { c: 'A.09', n: 'Dosificadores y agitadores', p: 201703, t1: 50425.75, t2: 50425.75, t3: 50425.75, t4: 50425.75 },
                { c: 'A.10', n: 'Incidencias operativas de equipos eléctricos', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
                { c: 'A.11', n: 'Equipos electromecánicos de alcantarillado', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
                { c: 'A.12', n: 'Movilidades y maquinaria – aguas residuales', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
                { c: 'A.13', n: 'Sistema eléctrico de tableros e iluminación', p: 335500, t1: 19735.29, t2: 105254.90, t3: 105254.90, t4: 105254.90 },
                { c: 'A.14', n: 'Adquisición de EPPs para personal técnico', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
                { c: 'A.15', n: 'Implementación del equipo de control de pérdidas', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
                { c: 'A.16', n: 'Mantenimiento correctivo movilidades agua potable', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
                { c: 'A.17', n: 'Mantenimiento correctivo movilidades alcantarillado', p: 0, t1: 0, t2: 0, t3: 0, t4: 0 },
            ]
            for (const a of activities) {
                await pool.query(`INSERT INTO maintenance_activities (codigo, nombre, presupuesto_anual, presupuesto_t1, presupuesto_t2, presupuesto_t3, presupuesto_t4) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (codigo) DO UPDATE SET nombre=EXCLUDED.nombre, presupuesto_anual=EXCLUDED.presupuesto_anual, presupuesto_t1=EXCLUDED.presupuesto_t1, presupuesto_t2=EXCLUDED.presupuesto_t2, presupuesto_t3=EXCLUDED.presupuesto_t3, presupuesto_t4=EXCLUDED.presupuesto_t4`, [a.c, a.n, a.p, a.t1, a.t2, a.t3, a.t4])
            }
            console.log('[SEED] ✅ 17 actividades plan 2026 insertadas')
        } catch (e: any) { console.log('[SEED ACTIVITIES]', e.message) }

        // Seed catálogos
        try {
            const st = ['Estación de Bombeo', 'Pozo Profundo', 'Subestación Eléctrica', 'Reservorio', 'PTAP', 'Cámara de Válvulas', 'Tanque de Almacenamiento']
            for (const t of st) await pool.query(`INSERT INTO catalogs (tipo, valor, activo) VALUES ('tipo_estacion', $1, 1) ON CONFLICT DO NOTHING`, [t])
            const eq = ['Motor Eléctrico Vertical', 'Motor Eléctrico Horizontal', 'Bomba Centrífuga', 'Electrobomba Inmersible', 'Tablero de Control', 'Tablero de Fuerza', 'Sistema de Puesta a Tierra', 'Dosificador', 'Agitador', 'Transformador', 'Generador', 'Válvula', 'Sensor de Nivel', 'Sensor de Presión', 'Cisterna', 'Filtro', 'Clorador', 'Sistema de Iluminación']
            for (const t of eq) await pool.query(`INSERT INTO catalogs (tipo, valor, activo) VALUES ('tipo_equipo', $1, 1) ON CONFLICT DO NOTHING`, [t])
            console.log('[SEED] ✅ Catálogos estaciones/equipos insertados')
        } catch (e: any) { console.log('[SEED CATALOGS]', e.message) }

        // Seed estaciones y equipos
        try {
            const stations = [
                { c: 'I.1', n: 'Pozo 10', t: 'Pozo' }, { c: 'I.2', n: 'Pozo 13', t: 'Pozo' },
                { c: 'I.3', n: 'Pozo Chincha Baja', t: 'Pozo' }, { c: 'I.4', n: 'Pozo Tambo de Mora', t: 'Pozo' },
                { c: 'I.5', n: 'Pozo Medrano', t: 'Pozo' },
                { c: 'I.6', n: 'CBAP Hijaya', t: 'CBAP' }, { c: 'I.7', n: 'CBAP Larán', t: 'CBAP' },
                { c: 'I.8', n: 'CBAP Pueblo Nuevo', t: 'CBAP' },
                { c: 'I.9', n: 'CBD Tambo de Mora', t: 'CBD' }, { c: 'I.10', n: 'CBD Parque Chincha Baja', t: 'CBD' },
                { c: 'I.11', n: 'PTAP Portachuelos', t: 'PTAP' },
                { c: 'I.12', n: 'Reservorio R-7', t: 'Reservorio' }, { c: 'I.13', n: 'Reservorio R-3', t: 'Reservorio' },
                { c: 'I.14', n: 'Subestación General Hijaya', t: 'Subestación Eléctrica' },
                { c: 'I.15', n: 'Taller EPS El Canchón', t: 'Otro' }, { c: 'I.16', n: 'Oficinas', t: 'Otro' },
                { c: 'I.17', n: 'EBAP Alto Laran', t: 'Estación de Bombeo' },
            ]
            const eqByType: Record<string, string[]> = {
                'Pozo': ['SEP', 'PAT', 'Tablero de Control', 'Tablero de Fuerza', 'Electrobomba Inmersible', 'Sistema de Iluminación', 'Bomba Centrífuga'],
                'CBAP': ['SEP', 'PAT', 'Tablero de Control', 'Tablero de Fuerza', 'Dosificador', 'Sistema de Iluminación', 'Bomba Centrífuga'],
                'CBD': ['SEP', 'PAT', 'Tablero de Control', 'Tablero de Fuerza', 'Motor Eléctrico Horizontal', 'Bomba Centrífuga', 'Sistema de Iluminación'],
                'PTAP': ['SEP', 'PAT', 'Tablero de Control', 'Tablero de Fuerza', 'Dosificador', 'Agitador', 'Sistema de Iluminación', 'Bomba Centrífuga'],
                'Reservorio': ['Tablero de Control', 'Sistema de Iluminación'],
                'Subestación Eléctrica': ['SEP', 'PAT', 'Tablero de Control', 'Tablero de Fuerza', 'Transformador', 'Sistema de Iluminación'],
                'Otro': ['Tablero de Fuerza', 'Sistema de Iluminación'],
                'Estación de Bombeo': ['Electrobomba Centrífuga', 'Tablero de Control', 'Tablero de Fuerza', 'Sistema de Iluminación'],
            }
            let eqCount = 0
            for (const s of stations) {
                await pool.query(`INSERT INTO water_stations (codigo, nombre, tipo, estado) VALUES ($1,$2,$3,'Operativa') ON CONFLICT (codigo) DO UPDATE SET nombre=EXCLUDED.nombre, tipo=EXCLUDED.tipo`, [s.c, s.n, s.t])
                const eqs = eqByType[s.t] || eqByType['Otro']
                for (const eq of eqs) {
                    await pool.query(`INSERT INTO station_equipment (station_id, codigo, tipo_equipo, estado) VALUES ((SELECT id FROM water_stations WHERE codigo=$1), $2, $3, 'Operativo') ON CONFLICT (codigo) DO UPDATE SET tipo_equipo=EXCLUDED.tipo_equipo`, [s.c, `${s.c}-${eq.replace(/\s+/g, '-').toUpperCase()}`, eq])
                    eqCount++
                }
            }

            // Seed específico de Alto Laran en la tabla de activos (Unificado)
            const altoLaranId = (await pool.query(`SELECT id FROM water_stations WHERE codigo = 'I.17'`)).rows[0]?.id
            if (altoLaranId) {
                const assetsAltoLaran = [
                    { cod: 'AL-EB-01', t: 'Electrobomba Centrífuga', obs: 'Trifásica 30HP Bomba 3"', hp: 30, kw: 22.37, v: '380V' },
                    { cod: 'AL-AH-01', t: 'Árbol Hidráulico', obs: 'Tubería de 4"', v: 'N/A' },
                    { cod: 'AL-VC-01', t: 'Válvula Compuerta', obs: 'Con timón de 4"', v: 'N/A' },
                    { cod: 'AL-BB-01', t: 'Bomba Booster', obs: 'Sistema de cloración trifásico 1kW', kw: 1, v: '380V' },
                    { cod: 'AL-TA-01', t: 'Tablero de Arranque', obs: 'Arrancador estado sólido 3x380V AC', v: '3x380V' },
                    { cod: 'AL-TC-01', t: 'Tablero Cloración', obs: '3x380V Vac', v: '3x380V' },
                    { cod: 'AL-BE-01', t: 'Balanza Electrónica', obs: 'Tanque cloro gas 68kg', v: 'N/A' },
                    { cod: 'AL-TCG-01', t: 'Tanque Cloro Gas', obs: '68kg (Unidad 1)', v: 'N/A' },
                    { cod: 'AL-CL-01', t: 'Clorador / Panel', obs: 'Incluye rotámetro', v: 'N/A' },
                    { cod: 'AL-MA-01', t: 'Manómetro', obs: 'Presión 1/2" y 3/4"', v: 'N/A' },
                    { cod: 'AL-MD-01', t: 'Macromedidor Digital', obs: 'Digital 4"', v: 'N/A' },
                    { cod: 'AL-TD-01', t: 'Tablero de Distribución', obs: 'Circuito tomacorrientes y luminarias', v: '220V' },
                    { cod: 'AL-LU-01', t: 'Sistema Iluminación', obs: 'Reflector 200W, Pastoral 150W, Focos E27', v: '220V' },
                    { cod: 'AL-GE-01', t: 'Grupo Electrógeno', obs: 'MODASA 55KW - 440V - 90A', kw: 55, v: '440V' },
                ]
                for (const a of assetsAltoLaran) {
                    await pool.query(`INSERT INTO assets (codigo_patrimonial, tipo_unidad, categoria, station_id, observaciones, potencia_hp, potencia_kw, voltaje, forma_control, estado) 
                        VALUES ($1,$2,'stations',$3,$4,$5,$6,$7,'Horómetro','Operativo') 
                        ON CONFLICT (codigo_patrimonial) DO UPDATE SET station_id=EXCLUDED.station_id, categoria=EXCLUDED.categoria`,
                        [a.cod, a.t, altoLaranId, a.obs, a.hp || 0, a.kw || 0, a.v])
                }
            }

            console.log(`[SEED] ✅ ${stations.length} estaciones + ${eqCount} equipos insertados`)
        } catch (e: any) { console.log('[SEED STATIONS]', e.message) }
    } catch (err: any) {
        console.error('[DB] ❌ Error de conexión inicial:', err.message)
    }
    return pool
}

export function getDb() { return pool }

function transformQuery(sql: string): string {
    let index = 1
    return sql.replace(/\?/g, () => `$${index++}`)
}

export async function dbAll(sql: string, ...params: any[]): Promise<any[]> {
    const pgSql = transformQuery(sql)
    const res = await pool.query(pgSql, params)
    return res.rows
}

export async function dbGet(sql: string, ...params: any[]): Promise<any | undefined> {
    const rows = await dbAll(sql, ...params)
    return rows[0]
}

export async function dbRun(sql: string, ...params: any[]): Promise<{ lastInsertRowid: number; changes: number }> {
    const pgSql = transformQuery(sql)
    const res = await pool.query(pgSql, params)
    return { lastInsertRowid: res.rows[0]?.id || 0, changes: res.rowCount || 0 }
}
