
import pg from 'pg';
import https from 'https';

const PG_URL = process.env.DATABASE_URL;
if (!PG_URL) {
    console.error('❌ DATABASE_URL no definida. Configúrala en .env o variable de entorno.');
    process.exit(1);
}
const WEB_BASE_URL = process.env.WEB_BASE_URL || 'https://semapach-mantenimiento-production.up.railway.app';

const pool = new pg.Pool({
    connectionString: PG_URL,
    ssl: { rejectUnauthorized: false }
});

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON from ${url}: ${data.substring(0, 100)}`));
                }
            });
        }).on('error', reject);
    });
}

async function migrate() {
    console.log('--- Iniciando Migración desde la WEB a Supabase ---');
    const client = await pool.connect();

    const tables = [
        { name: 'assets', endpoint: '/api/assets' },
        { name: 'operators', endpoint: '/api/operators' },
        { name: 'catalogs', endpoint: '/api/catalogs' },
        { name: 'initial_diagnosis', endpoint: '/api/diagnosis' },
        { name: 'daily_records', endpoint: '/api/daily-records' },
        { name: 'failures', endpoint: '/api/failures' },
        { name: 'preventive_events', endpoint: '/api/preventive/events' },
        { name: 'preventive_config', endpoint: '/api/preventive/config' }
    ];

    try {
        await client.query('BEGIN');

        for (const table of tables) {
            console.log(`Migrando tabla ${table.name} desde ${table.endpoint}...`);
            const data = await fetchJson(`${WEB_BASE_URL}${table.endpoint}`);
            
            if (!Array.isArray(data)) {
                console.log(`⚠️ No se recibió un array para ${table.name}, saltando...`);
                continue;
            }

            console.log(`Encontrados ${data.length} registros.`);

            for (const row of data) {
                // Limpiar campos que no existen en el esquema de destino si es necesario
                // O mapear nombres si difieren (en este caso deberían coincidir ya que el código es el mismo)
                
                // Excluimos campos calculados o extras que el API pueda devolver
                const validCols = await getTableColumns(client, table.name);
                const keys = Object.keys(row).filter(k => validCols.includes(k));
                const values = keys.map(k => row[k]);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                
                // Usamos ON CONFLICT (id) DO UPDATE para asegurar que los datos del web ganen
                const conflictTarget = table.name === 'catalogs' ? '(tipo, valor)' : '(id)';
                let query = `INSERT INTO ${table.name} (${keys.join(', ')}) VALUES (${placeholders})`;
                
                if (keys.includes('id')) {
                    const updates = keys.filter(k => k !== 'id').map((k, i) => `${k} = EXCLUDED.${k}`).join(', ');
                    if (updates) {
                        query += ` ON CONFLICT ${conflictTarget} DO UPDATE SET ${updates}`;
                    } else {
                        query += ` ON CONFLICT ${conflictTarget} DO NOTHING`;
                    }
                }

                await client.query(query, values);
            }
            
            // Reajustar secuencias de ID
            if (data.length > 0 && table.name !== 'catalogs') {
                await client.query(`SELECT setval(pg_get_serial_sequence('${table.name}', 'id'), (SELECT MAX(id) FROM ${table.name}))`);
            }
        }

        // Migración de water_readings (especial ya que requiere fecha)
        console.log('Migrando water_readings (iterando fechas)...');
        let start = new Date('2024-01-01');
        let end = new Date();
        let totalWater = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            try {
                const data = await fetchJson(`${WEB_BASE_URL}/api/water/readings?fecha=${dateStr}`);
                if (Array.isArray(data) && data.length > 0) {
                    console.log(`Encontrados ${data.length} registros de agua para ${dateStr}`);
                    for (const row of data) {
                        const keys = Object.keys(row).filter(k => k !== 'id');
                        const values = keys.map(k => row[k]);
                        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                        await client.query(`
                            INSERT INTO water_readings (${keys.join(', ')}) 
                            VALUES (${placeholders}) 
                            ON CONFLICT (fecha, distrito, zona) DO UPDATE SET
                            presion = EXCLUDED.presion,
                            continuidad = EXCLUDED.continuidad
                        `, values);
                        totalWater++;
                    }
                }
            } catch (e) {
                // Silently skip errors for specific dates
            }
        }
        console.log(`✅ Total registros de agua migrados: ${totalWater}`);

        await client.query('COMMIT');
        console.log('✅ Migración desde WEB completada con éxito.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error en la migración:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

async function getTableColumns(client, tableName) {
    const res = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
    `, [tableName]);
    return res.rows.map(r => r.column_name);
}

migrate();
