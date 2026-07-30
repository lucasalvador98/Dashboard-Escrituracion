import React, { useMemo, useState, useCallback } from "react";
import useDataLoader from "./hooks/useDataLoader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function StatusDot({ color }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function getEscribano(item) {
  return item["Escribano Designado"] ?? item.Escribano ?? item.escribano ?? "";
}

function diffClass(val, esperado) {
  if (val === "N/A" || val === "" || val == null) return "gray";
  const n = Number(val);
  if (isNaN(n)) return "gray";
  if (n <= esperado) return "green";
  if (n <= Math.ceil(esperado * 1.3)) return "yellow";
  return "red";
}

function parseDate(f) {
  if (!f || f === "N/A") return null;
  try {
    return new Date(f.includes("/") ? f.split("/").reverse().join("-") : f);
  } catch { return null; }
}

// ─── Alerts computation ───────────────────────────────────────────────────────

export default function DashboardTab() {
  const { data, loading, error } = useDataLoader("escrituracion");

  // ── Filter state ──
  const [filters, setFilters] = useState({
    department: "Todos",
    escribano: "Todos",
    dateFrom: "",
    dateTo: "",
  });

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ department: "Todos", escribano: "Todos", dateFrom: "", dateTo: "" });
  }, []);

  const hasActiveFilters = filters.department !== "Todos" || filters.escribano !== "Todos" || filters.dateFrom || filters.dateTo;

  // ── Apply filters ──
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter(item => {
      if (filters.department !== "Todos" && item.Departamento !== filters.department) return false;
      if (filters.escribano !== "Todos" && getEscribano(item) !== filters.escribano) return false;
      if (filters.dateFrom || filters.dateTo) {
        const fechaFirma = parseDate(item["Fecha de Firma"]);
        if (!fechaFirma) return false;
        if (filters.dateFrom && fechaFirma < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && fechaFirma > new Date(filters.dateTo)) return false;
      }
      return true;
    });
  }, [data, filters]);

  // ── Dropdown options (from full data) ──
  const { departments, escribanos } = useMemo(() => {
    if (!Array.isArray(data)) return { departments: [], escribanos: [] };
    const depts = [...new Set(data.map(i => i.Departamento).filter(Boolean))].sort();
    const escs = [...new Set(data.map(getEscribano).filter(Boolean))].sort();
    return { departments: depts, escribanos: escs };
  }, [data]);

  // ── KPIs (from filtered data) ──
  const kpis = useMemo(() => {
    if (!filteredData.length) return null;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const total = filteredData.length;

    const estadoCount = {};
    filteredData.forEach(item => {
      const est = (item.Estado || item.estado || "Sin estado").toString().trim();
      estadoCount[est] = (estadoCount[est] || 0) + 1;
    });

    const enProceso = estadoCount["En Trámite"] || 0;
    const finalizadas = (estadoCount["Finalizada sin Entregar"] || 0) + (estadoCount["Entregada"] || 0);
    const deBaja = estadoCount["De Baja"] || 0;

    const finalizadasEsteMes = filteredData.filter(item => {
      if (!item["Fecha de Firma"] || item["Fecha de Firma"] === "N/A") return false;
      try {
        const fechaFirma = new Date(item["Fecha de Firma"]);
        return fechaFirma.getMonth() === currentMonth && fechaFirma.getFullYear() === currentYear;
      } catch { return false; }
    }).length;

    const proximasFirmas = filteredData
      .filter(item => {
        if (!item["Fecha de Firma"] || item["Fecha de Firma"] === "N/A") return false;
        try {
          const d = new Date(item["Fecha de Firma"]);
          return !isNaN(d) && d >= today;
        } catch { return false; }
      })
      .sort((a, b) => new Date(a["Fecha de Firma"]) - new Date(b["Fecha de Firma"]))
      .slice(0, 8);

    const monthlyData = {};
    filteredData.forEach(item => {
      const raw = item["Fecha Ingreso Colegio de Escribanos"];
      if (raw && raw !== "N/A") {
        try {
          const fecha = new Date(raw);
          const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
          monthlyData[key] = (monthlyData[key] || 0) + 1;
        } catch {}
      }
    });

    const chartData = Object.entries(monthlyData)
      .map(([key, count]) => {
        const [y, m] = key.split("-");
        const label = new Date(+y, +m - 1).toLocaleString("es-ES", { month: "short", year: "2-digit" });
        return { month: label, count, _key: key };
      })
      .sort((a, b) => a._key.localeCompare(b._key));

    const escribanoCount = {};
    filteredData.forEach(item => {
      const nombre = getEscribano(item);
      if (nombre && nombre !== "N/A") {
        escribanoCount[nombre] = (escribanoCount[nombre] || 0) + 1;
      }
    });
    const topEscribanos = Object.entries(escribanoCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      total, enProceso, finalizadas, deBaja, finalizadasEsteMes,
      proximasFirmas, chartData, topEscribanos, estadoCount,
    };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="spinner"></div>
        <p className="text-sm text-slate-400 font-medium">Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error my-4">
        <p>{error}</p>
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div className="space-y-6">

      {/* ── Dashboard Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtros</span>

          <select
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.department}
            onChange={e => setFilter("department", e.target.value)}
          >
            <option value="Todos">Todos los departamentos</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.escribano}
            onChange={e => setFilter("escribano", e.target.value)}
          >
            <option value="Todos">Todos los escribanos</option>
            {escribanos.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <input
            type="date"
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.dateFrom}
            onChange={e => setFilter("dateFrom", e.target.value)}
            placeholder="Desde"
          />
          <input
            type="date"
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.dateTo}
            onChange={e => setFilter("dateTo", e.target.value)}
            placeholder="Hasta"
          />

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Limpiar ×
            </button>
          )}

          <span className="text-[11px] text-slate-400 ml-auto">
            {filteredData.length} de {data.length} registros
          </span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Escrituraciones"
          value={kpis.total}
          color="#3b82f6"
          bg="from-blue-50 to-blue-100/50"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
            </svg>
          }
        />
        <KPICard
          label="En Trámite"
          value={kpis.enProceso}
          color="#f59e0b"
          bg="from-amber-50 to-amber-100/50"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          }
        />
        <KPICard
          label="Finalizadas"
          value={kpis.finalizadas}
          color="#10b981"
          bg="from-emerald-50 to-emerald-100/50"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>
            </svg>
          }
        />
        <KPICard
          label="Firmas este Mes"
          value={kpis.finalizadasEsteMes}
          color="#8b5cf6"
          bg="from-violet-50 to-violet-100/50"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          }
        />
      </div>

      {/* ── Row: Chart + Estado breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Ingresos por Mes</h3>
          {kpis.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={kpis.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px" }}
                  formatter={(value) => [`${value} escrituraciones`, "Cantidad"]}
                  cursor={{ fill: "rgba(59,130,246,0.06)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-slate-400 text-sm">
              Sin datos para graficar
            </div>
          )}
        </div>

        {/* Estado breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Distribución por Estado</h3>
          <div className="space-y-3">
            {[
              { label: "En Trámite", count: kpis.enProceso, color: "#f59e0b" },
              { label: "Finalizada sin Entregar", count: kpis.estadoCount["Finalizada sin Entregar"] || 0, color: "#6366f1" },
              { label: "Entregada", count: kpis.estadoCount["Entregada"] || 0, color: "#10b981" },
              { label: "De Baja", count: kpis.deBaja, color: "#ef4444" },
              { label: "Hipotecada", count: kpis.estadoCount["Hipotecada"] || 0, color: "#f97316" },
              { label: "No Retiradas", count: kpis.estadoCount["No Retiradas"] || 0, color: "#94a3b8" },
            ].filter(s => s.count > 0).map(s => {
              const pct = kpis.total ? Math.round((s.count / kpis.total) * 100) : 0;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <StatusDot color={s.color} />
                      <span className="text-xs font-semibold text-slate-600">{s.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">{s.count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top escribanos */}
          {kpis.topEscribanos.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Top Escribanos</h4>
              <div className="space-y-2">
                {kpis.topEscribanos.map(([nombre, count], i) => (
                  <div key={nombre} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-slate-300 w-4">{i + 1}</span>
                      <span className="text-xs font-medium text-slate-700 truncate">{nombre}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900 ml-2">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Próximas Firmas ── */}
      {kpis.proximasFirmas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Próximas Firmas</h3>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {kpis.proximasFirmas.length} programadas
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.proximasFirmas.map((item, idx) => {
              const nombre = item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? "—";
              const fechaRaw = item["Fecha de Firma"];
              let fechaObj = null;
              try { fechaObj = new Date(fechaRaw); } catch {}
              const diasRestantes = fechaObj ? Math.ceil((fechaObj - new Date()) / (1000 * 60 * 60 * 24)) : null;

              return (
                <div
                  key={idx}
                  className="group relative bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-300">#{idx + 1}</span>
                    {diasRestantes !== null && diasRestantes <= 7 && diasRestantes >= 0 && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        {diasRestantes === 0 ? "Hoy" : `${diasRestantes}d`}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-800 leading-tight mb-1 truncate">{nombre}</p>
                  <p className="text-xs text-slate-500 font-mono">{item.DNI || "—"}</p>
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-600">{fechaRaw}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}


function KPICard({ label, value, color, bg, icon }) {
  return (
    <div className={`relative bg-gradient-to-br ${bg} rounded-2xl p-5 border border-white/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden`}>
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}
        >
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black tracking-tight mb-0.5" style={{ color }}>
        {typeof value === "number" ? value.toLocaleString("es-AR") : value}
      </div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      <div
        className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.07]"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
