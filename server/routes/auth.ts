import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import { dbGet, dbRun, dbAll } from '../database.js'

export const authRouter = Router()

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
    console.error('[AUTH] ❌ JWT_SECRET no definido. Debes configurarlo en .env')
    process.exit(1)
}

// Configuración de Email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

// Middleware para verificar token
export const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) return res.status(401).json({ message: 'No token provided' })

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ message: 'Invalid token' })
        req.user = user
        next()
    })
}

// POST /register
authRouter.post('/register', async (req, res) => {
    const { username, dni, password, role } = req.body

    try {
        // Verificar si existe
        const existing = await dbGet('SELECT id FROM users WHERE dni = ? OR username = ?', dni, username)
        if (existing) return res.status(400).json({ message: 'Usuario o DNI ya existe' })

        const hashedPassword = await bcrypt.hash(password, 10)

        await dbRun(
            'INSERT INTO users (username, dni, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
            username, dni, hashedPassword, role, 'pending'
        )

        // Enviar Email al Administrador
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_TO,
            subject: '🔔 Solicitud de Acceso: Nuevo Usuario Registrado',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #00a3ff;">Nueva Solicitud de Registro</h2>
                    <p>Un nuevo usuario se ha registrado en el sistema <strong>SAP Mantenimiento</strong>:</p>
                    <ul>
                        <li><strong>Usuario:</strong> ${username}</li>
                        <li><strong>DNI:</strong> ${dni}</li>
                        <li><strong>Puesto Solicitado:</strong> ${role.toUpperCase()}</li>
                    </ul>
                    <p>Por favor, ingresa al sistema para aprobar o rechazar esta solicitud.</p>
                    <hr />
                    <p style="font-size: 12px; color: #777;">Este es un mensaje automático del sistema EPS SEMAPACH.</p>
                </div>
            `
        }

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.error('[EMAIL ERROR]', error)
            else console.log('[EMAIL SENT]', info.response)
        })

        res.status(201).json({ message: 'Usuario registrado. Esperando aprobación.' })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /login
authRouter.post('/login', async (req, res) => {
    const { identifier, password } = req.body  // identifier puede ser username o DNI

    try {
        const user = await dbGet('SELECT * FROM users WHERE username = ? OR dni = ?', identifier, identifier)
        if (!user) return res.status(401).json({ message: 'Credenciales inválidas' })

        if (user.status !== 'approved') {
            return res.status(403).json({ message: 'Tu cuenta aún no ha sido aprobada por administración.' })
        }

        const validPassword = await bcrypt.compare(password, user.password_hash)
        if (!validPassword) return res.status(401).json({ message: 'Credenciales inválidas' })

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        )

        res.json({ token, user: { id: user.id, username: user.username, role: user.role, status: user.status } })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// GET /me
authRouter.get('/me', authenticateToken, async (req: any, res) => {
    try {
        const user = await dbGet('SELECT id, username, dni, role, status FROM users WHERE id = ?', req.user.id)
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
        res.json({ id: user.id, username: user.username, role: user.role, status: user.status })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// === RUTAS DE ADMINISTRACIÓN ===

// GET /users (solo admin)
authRouter.get('/users', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'gerencia') return res.status(403).json({ message: 'No autorizado' })
    try {
        const users = await dbAll('SELECT id, username, dni, role, status, created_at FROM users ORDER BY created_at DESC')
        res.json(users)
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /approve/:id
authRouter.post('/approve/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'gerencia') return res.status(403).json({ message: 'No autorizado' })
    const { status } = req.body // approved or rejected
    try {
        await dbRun('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', status, req.params.id)
        res.json({ message: `Usuario ${status === 'approved' ? 'aprobado' : 'rechazado'} exitosamente.` })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /change-password (cualquier usuario logueado)
authRouter.post('/change-password', authenticateToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body
    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', req.user.id)
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })

        const validPassword = await bcrypt.compare(currentPassword, user.password_hash)
        if (!validPassword) return res.status(401).json({ message: 'Contraseña actual incorrecta' })

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await dbRun('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', hashedPassword, req.user.id)
        res.json({ message: 'Contraseña actualizada correctamente.' })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})

// POST /reset-password/:id (solo admin)
authRouter.post('/reset-password/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'gerencia' && req.user.username !== 'DanielAdmin') return res.status(403).json({ message: 'No autorizado' })
    const { newPassword } = req.body
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await dbRun('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', hashedPassword, req.params.id)
        res.json({ message: 'Contraseña reseteada exitosamente.' })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
})
