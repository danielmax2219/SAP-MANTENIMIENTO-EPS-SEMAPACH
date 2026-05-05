import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAssetType } from '../contexts/AssetTypeContext'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function DashboardOperativo() {
    const { assetType } = useAssetType()
    const [kpi, setKpi] = useState<any>(null)
    const [assetKpis, setAssetKpis] = useState<any[]>([])
    const [backlog, setBacklog] = useState<any[]>([])
    const [assets, setAssets] = useState<any[]>([])
    const [stations, setStations] = useState<any[]>([])
    const [activeStations, setActiveStations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [week, setWeek] = useState(() => {
        const d = new Date(); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
        return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
    })
    const [fleetSector, setFleetSector] = useState('General')
    const [toast, setToast] = useState<string | null>(null)

    const { desde, hasta } = (() => {
        const [y, w] = week.split('-W')
        if (!y || !w) return { desde: '', hasta: '' }
        const year = parseInt(y, 10); const d = new Date(year, 0, 4)
        const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1 + (parseInt(w, 10) - 1) * 7)
        const st = new Date(d); const en = new Date(d); en.setDate(en.getDate() + 6)
        return { desde: st.toISOString().split('T')[0], hasta: en.toISOString().split('T')[0] }
    })()

    // Filtrado estricto: solo muestra datos del modo seleccionado
    const isFleetMode = assetType === 'fleet'
    const isStationMode = assetType === 'stations'

    useEffect(() => {
        setLoading(true)
        // Limpiar datos previos
        setKpi(null); setAssetKpis([]); setBacklog([]); setAssets([]); setStations([]); setActiveStations([])

        const loadData = async () => {
            try {
                const promises: Promise<any>[] = []

                if (isFleetMode) {
                    // MODO FLOTA: Solo datos de flota vehicular
                    const params: any = { desde, hasta, categoria: 'fleet' }
                    if (fleetSector) params.sector = fleetSector

                    promises.push(api.getKPIGlobal(params.desde, params.hasta, params.sector, params.categoria))
                    promises.push(api.getKPIPorActivo(params.desde, params.hasta, params.sector, params.categoria))
                    promises.push(api.getPreventiveBacklog())
                    promises.push(api.getAssets({ categoria: 'fleet' }))
                } else if (isStationMode) {
                    // MODO ESTACIONES: Solo datos de estaciones hídricas
                    const params: any = { desde, hasta, categoria: 'stations' }

                    promises.push(api.getKPIGlobal(params.desde, params.hasta, undefined, params.categoria))
                    promises.push(api.getKPIPorActivo(params.desde, params.hasta, undefined, params.categoria))
                    promises.push(api.getPreventiveBacklog())
                    promises.push(api.getAssets({ categoria: 'stations' }))
                    promises.push(api.getStations())
                }

                const results = await Promise.all(promises)
                let idx = 0

                if (isFleetMode || isStationMode) {
                    setKpi(results[idx++])
                    setAssetKpis(results[idx++])
                    setBacklog(results[idx++])
                    setAssets(results[idx++])
                }

                if (isStationMode) {
                    const allStations = results[idx++]
                    setStations(allStations)
                    // Filtrar estaciones que tienen mantenimiento en esta semana
                    const stationsWithActivity: any[] = []
                    for (const s of allStations) {
                        const maint = await api.getStationMaintenance(s.id, { desde, hasta })
                        if (maint.length > 0) {
                            stationsWithActivity.push({ ...s, maintenanceCount: maint.length })
                        }
                    }
                    setActiveStations(stationsWithActivity)
                }
                setLoading(false)
            } catch (e: any) {
                console.error("Dashboard error:", e)
                setToast(`Error cargando datos: ${e.message || String(e)}`)
                setLoading(false)
            }
        }

        loadData()
    }, [desde, hasta, fleetSector, assetType, isFleetMode, isStationMode])

    const fleetSectores = ['General', ...Array.from(new Set(assets.map(a => a.tipo_unidad))).filter(Boolean)]

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" /></div>

    const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
    const backlogByStatus = backlog.reduce((acc: any, b) => {
        acc[b.estado_preventivo] = (acc[b.estado_preventivo] || 0) + 1
        return acc
    }, {})
    const backlogChartData = Object.entries(backlogByStatus).map(([name, value]) => ({ name, value }))

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header Premium */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-900/40">
                            <span className="material-symbols-outlined text-white text-3xl">monitoring</span>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Dashboard Operativo</h2>
                            <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mt-1">
                                {assetType === 'fleet' ? 'Inteligencia de Flota Vehicular' : 'Control de Estaciones Hídricas'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 pl-3">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Período:</span>
                            <input type="week" value={week} onChange={e => setWeek(e.target.value)}
                                className="text-xs font-black text-slate-100 bg-slate-800/80 border border-slate-600 rounded-xl py-2 px-3 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                        {isFleetMode && fleetSectores.length > 1 && (
                            <>
                                <div className="h-6 w-px bg-slate-700"></div>
                                <div className="flex items-center gap-2.5 pr-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">🚗 Sector:</span>
                                    <select value={fleetSector} onChange={e => setFleetSector(e.target.value)}
                                        className="text-xs font-black text-slate-100 bg-slate-800/80 border border-slate-600 rounded-xl py-2 px-3 focus:ring-sky-500 focus:border-sky-500">
                                        {fleetSectores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ========== SECCIÓN FLOTA ========== */}
            {isFleetMode && kpi && (
                <>
                    {/* KPIs Flota - Estilo Premium */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-emerald-500/20 rounded-[2rem] p-8 shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 transition-all duration-500 group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] block mb-3">Disponibilidad Global</span>
                                    <div className="text-5xl lg:text-6xl font-black text-white tracking-tighter">{kpi.disponibilidad_global?.toFixed(1) ?? '—'}<span className="text-2xl text-slate-500 ml-2">%</span></div>
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-emerald-500/20">
                                    <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-900/50 h-3 rounded-full overflow-hidden shadow-inner border border-slate-800">
                                <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.4)]" style={{ width: `${kpi.disponibilidad_global ?? 0}%` }}></div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-amber-500/20 rounded-[2rem] p-8 shadow-2xl hover:shadow-amber-500/10 hover:border-amber-500/40 transition-all duration-500 group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] block mb-3">MTTR Estimado</span>
                                    {kpi.fallas_correctivas === 0 ? (
                                        <div className="text-3xl lg:text-4xl font-black text-emerald-400 tracking-tighter mt-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-3xl">verified</span>
                                            SIN FALLAS
                                        </div>
                                    ) : (
                                        <div className="text-5xl lg:text-6xl font-black text-white tracking-tighter">{kpi.mttr_global?.toFixed(1) ?? '—'}<span className="text-2xl text-slate-500 ml-2">h</span></div>
                                    )}
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-amber-500/20">
                                    <span className="material-symbols-outlined text-amber-400 text-3xl">timer</span>
                                </div>
                            </div>
                            <div className="text-[10px] bg-amber-500/10 border border-amber-500/20 inline-block px-4 py-1.5 rounded-lg text-amber-300 font-black uppercase tracking-[0.2em]">Meta: &lt;5.0h</div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-blue-500/20 rounded-[2rem] p-8 shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/40 transition-all duration-500 group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] block mb-3">MTBF Confiabilidad</span>
                                    {kpi.fallas_correctivas === 0 ? (
                                        <div className="text-3xl lg:text-4xl font-black text-emerald-400 tracking-tighter mt-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-3xl">verified</span>
                                            SIN FALLAS
                                        </div>
                                    ) : (
                                        <div className="text-5xl lg:text-6xl font-black text-white tracking-tighter">{kpi.mtbf_global?.toFixed(1) ?? '—'}<span className="text-2xl text-slate-500 ml-2">h</span></div>
                                    )}
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-blue-500/20">
                                    <span className="material-symbols-outlined text-blue-400 text-3xl">update</span>
                                </div>
                            </div>
                            <div className="text-[10px] bg-blue-500/10 border border-blue-500/20 inline-block px-4 py-1.5 rounded-lg text-blue-300 font-black uppercase tracking-[0.2em]">Meta: &gt;100h</div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-rose-500/20 rounded-[2rem] p-8 shadow-2xl hover:shadow-rose-500/10 hover:border-rose-500/40 transition-all duration-500 group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] block mb-3">Fallas Críticas</span>
                                    <div className="text-5xl lg:text-6xl font-black text-white tracking-tighter">{kpi.fallas_correctivas ?? '—'}</div>
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-br from-rose-500/20 to-rose-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-rose-500/20">
                                    <span className="material-symbols-outlined text-rose-400 text-3xl">warning</span>
                                </div>
                            </div>
                            <div className="text-[10px] bg-rose-500/10 border border-rose-500/20 inline-block px-4 py-1.5 rounded-lg text-rose-300 font-black uppercase tracking-[0.2em]">Total Eventos: {kpi.total_fallas ?? '—'}</div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-sky-500/20 rounded-[2rem] p-8 shadow-2xl hover:shadow-sky-500/10 hover:border-sky-500/40 transition-all duration-500 group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] block mb-3">Preventivos Realizados</span>
                                    <div className="text-5xl lg:text-6xl font-black text-white tracking-tighter">{kpi.preventivos_ejecutados ?? '—'}</div>
                                </div>
                                <div className="w-16 h-16 bg-gradient-to-br from-sky-500/20 to-sky-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-sky-500/20">
                                    <span className="material-symbols-outlined text-sky-400 text-3xl">engineering</span>
                                </div>
                            </div>
                            <div className="text-[10px] bg-sky-500/10 border border-sky-500/20 inline-block px-4 py-1.5 rounded-lg text-sky-300 font-black uppercase tracking-[0.2em]">Ejecución: S/ {kpi.costo_preventivo?.toLocaleString() ?? '—'}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Backlog */}
                        {backlog.length > 0 && (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden shadow-premium-lg">
                                <div className="px-8 py-6 border-b border-slate-700 flex items-center justify-between bg-slate-900/40">
                                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                                        <span className="material-symbols-outlined text-sky-400 text-xl">directions_car</span>
                                        Estado de Backlog Preventivo
                                    </h3>
                                    <span className="text-xs font-black text-slate-100 bg-slate-700 px-4 py-1.5 rounded-xl shadow-lg border border-white/5">{backlog.length} activos</span>
                                </div>
                                <div className="p-10 flex flex-col items-center">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full mb-12">
                                        {Object.entries(backlogByStatus).map(([status, count]) => (
                                            <div key={status} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50 shadow-inner group hover:border-white/20 transition-all duration-500 text-center">
                                                <div className={`text-4xl lg:text-5xl font-black mb-2 tracking-tighter ${status === 'Vencido' ? 'text-rose-500' : status === 'Crítico' ? 'text-amber-500' : status === 'Próximo' ? 'text-sky-500' : 'text-emerald-500'}`}>{count as number}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-white transition-colors">{status}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="w-full h-[400px] relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie 
                                                    data={backlogChartData} 
                                                    dataKey="value" 
                                                    nameKey="name" 
                                                    cx="50%" 
                                                    cy="50%" 
                                                    innerRadius={80} 
                                                    outerRadius={140}
                                                    paddingAngle={6}
                                                    stroke="none"
                                                >
                                                    {backlogChartData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} className="focus:outline-none" />)}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 24, fontSize: 12, fontWeight: '900', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }} 
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-5xl font-black text-white leading-none tracking-tighter shadow-2xl">{backlog.length}</span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-3">Total</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Ranking */}
                        {assetKpis.length > 0 && (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden shadow-premium-lg">
                                <div className="px-8 py-6 border-b border-slate-700 bg-slate-900/40">
                                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                                        <span className="material-symbols-outlined text-amber-400 text-xl">workspace_premium</span>
                                        Ranking de Disponibilidad
                                    </h3>
                                </div>
                                <div className="overflow-x-auto max-h-[600px] overflow-y-auto no-scrollbar">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-700/50 bg-slate-800/50">
                                                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase">#</th>
                                                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Activo</th>
                                                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase hidden sm:table-cell">Tipo</th>
                                                <th className="text-center px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...assetKpis].sort((a, b) => (a.disponibilidad ?? 100) - (b.disponibilidad ?? 100)).map((a, i) => {
                                                const asset = assets.find(x => x.codigo_patrimonial === a.asset_codigo)
                                                const dispColor = (a.disponibilidad ?? 0) >= 90 ? 'text-emerald-400' : (a.disponibilidad ?? 0) >= 75 ? 'text-amber-400' : 'text-rose-400'
                                                return (
                                                    <tr key={a.asset_id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                                                        <td className="px-6 py-5 font-mono text-slate-500 font-bold">{i + 1}</td>
                                                        <td className="px-6 py-5">
                                                            <div className="text-white font-bold text-sm tracking-tight">{asset?.placa_principal || a.asset_codigo}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{a.asset_codigo}</div>
                                                        </td>
                                                        <td className="px-6 py-5 text-slate-300 font-medium hidden sm:table-cell">{a.asset_tipo}</td>
                                                        <td className="px-6 py-5 text-center">
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <span className={`font-mono font-black text-sm ${dispColor}`}>{a.disponibilidad?.toFixed(1) ?? '—'}%</span>
                                                                <div className="w-20 bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                                    <div className={`${dispColor.replace('text-', 'bg-')} h-full rounded-full`} style={{ width: `${a.disponibilidad ?? 0}%` }}></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ========== SECCIÓN ESTACIONES ========== */}
            {isStationMode && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-400 text-sm">location_on</span>
                            Estaciones con Actividad esta Semana
                        </h3>
                        <span className="text-[10px] font-black text-slate-500 bg-slate-700/50 px-2 py-1 rounded-lg">
                            {stations.length} estaciones
                        </span>
                    </div>
                    {stations.length > 0 ? (
                        <div className="p-5">
                            {activeStations.length > 0 ? (
                                <>
                                    <p className="text-[10px] text-slate-400 mb-3">
                                        <span className="text-emerald-400 font-bold">{activeStations.length}</span> tienen mantenimiento programado esta semana
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {activeStations.map(s => (
                                            <div key={s.id} className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse"></span>
                                                <div className="min-w-0">
                                                    <span className="text-xs text-white font-medium truncate block">{s.nombre}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">{s.tipo}{s.distrito ? ` · ${s.distrito}` : ''} · {s.maintenanceCount} mtto(s)</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {stations.slice(0, 9).map(s => (
                                        <div key={s.id} className="flex items-center gap-3 bg-slate-700/30 rounded-lg px-4 py-3 opacity-60">
                                            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 flex-shrink-0"></span>
                                            <div className="min-w-0">
                                                <span className="text-xs text-slate-300 font-medium truncate block">{s.nombre}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">{s.tipo}{s.distrito ? ` · ${s.distrito}` : ''}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {stations.length > 9 && (
                                <p className="text-[10px] text-slate-500 mt-4 text-center">
                                    ··· mostrando 9 de {stations.length} ···
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-600 block mb-2">location_off</span>
                            <p className="text-sm text-slate-500">No hay estaciones registradas en el sistema</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
