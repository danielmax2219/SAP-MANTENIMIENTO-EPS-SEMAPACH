import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'

export default function MantenimientoIntegrado() {
    const { assetType } = useAssetType()

    // Filtrado estricto según el selector global
    const showFleet = assetType === 'fleet'
    const showStations = assetType === 'stations'

    const [stations, setStations] = useState<any[]>([])
    const [vehicles, setVehicles] = useState<any[]>([])
    const [activities, setActivities] = useState<any[]>([])
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [selectedType, setSelectedType] = useState<'station' | 'vehicle' | null>(null)
    const [items, setItems] = useState<any[]>([])
    const [maintenanceLog, setMaintenanceLog] = useState<any[]>([])
    const [filterDesde, setFilterDesde] = useState('')
    const [filterHasta, setFilterHasta] = useState('')
    const [filterTipo, setFilterTipo] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        equipment_id: '', activity_code: '', fecha: new Date().toISOString().split('T')[0],
        tipo: 'preventivo', descripcion: '', horas_trabajadas: '', costo: '', tecnico: '', observaciones: '',
        asset_id: '', operador_id: '', hora_inicio: '', hora_fin: '', sistema_afectado: '', severidad: '', causa_probable: '', accion_correctiva: ''
    })
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        if (selectedId && selectedType) loadDetail()
    }, [selectedId, selectedType, filterDesde, filterHasta, filterTipo])

    const loadInitialData = async () => {
        setLoading(true)
        try {
            const promises: Promise<any>[] = [api.getPlan2026Activities()]
            if (assetType !== 'stations') promises.push(api.getAssets())
            if (assetType !== 'fleet') promises.push(api.getStations())

            const results = await Promise.all(promises)
            let idx = 0
            setActivities(results[idx++])
            if (assetType !== 'stations') setVehicles(results[idx++])
            if (assetType !== 'fleet') setStations(results[idx++])
        } catch (e: any) {
            showToast(e.message, 'err')
        }
        setLoading(false)
    }

    const loadDetail = async () => {
        if (!selectedId || !selectedType) return
        setLoading(true)
        try {
            if (selectedType === 'station') {
                const params: Record<string, string> = {}
                if (filterDesde) params.desde = filterDesde
                if (filterHasta) params.hasta = filterHasta
                if (filterTipo) params.tipo = filterTipo
                const [eqRes, logRes] = await Promise.all([
                    api.getStationEquipment(selectedId),
                    api.getStationMaintenance(selectedId, params)
                ])
                setItems(eqRes)
                setMaintenanceLog(logRes)
            } else {
                // Vehicle: show as "general" since fleet maintenance is tracked via failures/preventives
                setItems([{ id: 0, codigo: 'GENERAL', tipo_equipo: 'Vehículo completo' }])
                const params: Record<string, string> = {}
                if (filterDesde) params.desde = filterDesde
                if (filterHasta) params.hasta = filterHasta
                // Use failures as maintenance log for vehicles
                const failures = await api.getFailures(params)
                setMaintenanceLog(failures.filter((f: any) => f.asset_id === selectedId))
            }
        } catch (e: any) {
            showToast(e.message, 'err')
        }
        setLoading(false)
    }

    const showToast = (msg: string, type: 'ok' | 'err') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const handleSubmit = async () => {
        if (!form.fecha || !form.descripcion) return showToast('Fecha y descripción son obligatorios', 'err')
        try {
            if (selectedType === 'station') {
                await api.addStationMaintenance(selectedId!, form)
                showToast('Mantenimiento registrado en estación', 'ok')
            } else {
                // For vehicles, create a failure record as maintenance log
                await api.createFailure({
                    fecha: form.fecha, asset_id: selectedId, operador_id: form.operador_id || null,
                    hora_inicio: form.hora_inicio || '08:00', hora_fin: form.hora_fin || '17:00',
                    tipo_evento: form.tipo === 'emergencia' ? 'Correctivo' : 'Preventivo',
                    clasificacion_falla: form.tipo, sistema_afectado: form.sistema_afectado || 'General',
                    severidad: form.tipo === 'emergencia' ? 'Alta' : 'Baja',
                    descripcion: form.descripcion, causa_probable: form.causa_probable || '',
                    accion_correctiva: form.accion_correctiva || '',
                    inmovilizo_unidad: 0, es_correctiva_no_programada: form.tipo === 'emergencia' ? 1 : 0,
                    costo_reparacion: form.costo || null, observaciones: form.observaciones || ''
                })
                showToast('Mantenimiento registrado en vehículo', 'ok')
            }
            setShowForm(false)
            setForm({ equipment_id: '', activity_code: '', fecha: new Date().toISOString().split('T')[0], tipo: 'preventivo', descripcion: '', horas_trabajadas: '', costo: '', tecnico: '', observaciones: '', asset_id: '', operador_id: '', hora_inicio: '', hora_fin: '', sistema_afectado: '', severidad: '', causa_probable: '', accion_correctiva: '' })
            loadDetail()
        } catch (e: any) {
            showToast(e.message, 'err')
        }
    }

    const totalCosto = maintenanceLog.reduce((sum, m) => sum + (Number(m.costo || m.costo_reparacion) || 0), 0)
    const totalHoras = maintenanceLog.reduce((sum, m) => sum + (Number(m.horas_trabajadas || m.duracion_horas) || 0), 0)

    const tipoColors: Record<string, string> = {
        preventivo: 'bg-emerald-500/20 text-emerald-400',
        correctivo: 'bg-red-500/20 text-red-400',
        emergencia: 'bg-amber-500/20 text-amber-400',
    }

    const currentItem = selectedType === 'station'
        ? stations.find(s => s.id === selectedId)
        : vehicles.find(v => v.id === selectedId)

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" /></div>

    return (
        <div className="space-y-4">
            {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-bold ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>{toast.msg}</div>}

            {/* Header Premium */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-cyan-400 text-3xl md:text-4xl">engineering</span>
                        Mantenimiento Integrado
                    </h1>
                    <p className="text-[11px] md:text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Registro unificado para flota y estaciones hídricas</p>
                </div>
                <button onClick={() => setShowForm(true)} disabled={!selectedId}
                    className="btn-premium btn-premium-cyan text-[10px] md:text-xs uppercase flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                    <span className="material-symbols-outlined text-base">add_task</span> 
                    <span className="hidden sm:inline">Nuevo Registro</span>
                </button>
            </div>

            {/* Filtros de Búsqueda (Glassmorphism) */}
            <div className="glass-morphism rounded-[2rem] p-5 sm:p-6 mb-8 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-cyan-400">filter_list</span>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Filtros de Búsqueda</h3>
                </div>
                
                {/* Selector de activo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assetType !== 'stations' && (
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-hover:text-cyan-400 transition-colors">directions_car</span>
                            <select value={selectedType === 'vehicle' ? (selectedId ?? '') : ''} onChange={e => { setSelectedType('vehicle'); setSelectedId(e.target.value ? Number(e.target.value) : null) }}
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all appearance-none outline-none">
                                <option value="">Seleccionar vehículo...</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.codigo_patrimonial} — {v.placa_principal || v.tipo_unidad}</option>)}
                            </select>
                        </div>
                    )}
                    {assetType !== 'fleet' && (
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-hover:text-purple-400 transition-colors">location_on</span>
                            <select value={selectedType === 'station' ? (selectedId ?? '') : ''} onChange={e => { setSelectedType('station'); setSelectedId(e.target.value ? Number(e.target.value) : null) }}
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all appearance-none outline-none">
                                <option value="">Seleccionar estación...</option>
                                {stations.map(s => <option key={s.id} value={s.id}>{s.codigo} — {s.nombre} ({s.tipo})</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-800/50 pt-4 mt-4">
                    <div className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-sm">calendar_today</span>
                        <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)}
                            className="w-full bg-slate-900/30 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2.5 text-xs font-mono text-slate-300 focus:ring-1 focus:ring-cyan-500 outline-none transition-all" />
                    </div>
                    <div className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-sm">calendar_today</span>
                        <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)}
                            className="w-full bg-slate-900/30 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2.5 text-xs font-mono text-slate-300 focus:ring-1 focus:ring-cyan-500 outline-none transition-all" />
                    </div>
                    <div className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500 text-sm">category</span>
                        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
                            className="w-full bg-slate-900/30 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-300 focus:ring-1 focus:ring-cyan-500 outline-none appearance-none transition-all">
                            <option value="">Todos los tipos</option>
                            <option value="preventivo">Preventivo</option>
                            <option value="correctivo">Correctivo</option>
                            <option value="emergencia">Emergencia</option>
                        </select>
                    </div>
                </div>
            </div>

            {currentItem ? (
                <>
                    {/* Stats Premium */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-[1.5rem] p-6 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><span className="material-symbols-outlined text-5xl">list_alt</span></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-2">Registros Totales</span>
                            <div className="text-4xl font-black text-white tracking-tighter">{maintenanceLog.length}</div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-emerald-500/20 rounded-[1.5rem] p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><span className="material-symbols-outlined text-5xl text-emerald-400">payments</span></div>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] block mb-2">Costo Total</span>
                            <div className="text-4xl font-black text-emerald-400 tracking-tighter">S/ {totalCosto.toFixed(2)}</div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-sky-500/20 rounded-[1.5rem] p-6 shadow-xl relative overflow-hidden group hover:border-sky-500/40 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><span className="material-symbols-outlined text-5xl text-sky-400">schedule</span></div>
                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] block mb-2">Horas Invertidas</span>
                            <div className="text-4xl font-black text-sky-400 tracking-tighter">{totalHoras.toFixed(2)}<span className="text-xl ml-1 text-slate-500">h</span></div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-amber-500/20 rounded-[1.5rem] p-6 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><span className="material-symbols-outlined text-5xl text-amber-400">extension</span></div>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] block mb-2">Componentes</span>
                            <div className="text-4xl font-black text-white tracking-tighter">{items.length}</div>
                        </div>
                    </div>

                    {/* Tabla Premium */}
                    <div className="premium-card p-0 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/40">
                            <div className="flex items-center gap-3">
                                <span className={`material-symbols-outlined text-2xl ${selectedType === 'station' ? 'text-purple-400' : 'text-sky-400'}`}>
                                    {selectedType === 'station' ? 'water_drop' : 'directions_car'}
                                </span>
                                <div>
                                    <h2 className="text-sm font-black text-white uppercase tracking-wider">
                                        {currentItem.nombre || currentItem.placa_principal || currentItem.codigo_patrimonial} — Historial
                                    </h2>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedType === 'station' ? 'Estación' : 'Vehículo'}</span>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedType === 'station' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                                {selectedType === 'station' ? currentItem.tipo : currentItem.tipo_unidad}
                            </span>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left border-collapse table-premium">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Tipo</th>
                                        <th className="hidden md:table-cell">Actividad</th>
                                        <th>Descripción</th>
                                        <th className="hidden sm:table-cell text-right">Horas</th>
                                        <th className="text-right">Costo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {maintenanceLog.map((m, i) => (
                                        <tr key={m.id || i} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="font-mono text-xs text-slate-300 whitespace-nowrap">{(m.fecha || '').split('T')[0]}</td>
                                            <td>
                                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${tipoColors[m.tipo] || tipoColors[m.clasificacion_falla] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'} ${m.tipo === 'preventivo' ? 'border-emerald-500/20' : m.tipo === 'correctivo' ? 'border-red-500/20' : m.tipo === 'emergencia' ? 'border-amber-500/20' : ''}`}>
                                                    {m.tipo || m.clasificacion_falla || '—'}
                                                </span>
                                            </td>
                                            <td className="font-mono text-xs text-cyan-400 font-bold hidden md:table-cell">{m.activity_code || '—'}</td>
                                            <td className="text-sm text-slate-200 max-w-[250px] truncate">{m.descripcion || '—'}</td>
                                            <td className="text-right text-sm text-slate-300 font-medium hidden sm:table-cell">{(m.horas_trabajadas || m.duracion_horas) ? `${m.horas_trabajadas || m.duracion_horas}h` : '—'}</td>
                                            <td className="text-right text-sm text-emerald-400 font-black">{(m.costo || m.costo_reparacion) ? `S/ ${Number(m.costo || m.costo_reparacion).toFixed(2)}` : '—'}</td>
                                        </tr>
                                    ))}
                                    {maintenanceLog.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12">
                                                <div className="flex flex-col items-center justify-center text-slate-500">
                                                    <span className="material-symbols-outlined text-4xl mb-3 opacity-50">history_toggle_off</span>
                                                    <span className="text-xs font-bold uppercase tracking-widest">Sin registros en este periodo</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
                <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-slate-900/20 rounded-[2rem] border border-slate-800/50 border-dashed backdrop-blur-sm">
                    <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-slate-700/50">
                        <span className="material-symbols-outlined text-5xl text-slate-400 animate-pulse">troubleshoot</span>
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Modo de Consulta Activo</h3>
                    <p className="text-sm font-medium text-slate-400 max-w-md text-center">Selecciona un vehículo o estación en los filtros superiores para desplegar su historial completo de mantenimiento, costos y horas invertidas.</p>
                </div>

            {/* Formulario */}
            {showForm && currentItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-lg font-black text-white">Registrar Mantenimiento</h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha *</label>
                                    <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1">
                                        <option value="preventivo">Preventivo</option>
                                        <option value="correctivo">Correctivo</option>
                                        <option value="emergencia">Emergencia</option>
                                    </select>
                                </div>
                            </div>
                            {selectedType === 'station' && (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Equipo</label>
                                    <select value={form.equipment_id} onChange={e => setForm({ ...form, equipment_id: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1">
                                        <option value="">General</option>
                                        {items.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.codigo} — {eq.tipo_equipo}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Actividad</label>
                                <select value={form.activity_code} onChange={e => setForm({ ...form, activity_code: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1">
                                    <option value="">Sin actividad</option>
                                    {activities.map(a => <option key={a.codigo} value={a.codigo}>{a.codigo} — {a.nombre.substring(0, 35)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Descripción *</label>
                                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" placeholder="Detalle del trabajo realizado..." />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Horas</label>
                                    <input type="number" step="0.5" value={form.horas_trabajadas} onChange={e => setForm({ ...form, horas_trabajadas: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Costo (S/)</label>
                                    <input type="number" step="0.01" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Técnico</label>
                                    <input value={form.tecnico} onChange={e => setForm({ ...form, tecnico: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Observaciones</label>
                                <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mt-1" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">Cancelar</button>
                            <button onClick={handleSubmit} className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-black uppercase px-6 py-2 rounded-lg">Registrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
