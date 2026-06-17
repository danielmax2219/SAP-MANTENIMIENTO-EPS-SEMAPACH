import { Router } from 'express'
import { dbAll, dbRun, dbGet } from '../database.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import XLSX from 'xlsx'

export const produccionRouter = Router()

// === BD (Producción diaria de pozos y plantas) ===

produccionRouter.get('/bd', async (req, res) => {
    try {
        const { desde, hasta, mes, limit = 100 } = req.query
        let sql = 'SELECT * FROM produccion_bd WHERE 1=1'
        const params: any[] = []
        if (desde) { sql += ' AND fecha >= ?'; params.push(desde) }
        if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta) }
        if (mes) { sql += ' AND mes = ?'; params.push(Number(mes)) }
        sql += ' ORDER BY fecha ASC LIMIT ?'
        params.push(Number(limit))
        res.json(await dbAll(sql, ...params))
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

produccionRouter.post('/bd/bulk', async (req, res) => {
    try {
        const { rows } = req.body
        if (!rows || !Array.isArray(rows)) {
            return res.status(400).json({ error: 'Se requiere un array de rows' })
        }
        let count = 0
        for (const r of rows) {
            await dbRun(`INSERT INTO produccion_bd (
                mes, dia, fecha, pz10_caudal, pz10_horas, pz10_inicio, pz10_final, pz10_m3,
                pz11_caudal, pz11_horas, pz11_inicio, pz11_final, pz11_m3,
                pz13_caudal, pz13_horas, pz13_inicio, pz13_final, pz13_m3,
                pzmed_caudal, pzmed_horas, pzmed_inicio, pzmed_final, pzmed_m3,
                gfmin_caudal, gfmin_horas, gfmin_inicio, gfmin_final, gfmin_m3,
                ptap1_caudal, ptap1_horas, ptap1_inicio, ptap1_final, ptap1_m3,
                gfnar_caudal, gfnar_horas, gfnar_inicio, gfnar_final, gfnar_m3,
                pzchb_caudal, pzchb_horas, pzchb_inicio, pzchb_final, pzchb_m3,
                pzcm_caudal, pzcm_horas, pzcm_inicio, pzcm_final, pzcm_m3,
                pztm_caudal, pztm_horas, pztm_inicio, pztm_final, pztm_m3,
                ebaphija_caudal, ebaphija_horas, ebaphija_inicio, ebaphija_final, ebaphija_m3,
                ebapalar_caudal, ebapalar_horas, ebapalar_inicio, ebapalar_final, ebapalar_m3,
                ebappnue_caudal, ebappnue_horas, ebappnue_inicio, ebappnue_final, ebappnue_m3
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53,$54,$55,$56,$57,$58,$59,$60,$61,$62,$63,$64,$65,$66)
            ON CONFLICT DO NOTHING`,
                r.mes, r.dia, r.fecha,
                r.pz10_caudal, r.pz10_horas, r.pz10_inicio, r.pz10_final, r.pz10_m3,
                r.pz11_caudal, r.pz11_horas, r.pz11_inicio, r.pz11_final, r.pz11_m3,
                r.pz13_caudal, r.pz13_horas, r.pz13_inicio, r.pz13_final, r.pz13_m3,
                r.pzmed_caudal, r.pzmed_horas, r.pzmed_inicio, r.pzmed_final, r.pzmed_m3,
                r.gfmin_caudal, r.gfmin_horas, r.gfmin_inicio, r.gfmin_final, r.gfmin_m3,
                r.ptap1_caudal, r.ptap1_horas, r.ptap1_inicio, r.ptap1_final, r.ptap1_m3,
                r.gfnar_caudal, r.gfnar_horas, r.gfnar_inicio, r.gfnar_final, r.gfnar_m3,
                r.pzchb_caudal, r.pzchb_horas, r.pzchb_inicio, r.pzchb_final, r.pzchb_m3,
                r.pzcm_caudal, r.pzcm_horas, r.pzcm_inicio, r.pzcm_final, r.pzcm_m3,
                r.pztm_caudal, r.pztm_horas, r.pztm_inicio, r.pztm_final, r.pztm_m3,
                r.ebaphija_caudal, r.ebaphija_horas, r.ebaphija_inicio, r.ebaphija_final, r.ebaphija_m3,
                r.ebapalar_caudal, r.ebapalar_horas, r.ebapalar_inicio, r.ebapalar_final, r.ebapalar_m3,
                r.ebappnue_caudal, r.ebappnue_horas, r.ebappnue_inicio, r.ebappnue_final, r.ebappnue_m3
            )
            count++
        }
        res.json({ success: true, total: rows.length, inserted: count })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

// === SURTIDOR (Despacho de agua en cisternas) ===

produccionRouter.get('/surtidor', async (req, res) => {
    try {
        const { desde, hasta, placa, surtidor, limit = 200 } = req.query
        let sql = 'SELECT * FROM produccion_surtidor WHERE 1=1'
        const params: any[] = []
        if (desde) { sql += ' AND fecha >= ?'; params.push(desde) }
        if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta) }
        if (placa) { sql += ' AND placa = ?'; params.push(placa) }
        if (surtidor) { sql += ' AND surtidor = ?'; params.push(surtidor) }
        sql += ' ORDER BY fecha ASC, itm ASC LIMIT ?'
        params.push(Number(limit))
        res.json(await dbAll(sql, ...params))
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

produccionRouter.post('/surtidor/bulk', async (req, res) => {
    try {
        const { rows } = req.body
        if (!rows || !Array.isArray(rows)) {
            return res.status(400).json({ error: 'Se requiere un array de rows' })
        }
        let count = 0
        for (const r of rows) {
            await dbRun(`INSERT INTO produccion_surtidor (num_sem, mes, anio, fecha, surtidor, itm, placa, tvehiculo, volumen_gln, volumen_m3, consumo_ca, programa, hipoclorito, cloro_residual, hora, operador)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT DO NOTHING`,
                r.num_sem, r.mes, r.anio, r.fecha, r.surtidor, r.itm, r.placa, r.tvehiculo,
                r.volumen_gln, r.volumen_m3, r.consumo_ca, r.programa,
                r.hipoclorito, r.cloro_residual, r.hora, r.operador)
            count++
        }
        res.json({ success: true, total: rows.length, inserted: count })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

// === RIO SAN JUAN (Caudales) ===

produccionRouter.get('/rsanjuan', async (req, res) => {
    try {
        const { desde, hasta, anio, limit = 500 } = req.query
        let sql = 'SELECT * FROM produccion_rsanjuan WHERE 1=1'
        const params: any[] = []
        if (desde) { sql += ' AND fecha >= ?'; params.push(desde) }
        if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta) }
        if (anio) { sql += ' AND anio = ?'; params.push(Number(anio)) }
        sql += ' ORDER BY fecha ASC, hora ASC LIMIT ?'
        params.push(Number(limit))
        res.json(await dbAll(sql, ...params))
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

produccionRouter.post('/rsanjuan/bulk', async (req, res) => {
    try {
        const { rows } = req.body
        if (!rows || !Array.isArray(rows)) {
            return res.status(400).json({ error: 'Se requiere un array de rows' })
        }
        let count = 0
        for (const r of rows) {
            await dbRun(`INSERT INTO produccion_rsanjuan (anio, mes, fecha, hora, caudal, etiqueta, caudal_max)
            VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
                r.anio, r.mes, r.fecha, r.hora, r.caudal, r.etiqueta, r.caudal_max)
            count++
        }
        res.json({ success: true, total: rows.length, inserted: count })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

// === DASHBOARD RESUMEN ===

produccionRouter.get('/dashboard', async (req, res) => {
    try {
        const [resumenBD, resumenSurtidor, resumenRio, topFuentes] = await Promise.all([
            dbAll(`
                SELECT
                    COALESCE(SUM(pz10_m3),0) + COALESCE(SUM(pz11_m3),0) + COALESCE(SUM(pz13_m3),0) + COALESCE(SUM(pzmed_m3),0) as produccion_total,
                    AVG(pz10_caudal) as avg_caudal_pz10,
                    AVG(pz11_caudal) as avg_caudal_pz11,
                    AVG(pz13_caudal) as avg_caudal_pz13,
                    AVG(pzmed_caudal) as avg_caudal_pzmed,
                    AVG(gfmin_caudal) as avg_caudal_gfmin,
                    AVG(ptap1_caudal) as avg_caudal_ptap1,
                    AVG(gfnar_caudal) as avg_caudal_gfnar,
                    AVG(pzchb_caudal) as avg_caudal_pzchb,
                    AVG(pzcm_caudal) as avg_caudal_pzcm,
                    AVG(pztm_caudal) as avg_caudal_pztm,
                    AVG(ebaphija_caudal) as avg_caudal_ebaphija,
                    AVG(ebapalar_caudal) as avg_caudal_ebapalar,
                    AVG(ebappnue_caudal) as avg_caudal_ebappnue,
                    SUM(pz10_m3) as total_pz10, SUM(pz11_m3) as total_pz11,
                    SUM(pz13_m3) as total_pz13, SUM(pzmed_m3) as total_pzmed,
                    SUM(gfmin_m3) as total_gfmin, SUM(ptap1_m3) as total_ptap1,
                    SUM(gfnar_m3) as total_gfnar, SUM(pzchb_m3) as total_pzchb,
                    SUM(pzcm_m3) as total_pzcm, SUM(pztm_m3) as total_pztm,
                    SUM(ebaphija_m3) as total_ebaphija, SUM(ebapalar_m3) as total_ebapalar,
                    SUM(ebappnue_m3) as total_ebappnue
                FROM produccion_bd
            `),
            dbAll(`
                SELECT SUM(volumen_gln) as total_galones, SUM(volumen_m3) as total_m3,
                    COUNT(DISTINCT placa) as vehiculos_abastecidos
                FROM produccion_surtidor
            `),
            dbAll(`
                SELECT AVG(caudal) as caudal_promedio, MAX(caudal) as caudal_maximo,
                    MIN(caudal) as caudal_minimo
                FROM produccion_rsanjuan
            `),
            dbAll(`
                SELECT
                    SUM(pz10_m3) as m3, SUM(pz10_horas) as horas, 'PZ10' as fuente FROM produccion_bd UNION ALL
                    SELECT SUM(pz11_m3), SUM(pz11_horas), 'PZ11' FROM produccion_bd UNION ALL
                    SELECT SUM(pz13_m3), SUM(pz13_horas), 'PZ13' FROM produccion_bd UNION ALL
                    SELECT SUM(pzmed_m3), SUM(pzmed_horas), 'PZ MED' FROM produccion_bd UNION ALL
                    SELECT SUM(gfmin_m3), SUM(gfmin_horas), 'GF MIN' FROM produccion_bd UNION ALL
                    SELECT SUM(ptap1_m3), SUM(ptap1_horas), 'PTAP1' FROM produccion_bd UNION ALL
                    SELECT SUM(gfnar_m3), SUM(gfnar_horas), 'GF NAR' FROM produccion_bd UNION ALL
                    SELECT SUM(pzchb_m3), SUM(pzchb_horas), 'PZ CHB' FROM produccion_bd UNION ALL
                    SELECT SUM(pzcm_m3), SUM(pzcm_horas), 'PZ CM' FROM produccion_bd UNION ALL
                    SELECT SUM(pztm_m3), SUM(pztm_horas), 'PZ TM' FROM produccion_bd UNION ALL
                    SELECT SUM(ebaphija_m3), SUM(ebaphija_horas), 'EBAP HIJA' FROM produccion_bd UNION ALL
                    SELECT SUM(ebapalar_m3), SUM(ebapalar_horas), 'EBAP ALAR' FROM produccion_bd UNION ALL
                    SELECT SUM(ebappnue_m3), SUM(ebappnue_horas), 'EBAP PNUE' FROM produccion_bd
                ORDER BY m3 DESC
            `),
        ])

        res.json({
            bd: resumenBD[0] || {},
            surtidor: resumenSurtidor[0] || {},
            rio: resumenRio[0] || {},
            topFuentes
        })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

// === UPLOAD EXCEL (procesamiento del lado servidor) ===

const upload = multer({
    dest: '/tmp/uploads/',
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase()
        if (['.xlsx', '.xls', '.csv', '.ods'].includes(ext)) {
            cb(null, true)
        } else {
            cb(new Error('Formato no soportado. Use .xlsx, .xls, .csv u .ods'))
        }
    }
})

produccionRouter.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' })

        const workbook = XLSX.readFile(req.file.path)
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        fs.unlink(req.file.path, () => {})
        res.json({ success: true, filename: req.file.originalname, rows: data.length, preview: data.slice(0, 5) })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

// Importar datos desde Excel directamente (procesamiento completo)
produccionRouter.post('/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' })

        const { tipo } = req.query
        const workbook = XLSX.readFile(req.file.path)
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        fs.unlink(req.file.path, () => {})

        let imported = 0

        if (tipo === 'bd') {
            for (let i = 4; i < rows.length; i++) {
                const r = rows[i]
                if (!r || !r[0]) continue
                const mes = Number(r[0]) || 0
                const fechaSerial = Number(r[1]) || 0
                const baseDate = new Date((fechaSerial - 25569) * 86400 * 1000)
                const fecha = baseDate.toISOString().split('T')[0]
                const dia = baseDate.getDate()

                await dbRun(`INSERT INTO produccion_bd (mes, dia, fecha, pz10_caudal, pz10_horas, pz10_inicio, pz10_final, pz10_m3,
                    pz11_caudal, pz11_horas, pz11_inicio, pz11_final, pz11_m3,
                    pz13_caudal, pz13_horas, pz13_inicio, pz13_final, pz13_m3,
                    pzmed_caudal, pzmed_horas, pzmed_inicio, pzmed_final, pzmed_m3,
                    gfmin_caudal, gfmin_horas, gfmin_inicio, gfmin_final, gfmin_m3,
                    ptap1_caudal, ptap1_horas, ptap1_inicio, ptap1_final, ptap1_m3,
                    gfnar_caudal, gfnar_horas, gfnar_inicio, gfnar_final, gfnar_m3,
                    pzchb_caudal, pzchb_horas, pzchb_inicio, pzchb_final, pzchb_m3,
                    pzcm_caudal, pzcm_horas, pzcm_inicio, pzcm_final, pzcm_m3,
                    pztm_caudal, pztm_horas, pztm_inicio, pztm_final, pztm_m3,
                    ebaphija_caudal, ebaphija_horas, ebaphija_inicio, ebaphija_final, ebaphija_m3,
                    ebapalar_caudal, ebapalar_horas, ebapalar_inicio, ebapalar_final, ebapalar_m3,
                    ebappnue_caudal, ebappnue_horas, ebappnue_inicio, ebappnue_final, ebappnue_m3
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53,$54,$55,$56,$57,$58,$59,$60,$61,$62,$63,$64,$65,$66)
                ON CONFLICT DO NOTHING`,
                    mes, dia, fecha,
                    r[2], r[3], r[4], r[5], r[6],
                    r[7], r[8], r[9], r[10], r[11],
                    r[12], r[13], r[14], r[15], r[16],
                    r[17], r[18], r[19], r[20], r[21],
                    r[22], r[23], r[24], r[25], r[26],
                    r[27], r[28], r[29], r[30], r[31],
                    r[32], r[33], r[34], r[35], r[36],
                    r[37], r[38], r[39], r[40], r[41],
                    r[42], r[43], r[44], r[45], r[46],
                    r[47], r[48], r[49], r[50], r[51],
                    r[52], r[53], r[54], r[55], r[56],
                    r[57], r[58], r[59], r[60], r[61],
                    r[62], r[63], r[64], r[65], r[66]
                )
                imported++
            }
        } else if (tipo === 'surtidor') {
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i]
                if (!r || r.length < 5) continue
                await dbRun(`INSERT INTO produccion_surtidor (num_sem, mes, anio, fecha, surtidor, itm, placa, tvehiculo, volumen_gln, volumen_m3, consumo_ca, programa, hipoclorito, cloro_residual, hora, operador)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT DO NOTHING`,
                    r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7],
                    r[8], r[9], r[10], r[11], r[12], r[13], r[14], r[15])
                imported++
            }
        } else if (tipo === 'rsanjuan') {
            for (let i = 14; i < rows.length; i++) {
                const r = rows[i]
                if (!r || r.length < 5) continue
                const [dia, mes, anio] = (r[2] || '').split('/')
                const fecha = `${anio}-${mes.padStart(2,'0')}-${dia.padStart(2,'0')}`
                await dbRun(`INSERT INTO produccion_rsanjuan (anio, mes, fecha, hora, caudal, etiqueta, caudal_max)
                VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
                    Number(anio) || 0, Number(mes) || 0, fecha, r[3] || '',
                    Number(r[4]) || 0, r[5] || '', Number(r[6]) || 0)
                imported++
            }
        }

        res.json({ success: true, tipo, imported, total: rows.length })
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})
