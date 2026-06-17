import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { initDb } from './database.js'
import { seedCatalogs } from './seed.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { assetsRouter } from './routes/assets.js'
import { catalogsRouter } from './routes/catalogs.js'
import { operatorsRouter } from './routes/operators.js'
import { dailyRecordsRouter } from './routes/dailyRecords.js'
import { failuresRouter } from './routes/failures.js'
import { preventiveRouter } from './routes/preventive.js'
import { diagnosisRouter } from './routes/diagnosis.js'
import { kpiRouter } from './routes/kpi.js'
import { waterRouter } from './routes/water.js'
import { stationsRouter } from './routes/stations.js'
import { authRouter } from './routes/auth.js'
import { iaRouter } from './routes/ia.js'
import { produccionRouter } from './routes/produccion.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = Number(process.env.PORT) || 3001

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:4173']

async function main() {
    const app = express()
    app.use(helmet())
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true)
            } else {
                callback(new Error(`Origen no permitido: ${origin}`))
            }
        },
        credentials: true,
    }))

    // Rate limiting en endpoints de autenticación
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
        standardHeaders: true,
        legacyHeaders: false,
    })
    app.use('/api/auth/login', authLimiter)
    app.use('/api/auth/register', authLimiter)

    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ limit: '10mb', extended: true }))

    // Rutas API
    app.use('/api/auth', authRouter)
    app.use('/api/assets', assetsRouter)
    app.use('/api/catalogs', catalogsRouter)
    app.use('/api/operators', operatorsRouter)
    app.use('/api/daily-records', dailyRecordsRouter)
    app.use('/api/failures', failuresRouter)
    app.use('/api/preventive', preventiveRouter)
    app.use('/api/diagnosis', diagnosisRouter)
    app.use('/api/kpi', kpiRouter)
    app.use('/api/water', waterRouter)
    app.use('/api/stations', stationsRouter)
    app.use('/api/ia', iaRouter)
    app.use('/api/produccion', produccionRouter)

    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', port: PORT })
    })

    // Servir archivos estáticos del cliente en producción
    const distPath = path.join(__dirname, '..', 'dist')
    app.use(express.static(distPath))

    // Manejar rutas de React (SPA)
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'))
        }
    })

    // ESCUCHAR INMEDIATAMENTE PARA EVITAR TIMEOUT EN RAILWAY
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[SERVER] ✅ API corriendo exitosamente en puerto ${PORT}`)

        // Inicializar BD en segundo plano o después de escuchar
        setTimeout(async () => {
            await initDb()
            await seedCatalogs()
        }, 0)
    })
}

main().catch(err => {
    console.error('[FATAL] Error durante el inicio del servidor:', err)
    process.exit(1)
})
