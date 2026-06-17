import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { AssetTypeProvider, useAssetType, type AssetTypeFilter } from './contexts/AssetTypeContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import DashboardOperativo from './pages/DashboardOperativo'
import DashboardGerencial from './pages/DashboardGerencial'
import MaestroActivos from './pages/MaestroActivos'
import DiagnosticoInicial from './pages/DiagnosticoInicial'
import RegistroDiario from './pages/RegistroDiario'
import RegistroFallas from './pages/RegistroFallas'
import GestionPreventivos from './pages/GestionPreventivos'
import Catalogos from './pages/Catalogos'
import Reportes from './pages/Reportes'
import MotorInteligencia from './pages/MotorInteligencia'
import APMDesempenio from './pages/APMDesempenio'
import MonitoreoAgua from './pages/MonitoreoAgua'
import ControlPTAP from './pages/ControlPTAP'
import EstacionesHidricas from './pages/EstacionesHidricas'
import MantenimientoIntegrado from './pages/MantenimientoIntegrado'
import PlanMantenimiento2026 from './pages/PlanMantenimiento2026'
import ProduccionOPAPTAR from './pages/ProduccionOPAPTAR'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import UserManagement from './pages/UserManagement'
import MiPerfil from './pages/MiPerfil'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

// Cada item de menú indica para qué tipo de activo aplica
const menuItems = [
    {
        section: 'Mantenimiento Executive', items: [
            { path: '/dashboard', label: 'Monitor Operativo', icon: 'dashboard', appliesTo: 'all' },
            { path: '/activos', label: 'Maestro de Activos', icon: 'inventory_2', appliesTo: 'all' },
            { path: '/diagnostico', label: 'Diagnostico Inicial', icon: 'assignment', appliesTo: 'all' },
            { path: '/operacion-diaria', label: 'Operación Diaria', icon: 'edit_calendar', appliesTo: 'all' },
            { path: '/fallas', label: 'Registro de Fallas', icon: 'report_problem', appliesTo: 'all' },
            { path: '/preventivos', label: 'Planes Preventivos', icon: 'construction', appliesTo: 'all' },
            { path: '/mantenimiento', label: 'Ordenes de Trabajo', icon: 'engineering', appliesTo: 'all' },
            { path: '/apm', label: 'Salud del Activo (APM)', icon: 'health_and_safety', appliesTo: 'all' },
        ]
    },
    {
        section: 'Operación y Proyectos', items: [
            { path: '/monitoreo-agua', label: 'Control Hídrico', icon: 'water_drop', appliesTo: 'stations' },
            { path: '/control-ptap', label: 'PTAP Portachuelo', icon: 'settings_input_component', appliesTo: 'stations' },
            { path: '/estaciones', label: 'Maestro Estaciones', icon: 'location_on', appliesTo: 'stations' },
            { path: '/produccion-opaptar', label: 'Producción OPAPTAR', icon: 'precision_manufacturing', appliesTo: 'stations' },
        ]
    },
    {
        section: 'Administración', items: [
            { path: '/user-management', label: 'Gestión de Personal', icon: 'manage_accounts', appliesTo: 'all', roles: ['gerencia'] },
        ]
    },
    {
        section: 'Mi Cuenta', items: [
            { path: '/mi-perfil', label: 'Configuración Perfil', icon: 'person_settings', appliesTo: 'all' },
        ]
    }
]

const produccionMenuItems = [
    {
        section: 'Producción OPAPTAR', items: [
            { path: '/produccion-opaptar/operacion', label: 'Operación Diaria', icon: 'edit_calendar', appliesTo: 'all' },
            { path: '/produccion-opaptar/surtidor', label: 'Despacho de Agua', icon: 'local_shipping', appliesTo: 'all' },
            { path: '/produccion-opaptar/rsanjuan', label: 'Río San Juan', icon: 'water', appliesTo: 'all' },
            { path: '/produccion-opaptar/dashboard', label: 'Dashboard Ejecutivo', icon: 'analytics', appliesTo: 'all' },
        ]
    }
]

const ptapMenuItems = [
    {
        section: 'Módulo Portachuelo', items: [
            { path: '/control-ptap/proceso', label: 'Control Fisicoquímico', icon: 'biotech', appliesTo: 'all' },
            { path: '/control-ptap/dashboard', label: 'Dashboard Diario', icon: 'analytics', appliesTo: 'all' },
            {path: '/control-ptap/dosis', label: 'Calculadora de Dosis', icon: 'calculate', appliesTo: 'all' },
            { path: '/control-ptap/cronograma', label: 'Cronograma Semanal', icon: 'event_note', appliesTo: 'all' },
            { path: '/control-ptap/ia', label: 'Asistente IA (RAG)', icon: 'psychology', appliesTo: 'all' },
        ]
    }
]

const waterMenuItems = [
    {
        section: 'Control Hídrico', items: [
            { path: '/monitoreo-agua/operacion', label: 'Operación Diaria', icon: 'edit_calendar', appliesTo: 'all' },
            { path: '/monitoreo-agua/dashboard', label: 'Dashboard Análisis', icon: 'analytics', appliesTo: 'all' },
            { path: '/monitoreo-agua/consolidado', label: 'Reporte Consolidado', icon: 'table_view', appliesTo: 'all' },
        ]
    }
]

const operatorTabs = [
    { path: '/operacion-diaria', label: 'Mi Turno', icon: 'edit_calendar' },
    { path: '/control-ptap/proceso', label: 'PTAP', icon: 'precision_manufacturing' },
    { path: '/dashboard', label: 'Flota', icon: 'directions_car' },
    { path: '/fallas', label: 'Fallas', icon: 'report_problem' },
]

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (
        <button onClick={toggleTheme} title="Cambiar Tema"
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-slate-800/30 hover:bg-slate-700/50 border border-slate-800 hover:border-cyan-500/30 rounded-xl transition-all group">
            <span className="material-symbols-outlined text-base sm:text-lg text-slate-400 group-hover:text-amber-400 transition-colors">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
        </button>
    );
}

function AssetTypeFilter() {
    const { assetType, setAssetType } = useAssetType()
    const types: { key: AssetTypeFilter; label: string; icon: string }[] = [
        { key: 'fleet', label: 'Flota', icon: 'directions_car' },
        { key: 'stations', label: 'Estaciones', icon: 'location_on' },
    ]
    return (
        <div className="flex bg-slate-900/80 p-0.5 sm:p-1 rounded-xl border border-slate-800 shrink-0 shadow-lg gap-0.5 sm:gap-1">
            {types.map(t => (
                <button key={t.key} onClick={() => setAssetType(t.key)} title={t.label}
                    className={`flex items-center justify-center px-2 sm:px-4 h-7 sm:h-8 rounded-lg transition-all text-[8px] sm:text-[9.5px] font-black uppercase tracking-tighter sm:tracking-widest min-w-[65px] sm:min-w-[100px] ${assetType === t.key ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
                    <span className="material-symbols-outlined text-[13px] sm:text-[15px] mr-1 sm:mr-2">{t.icon}</span>
                    <span className="hidden xs:inline">{t.label}</span>
                </button>
            ))}
        </div>
    )
}

function ProtectedRoute({ children, reqRole }: { children: React.ReactNode, reqRole?: string }) {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null

    if (!token) return <Navigate to="/" replace />

    // Si se requiere un rol específico (ej. UserManagement solo para gerencia)
    if (reqRole && user?.role !== reqRole) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}

function MainLayout() {
    const [sidebarActive, setSidebarActive] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const { assetType } = useAssetType()
    const location = useLocation()
    const navigate = useNavigate()
    const hoverTimeout = useRef<any>(null)

    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null

    // Determinar qué menú mostrar según la ruta actual
    const isPTAPModule = location.pathname.startsWith('/control-ptap')
    const isWaterModule = location.pathname.startsWith('/monitoreo-agua')
    const isProduccionModule = location.pathname.startsWith('/produccion-opaptar')

    const isMaintenanceModule = !isPTAPModule && !isWaterModule && (
        location.pathname.includes('/dashboard') ||
        location.pathname.includes('/activos') ||
        location.pathname.includes('/fallas') ||
        location.pathname.includes('/operacion') ||
        location.pathname.includes('/preventivos') ||
        location.pathname.includes('/diagnostico') ||
        location.pathname.includes('/apm') ||
        location.pathname.includes('/mantenimiento')
    )

    const isAdminUser = user?.username === 'DanielAdmin' || user?.role === 'gerencia';

    let currentMenu = [...menuItems];
    if (isPTAPModule) currentMenu = [...ptapMenuItems];
    else if (isWaterModule) currentMenu = [...waterMenuItems];
    else if (isProduccionModule) currentMenu = [...produccionMenuItems];

    // Inyectar sección de administración universal para gerencia o DanielAdmin
    if (isAdminUser && !currentMenu.some(s => s.section === 'Administración')) {
        const adminSection = menuItems.find(s => s.section === 'Administración');
        if (adminSection) currentMenu.push({
            ...adminSection,
            items: adminSection.items.map(i => ({ ...i, roles: undefined })) // Eliminar restricción de rol para DanielAdmin
        });
    }

    const visibleItems = currentMenu.map(section => ({
        ...section,
        items: (section.items as any[]).filter(item => {
            // Si es el menú global, aplicar filtros de activo y mantenimiento
            if (!isPTAPModule && !isWaterModule) {
                if (isMaintenanceModule) {
                    return section.section === 'Mantenimiento Executive' ||
                        (section.section === 'Estrategia & Admin' && !item.roles) ||
                        (item.roles && user && item.roles.includes(user.role))
                }
                if (location.pathname === '/estaciones') {
                    return section.section === 'Estrategia & Admin' && (!item.roles || (user && item.roles.includes(user.role)))
                }
                const matchAsset = item.appliesTo === 'all' || item.appliesTo === assetType
                const matchRole = !item.roles || (user && item.roles.includes(user.role))
                return matchAsset && matchRole
            }
            // Para PTAP y Water, mostrar todo lo definido en su sub-menú
            return true
        }),
    })).filter(section => section.items.length > 0)

    const currentLabel = [...menuItems, ...ptapMenuItems, ...waterMenuItems].flatMap(s => s.items).find(i => i.path === location.pathname)?.label || 'Panel de Gestión'

    const handleLogout = () => {
        const currentTheme = localStorage.getItem('app-theme');
        localStorage.clear();
        if (currentTheme) localStorage.setItem('app-theme', currentTheme);
        window.location.href = '/'
    }

    const isExpanded = sidebarActive || isHovered

    return (
        <div className="flex bg-[#030712] text-slate-200 h-[100dvh] overflow-hidden font-body">

            {/* SIDEBAR PREMIUM */}
            <aside
                onMouseEnter={() => { clearTimeout(hoverTimeout.current); setIsHovered(true) }}
                onMouseLeave={() => { hoverTimeout.current = setTimeout(() => setIsHovered(false), 150) }}
                className={`flex flex-col flex-shrink-0 fixed lg:relative inset-y-0 left-0 z-[60] lg:z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border-r border-slate-900/50 bg-[#05080f]/95 lg:bg-[#05080f]/80 backdrop-blur-xl ${isExpanded ? 'w-72 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'}`}>

                <div className="h-20 flex items-center px-5 gap-3 border-b border-slate-900/30 flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center rounded-xl flex-shrink-0 shadow-lg shadow-cyan-900/20">
                        <span className="material-symbols-outlined text-white text-xl">water_drop</span>
                    </div>
                    {isExpanded && (
                        <div className="overflow-hidden whitespace-nowrap animate-reveal">
                            <h1 className="text-sm font-black tracking-tight text-white leading-none uppercase">EPS SEMAPACH</h1>
                            <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-1">Gerencia Op.</p>
                        </div>
                    )}
                </div>

                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto no-scrollbar">
                    {visibleItems.map((section) => (
                        <div key={section.section} className="mb-6">
                            {isExpanded && (
                                <div className="px-3 py-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] animate-reveal">{section.section}</div>
                            )}
                            {section.items.map((item) => (
                                <NavLink key={item.path} to={item.path}
                                    className={({ isActive }) => `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/10' : 'text-slate-500 hover:bg-slate-900/50 hover:text-slate-200'}`}>
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isExpanded ? '' : 'group-hover:bg-cyan-500/10'}`}>
                                        <span className={`material-symbols-outlined text-[20px] ${isExpanded ? '' : 'group-hover:text-cyan-400'}`}>{item.icon}</span>
                                    </div>
                                    {isExpanded && <span className="text-sm truncate animate-reveal">{item.label}</span>}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-900/30">
                    <button onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
                        <span className="material-symbols-outlined text-xl">logout</span>
                        {isExpanded && <span className="text-xs font-bold uppercase tracking-widest">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* CONTENIDO PRINCIPAL */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="h-14 sm:h-16 flex items-center justify-between px-2 sm:px-8 bg-[#05080f]/80 backdrop-blur-xl border-b border-slate-900/50 sticky top-0 z-40">
                    <div className="flex items-center gap-1.5 sm:gap-4 overflow-hidden shrink-0">
                        <button onClick={() => setSidebarActive(!sidebarActive)}
                            className="lg:hidden flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-slate-800/50 rounded-xl border border-slate-700 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-sm sm:text-base text-cyan-400">{sidebarActive ? 'close' : 'menu'}</span>
                        </button>

                        <button onClick={() => navigate(-1)}
                            className="flex flex-shrink-0 items-center justify-center w-8 h-8 sm:w-auto sm:px-4 sm:py-2 bg-slate-800/30 hover:bg-slate-700/50 border border-slate-800 hover:border-cyan-500/30 rounded-xl transition-all group">
                            <span className="material-symbols-outlined text-sm sm:text-lg text-slate-400 group-hover:text-cyan-400">arrow_back</span>
                            <span className="hidden sm:block text-[9px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest ml-2">Atrás</span>
                        </button>

                        <button onClick={() => navigate('/home')}
                            className="flex flex-shrink-0 items-center justify-center w-8 h-8 sm:w-auto sm:px-4 sm:py-2 bg-slate-800/30 hover:bg-slate-700/50 border border-slate-800 hover:border-cyan-500/30 rounded-xl transition-all group">
                            <span className="material-symbols-outlined text-sm sm:text-lg text-slate-400 group-hover:text-cyan-400">home</span>
                            <span className="hidden sm:block text-[9px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest ml-2">Inicio</span>
                        </button>
                        
                        <ThemeToggle />

                        <div className="hidden md:flex flex-col min-w-0 ml-2">
                            <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest leading-none mb-1 opacity-60">Módulo</span>
                            <p className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-[200px]">{currentLabel}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-8 justify-end min-w-0">
                        {isMaintenanceModule && <div className="flex-shrink-0 scale-95 sm:scale-100"><AssetTypeFilter /></div>}
                        
                        <div className="hidden xs:flex items-center gap-2 sm:gap-3 glass-morphism px-2 sm:px-4 py-1 sm:py-1.5 rounded-full border-cyan-500/10 shrink-0">
                            <div className="w-6 h-6 sm:w-6 sm:h-6 bg-gold-gradient rounded-full flex-shrink-0 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white">
                                {user?.username?.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="hidden sm:flex flex-col text-right">
                                <span className="text-[9px] font-black text-white leading-none uppercase">{user?.username}</span>
                                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">{user?.role}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 no-scrollbar bg-mesh-premium">
                    <div id="export-canvas" className="w-full max-w-[1500px] mx-auto pb-10">
                        <Routes>
                            <Route path="/dashboard" element={<DashboardOperativo />} />
                            <Route path="/activos" element={<MaestroActivos />} />
                            <Route path="/diagnostico" element={<DiagnosticoInicial />} />
                            <Route path="/operacion-diaria" element={<RegistroDiario />} />
                            <Route path="/fallas" element={<RegistroFallas />} />
                            <Route path="/preventivos" element={<GestionPreventivos />} />
                            <Route path="/dashboard-gerencial" element={<DashboardGerencial />} />
                            <Route path="/inteligencia" element={<MotorInteligencia />} />
                            <Route path="/apm" element={<APMDesempenio />} />
                            <Route path="/monitoreo-agua/*" element={<MonitoreoAgua />} />
                            <Route path="/control-ptap/*" element={<ControlPTAP />} />
                            <Route path="/produccion-opaptar/*" element={<ProduccionOPAPTAR />} />
                            <Route path="/estaciones" element={<EstacionesHidricas />} />
                            <Route path="/mantenimiento" element={<MantenimientoIntegrado />} />
                            <Route path="/plan-2026" element={<PlanMantenimiento2026 />} />
                            <Route path="/user-management" element={<ProtectedRoute reqRole="gerencia"><UserManagement /></ProtectedRoute>} />
                            <Route path="/mi-perfil" element={<MiPerfil />} />
                            <Route path="/catalogos" element={<Catalogos />} />
                            <Route path="/reportes" element={<Reportes />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </div>
                </div>


                {/* Overlay para cerrar sidebar en móvil */}
                {sidebarActive && (
                    <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]" onClick={() => setSidebarActive(false)}></div>
                )}

                <footer className="flex h-10 items-center justify-between px-4 sm:px-8 bg-[#05080f] border-t border-slate-900 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Status:</span>
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.4)]"></div>
                        <span className="text-[9px] font-black text-cyan-500/60 uppercase tracking-tighter">v1.9 Ultra Premium</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">EPS SEMAPACH — 2026</span>
                </footer>
            </main>
        </div>
    )
}

// ===== HOME CON SELECTOR DE MÓDULOS =====
function HomeModules() {
    const navigate = useNavigate()
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null

    const modules = [
        {
            id: 'mantenimiento',
            title: 'Gestión de Mantenimiento',
            subtitle: 'Flota + Estaciones Hídricas',
            icon: 'engineering',
            description: 'Control integral de mantenimiento preventivo y correctivo.',
            color: 'from-sky-500 to-blue-600',
            shadow: 'shadow-sky-900/40',
            route: '/dashboard'
        },
        {
            id: 'ptap',
            title: 'PTAP Portachuelo',
            subtitle: 'Planta de Tratamiento',
            icon: 'settings_input_component',
            description: 'Monitoreo de parámetros de calidad de agua.',
            color: 'from-emerald-500 to-teal-600',
            shadow: 'shadow-emerald-900/40',
            route: '/control-ptap'
        },
        {
            id: 'presion',
            title: 'Presión y Continuidad',
            subtitle: 'Red de Distribución',
            icon: 'water_pressure',
            description: 'Control de presión y horas de servicio.',
            color: 'from-violet-500 to-purple-600',
            shadow: 'shadow-violet-900/40',
            route: '/monitoreo-agua'
        },
        {
            id: 'produccion',
            title: 'Producción OPAPTAR',
            subtitle: 'Pozos + EBAP + PTAP',
            icon: 'precision_manufacturing',
            description: 'Producción de agua potable y tratamiento de aguas residuales.',
            color: 'from-amber-500 to-orange-600',
            shadow: 'shadow-amber-900/40',
            route: '/produccion-opaptar'
        }
    ]

    const handleLogout = () => {
        const currentTheme = localStorage.getItem('app-theme');
        localStorage.clear();
        if (currentTheme) localStorage.setItem('app-theme', currentTheme);
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-mesh-premium flex flex-col items-center justify-center relative overflow-hidden px-4">

            {/* Elementos Decorativos de Fondo */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold-500/5 rounded-full blur-[120px]"></div>

            {/* Header / Logo — Ultra Compacto y Responsivo */}
            <header className="fixed top-0 left-0 w-full p-4 flex items-center justify-between z-50 bg-[#030712]/90 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/40">
                        <span className="material-symbols-outlined text-white text-lg">water_drop</span>
                    </div>
                    <div className="hidden xs:block">
                        <h1 className="text-xs font-black tracking-tighter text-white uppercase leading-none">EPS SEMAPACH</h1>
                        <p className="text-[7px] text-cyan-400 font-bold uppercase tracking-widest mt-0.5">Sistemas</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {user && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 max-w-[120px] sm:max-w-none">
                            <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-[8px] font-black text-white flex-shrink-0">
                                {user.username?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[9px] font-black text-white uppercase truncate">{user.username}</span>
                        </div>
                    )}
                    <ThemeToggle />
                    <button onClick={handleLogout} className="w-9 h-9 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 flex items-center justify-center rounded-xl transition-all">
                        <span className="material-symbols-outlined text-lg">logout</span>
                    </button>
                </div>
            </header>

            {/* Contenido Principal — Espaciado Ajustado para Móvil */}
            <div className="max-w-5xl w-full text-center z-10 pt-24 pb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/5 border border-cyan-500/20 mb-6 animate-reveal">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">Inteligencia Operativa 2026</span>
                </div>

                <h2 className="text-2xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-4 animate-reveal">
                    GERENCIA DE <br />
                    <span className="gold-gradient-text">OPERACIONES</span>
                </h2>

                <p className="text-xs sm:text-lg text-slate-400 font-medium max-w-lg mx-auto mb-8 animate-reveal">
                    Selecciona el sistema al que deseas ingresar
                </p>

                {/* Grid de Módulos - 3 Columnas Pro Premium */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto animate-reveal" style={{ animationDelay: '0.8s' }}>
                    {modules.map((module) => (
                        <button
                            key={module.id}
                            onClick={() => navigate(module.route)}
                            className="group relative bg-[#0f172a]/40 backdrop-blur-xl border border-slate-800/50 hover:border-cyan-500/30 rounded-[2.5rem] p-8 text-left transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            {/* Decoración de Fondo Industrial */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/[0.02] rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors duration-700"></div>
                            <div className="absolute top-6 right-8 opacity-[0.05] group-hover:opacity-10 transition-all duration-500">
                                <span className="material-symbols-outlined text-6xl text-white select-none pointer-events-none">
                                    {module.id === 'mantenimiento' ? 'precision_manufacturing' : module.id === 'ptap' ? 'water_full' : module.id === 'presion' ? 'water_pressure' : 'manufacturing'}
                                </span>
                            </div>

                            {/* Icono con Glow */}
                            <div className={`relative w-16 h-16 bg-gradient-to-br ${module.color} rounded-2xl flex items-center justify-center shadow-2xl ${module.shadow} mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="material-symbols-outlined text-white text-3xl">{module.icon}</span>
                            </div>

                            {/* Etiquetas y Título */}
                            <div className="space-y-4">
                                <div>
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-[8.5px] font-black uppercase tracking-widest bg-gradient-to-r ${module.color} text-white mb-4 shadow-lg shadow-black/20`}>
                                        {module.id === 'mantenimiento' ? 'Flota + Estaciones' : module.subtitle.split(' ')[0]}
                                    </div>
                                    <h3 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-cyan-400 transition-colors">
                                        {module.title}
                                    </h3>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium group-hover:text-slate-400 transition-colors duration-300">
                                    {module.description}
                                </p>
                            </div>

                            {/* Barra de Progreso / Acción Decorativa */}
                            <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
                                    <span className={`bg-gradient-to-r ${module.color} bg-clip-text text-transparent`}>Explorar Módulo</span>
                                    <span className="material-symbols-outlined text-base text-cyan-500 group-hover:translate-x-2 transition-transform duration-300">arrow_forward</span>
                                </div>
                                <div className="flex gap-1">
                                    <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                    <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                    <div className="w-4 h-1 rounded-full bg-cyan-600"></div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer de la Landing — Ahora parte del flujo para evitar solapamientos */}
            <div className="mt-12 mb-8 w-full text-center animate-reveal">
                <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4">
                    Eficiencia & Poder Tecnológico en Gestión de Agua
                </p>
            </div>

            {/* Efecto de Vidrio Inferior */}
            <div className="absolute bottom-[-50px] left-0 w-full h-[150px] bg-gradient-to-t from-[#030712] to-transparent z-0"></div>
        </div>
    )
}

export default function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <AssetTypeProvider>
                    <Routes>
                        {/* Redirección raíz a Landing Page descriptiva */}
                        <Route path="/" element={<LandingPage />} />

                        {/* Rutas Públicas */}
                        <Route path="/login" element={<AuthPage />} />
                        <Route path="/register" element={<AuthPage />} />

                        {/* Home con módulos (protegido) */}
                        <Route path="/home" element={
                            <ProtectedRoute>
                                <HomeModules />
                            </ProtectedRoute>
                        } />

                        {/* Rutas Protegidas (Dashboard y módulos) */}
                        <Route path="/*" element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </AssetTypeProvider>
            </BrowserRouter>
        </ThemeProvider>
    )
}
