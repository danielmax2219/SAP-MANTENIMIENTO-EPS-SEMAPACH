const API_BASE = import.meta.env.VITE_API_URL || '/api'

/** Cliente HTTP genérico para el backend */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        ...options,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || `Error ${res.status}`)
    }
    return res.json()
}

export const api = {
    // === Activos ===
    getAssets: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/assets${qs}`)
    },
    getAsset: (id: number) => request<any>(`/assets/${id}`),
    createAsset: (data: any) => request<any>('/assets', { method: 'POST', body: JSON.stringify(data) }),
    updateAsset: (id: number, data: any) => request<any>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAsset: (id: number) => request<any>(`/assets/${id}`, { method: 'DELETE' }),

    // === Catálogos ===
    getCatalog: (tipo: string) => request<any[]>(`/catalogs?tipo=${tipo}`),
    getAllCatalogs: () => request<any[]>('/catalogs'),
    getCatalogTypes: () => request<string[]>('/catalogs/tipos'),
    createCatalogItem: (data: { tipo: string; valor: string }) =>
        request<any>('/catalogs', { method: 'POST', body: JSON.stringify(data) }),
    deleteCatalogItem: (id: number) => request<any>(`/catalogs/${id}`, { method: 'DELETE' }),

    // === Operadores ===
    getOperators: () => request<any[]>('/operators'),
    createOperator: (data: any) => request<any>('/operators', { method: 'POST', body: JSON.stringify(data) }),
    updateOperator: (id: number, data: any) => request<any>(`/operators/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteOperator: (id: number) => request<any>(`/operators/${id}`, { method: 'DELETE' }),

    // === Registro diario ===
    getDailyRecords: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/daily-records${qs}`)
    },
    createDailyRecord: (data: any) => request<any>('/daily-records', { method: 'POST', body: JSON.stringify(data) }),
    updateDailyRecord: (id: number, data: any) => request<any>(`/daily-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDailyRecord: (id: number) => request<any>(`/daily-records/${id}`, { method: 'DELETE' }),

    // === Fallas ===
    getFailures: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/failures${qs}`)
    },
    createFailure: (data: any) => request<any>('/failures', { method: 'POST', body: JSON.stringify(data) }),
    updateFailure: (id: number, data: any) => request<any>(`/failures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteFailure: (id: number) => request<any>(`/failures/${id}`, { method: 'DELETE' }),

    // === Preventivos ===
    getPreventiveEvents: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/preventive/events${qs}`)
    },
    createPreventiveEvent: (data: any) => request<any>('/preventive/events', { method: 'POST', body: JSON.stringify(data) }),
    updatePreventiveEvent: (id: number, data: any) => request<any>(`/preventive/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePreventiveEvent: (id: number) => request<any>(`/preventive/events/${id}`, { method: 'DELETE' }),
    getPreventiveConfig: () => request<any[]>('/preventive/config'),
    createPreventiveConfig: (data: any) => request<any>('/preventive/config', { method: 'POST', body: JSON.stringify(data) }),
    updatePreventiveConfig: (id: number, data: any) => request<any>(`/preventive/config/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePreventiveConfig: (id: number) => request<any>(`/preventive/config/${id}`, { method: 'DELETE' }),
    getPreventiveBacklog: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/preventive/backlog${qs}`)
    },

    // === Diagnóstico inicial ===
    getDiagnoses: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/diagnosis${qs}`)
    },
    getDiagnosis: (assetId: number) => request<any | null>(`/diagnosis/${assetId}`),
    createDiagnosis: (data: any) => request<any>('/diagnosis', { method: 'POST', body: JSON.stringify(data) }),
    updateDiagnosis: (assetId: number, data: any) => request<any>(`/diagnosis/${assetId}`, { method: 'PUT', body: JSON.stringify(data) }),

    // === KPI ===
    getKPIGlobal: (desde: string, hasta: string, sector?: string) => request<any>(`/kpi/global?desde=${desde}&hasta=${hasta}${sector && sector !== 'General' ? '&sector=' + encodeURIComponent(sector) : ''}`),
    getKPIPorActivo: (desde: string, hasta: string, sector?: string) => request<any[]>(`/kpi/por-activo?desde=${desde}&hasta=${hasta}${sector && sector !== 'General' ? '&sector=' + encodeURIComponent(sector) : ''}`),

    // === Producción OPAPTAR ===
    getProduccionBD: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/produccion/bd${qs}`)
    },
    bulkCreateProduccionBD: (rows: any[]) => request<any>('/produccion/bd/bulk', { method: 'POST', body: JSON.stringify({ rows }) }),
    getProduccionSurtidor: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/produccion/surtidor${qs}`)
    },
    bulkCreateProduccionSurtidor: (rows: any[]) => request<any>('/produccion/surtidor/bulk', { method: 'POST', body: JSON.stringify({ rows }) }),
    getProduccionRSanjuan: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/produccion/rsanjuan${qs}`)
    },
    bulkCreateProduccionRSanjuan: (rows: any[]) => request<any>('/produccion/rsanjuan/bulk', { method: 'POST', body: JSON.stringify({ rows }) }),
    getProduccionDashboard: () => request<any>('/produccion/dashboard'),
    uploadProduccionExcel: (file: File, tipo: string) => {
        const formData = new FormData()
        formData.append('file', file)
        return fetch(`${API_BASE}/produccion/import?tipo=${tipo}`, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
        }).then(r => r.json())
    },

    // === Monitoreo de Agua ===
    getWaterReadings: (params: { fecha?: string; inicio?: string; fin?: string }) => {
        const qs = '?' + new URLSearchParams(params as any).toString()
        return request<any[]>(`/water/readings${qs}`)
    },
    getWaterStats: (inicio: string, fin: string) => request<any>(`/water/stats?inicio=${inicio}&fin=${fin}`),
    bulkCreateWaterReadings: (readings: any[]) => request<any>('/water/readings/bulk', { method: 'POST', body: JSON.stringify({ readings }) }),

    // === PTAP Portachuelo ===
    savePTAPReading: (data: any) => request<any>('/water/ptap', { method: 'POST', body: JSON.stringify(data) }),
    bulkCreatePTAPReadings: (readings: any[]) => request<any>('/water/ptap/bulk', { method: 'POST', body: JSON.stringify({ readings }) }),
    getPTAPDaily: (fecha: string) => request<any[]>(`/water/ptap/daily?fecha=${fecha}`),
    getPTAPDashboard: (fecha: string) => request<any[]>(`/water/ptap/dashboard?fecha=${fecha}`),

    // === Estaciones Hídricas ===
    getStations: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/stations${qs}`)
    },
    getStation: (id: number) => request<any>(`/stations/${id}`),
    getStationEquipment: (id: number) => request<any[]>(`/stations/${id}/equipment`),
    getStationMaintenance: (id: number, params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/stations/${id}/maintenance${qs}`)
    },
    getStationMaintenanceHistory: (id: number) => request<any[]>(`/stations/${id}/maintenance-history`),
    getStationRecords: (id: number) => request<any[]>(`/stations/${id}/records`),
    createStation: (data: any) => request<any>('/stations', { method: 'POST', body: JSON.stringify(data) }),
    updateStation: (id: number, data: any) => request<any>(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteStation: (id: number) => request<any>(`/stations/${id}`, { method: 'DELETE' }),
    addStationEquipment: (stationId: number, data: any) => request<any>(`/stations/${stationId}/equipment`, { method: 'POST', body: JSON.stringify(data) }),
    updateStationEquipment: (id: number, data: any) => request<any>(`/stations/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteStationEquipment: (id: number) => request<any>(`/stations/equipment/${id}`, { method: 'DELETE' }),
    addStationMaintenance: (stationId: number, data: any) => request<any>(`/stations/${stationId}/maintenance`, { method: 'POST', body: JSON.stringify(data) }),
    deleteStationMaintenance: (id: number) => request<any>(`/stations/maintenance/${id}`, { method: 'DELETE' }),
    addStationRecord: (stationId: number, data: any) => request<any>(`/stations/${stationId}/records`, { method: 'POST', body: JSON.stringify(data) }),

    // === Plan Mantenimiento 2026 ===
    getPlan2026Activities: () => request<any[]>('/stations/plan-2026/activities'),
    getPlan2026Summary: () => request<any>('/stations/plan-2026/summary'),

    // === Inteligencia Estaciones ===
    getStationAlerts: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any[]>(`/stations/intelligence/alerts${qs}`)
    },
    getStationRecommendations: () => request<any[]>('/stations/intelligence/recommendations'),
    getStationRankings: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : ''
        return request<any>(`/stations/intelligence/station-rankings${qs}`)
    },

    // === Autenticación ===
    login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
}
