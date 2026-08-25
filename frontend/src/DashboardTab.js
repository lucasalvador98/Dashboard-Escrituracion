import React, { useMemo, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import useDataLoader from "./hooks/useDataLoader";
import useUrlState from "./hooks/useUrlState";
import { parseDate, contarDiasHabiles, diffClass, INTERVALS } from "./lib/deadlines";
import SlidePanel from "./components/SlidePanel";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function StatusDot({ color }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function CountChip({ color, count, label }) {
  if (!count) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
      style={{ backgroundColor: `${color}1a`, color }}
      title={label}
    >
      {count}
    </span>
  );
}

function getEscribano(item) {
  return item["Escribano Designado"] ?? item.Escribano ?? item.escribano ?? "";
}

function isIPV(item) {
  return /DIRECC[IÓO]N DE VIVIENDAS/i.test(item.Observaciones || "");
}

// Plazo esperado Acep→Firma (días hábiles), según cronología oficial
const ESCROW_ESPERADO = 20;

// Severidad de un caso demorado — misma regla que el semáforo de la matriz
// (verde ≤ esperado, amarillo ≤ esperado×1.3, rojo por encima)
function severidadDias(dias) {
  return diffClass(dias, ESCROW_ESPERADO);
}

const SEVERIDAD_STYLE = {
  green: { badge: "bg-emerald-100 text-emerald-700", row: "hover:bg-emerald-50/40" },
  yellow: { badge: "bg-amber-100 text-amber-700", row: "hover:bg-amber-50/40" },
  red: { badge: "bg-red-100 text-red-700", row: "hover:bg-red-50/40" },
  gray: { badge: "bg-slate-100 text-slate-500", row: "hover:bg-slate-50/40" },
};

function formatFechaCorta(f) {
  if (!f || f === "N/A" || f === "") return "—";
  const d = parseDate(f);
  if (!d) return f;
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function downloadCSV(filename, content) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Alerts computation ───────────────────────────────────────────────────────

export default function DashboardTab() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const location = useLocation();
  const { state, set, reset } = useUrlState({
    scope: "dashboard",
    defaults: { departamento: "Todos", escribano: "Todos", estado: "Todos", desde: "", hasta: "", tab: "resumen" },
    sharedKeys: ["escribano", "estado"],
    paramMap: { departamento: "depto", desde: "desde", hasta: "hasta", tab: "tab" },
  });

  const setFilter = useCallback((key, value) => {
    set({ [key]: value });
  }, [set]);

  const linkTo = useCallback((extra) => {
    const params = new URLSearchParams(location.search);
    Object.entries(extra).forEach(([k, v]) => {
      if (v == null || v === "" || v === "Todos") params.delete(k);
      else params.set(k, v);
    });
    return { pathname: "/dashboard", search: params.toString() ? `?${params.toString()}` : "" };
  }, [location.search]);

  const hasActiveFilters = state.departamento !== "Todos" || state.escribano !== "Todos" || state.estado !== "Todos" || state.desde || state.hasta;

  // ── Apply filters ──
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter(item => {
      if (state.departamento !== "Todos" && item.Departamento !== state.departamento) return false;
      if (state.escribano !== "Todos" && getEscribano(item) !== state.escribano) return false;
      if (state.estado !== "Todos") {
        const est = (item.Estado || item.estado || "").toString().trim();
        if (est !== state.estado) return false;
      }
      if (state.desde || state.hasta) {
        const fechaFirma = parseDate(item["Fecha de Firma"]);
        if (!fechaFirma) return false;
        if (state.desde && fechaFirma < new Date(state.desde)) return false;
        if (state.hasta && fechaFirma > new Date(state.hasta)) return false;
      }
      return true;
    });
  }, [data, state]);

  // ── Dropdown options (from full data) ──
  const { departments, escribanos, statuses } = useMemo(() => {
    if (!Array.isArray(data)) return { departments: [], escribanos: [], statuses: [] };
    const depts = [...new Set(data.map(i => i.Departamento).filter(Boolean))].sort();
    const escs = [...new Set(data.map(getEscribano).filter(Boolean))].sort();
    const stats = [...new Set(data.map(i => (i.Estado || i.estado || "").toString().trim()).filter(Boolean))].sort();
    return { departments: depts, escribanos: escs, statuses: stats };
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

    // Delta vs mes anterior (para el KPI de firmas)
    const firmasMesAnterior = filteredData.filter(item => {
      if (!item["Fecha de Firma"] || item["Fecha de Firma"] === "N/A") return false;
      try {
        const d = new Date(item["Fecha de Firma"]);
        const pm = currentMonth === 0 ? 11 : currentMonth - 1;
        const py = currentMonth === 0 ? currentYear - 1 : currentYear;
        return d.getMonth() === pm && d.getFullYear() === py;
      } catch { return false; }
    }).length;
    const deltaFirmas = finalizadasEsteMes - firmasMesAnterior;

    // Ingresos este mes (para el KPI de total)
    const ingresosEsteMes = filteredData.filter(item => {
      const raw = item["Fecha Ingreso Colegio de Escribanos"];
      if (!raw || raw === "N/A") return false;
      try {
        const d = new Date(raw);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
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
      deltaFirmas, ingresosEsteMes,
      proximasFirmas, chartData, topEscribanos, estadoCount,
    };
  }, [filteredData]);

  // ── Tendencia de demoras (Acep→Firma > 20d) por mes ──
  const demoraTrend = useMemo(() => {
    if (!filteredData.length) return [];
    const perMonth = {};
    filteredData.forEach(item => {
      const acep = item["Fecha de Aceptacion"];
      const val = item.diferencia_aceptacion_firma;
      if (!acep || acep === "N/A" || val === "N/A" || val == null) return;
      const t = parseDate(acep);
      if (!t) return;
      const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
      if (!perMonth[key]) perMonth[key] = { total: 0, delayed: 0 };
      perMonth[key].total++;
      if (Number(val) > 20) perMonth[key].delayed++;
    });
    return Object.entries(perMonth)
      .map(([key, v]) => {
        const [y, m] = key.split("-");
        const label = new Date(+y, +m - 1).toLocaleString("es-ES", { month: "short", year: "2-digit" });
        return {
          month: label, _key: key,
          pct: v.total ? Math.round((v.delayed / v.total) * 100) : 0,
          total: v.total, delayed: v.delayed,
        };
      })
      .sort((a, b) => a._key.localeCompare(b._key))
      .slice(-12);
  }, [filteredData]);

  // ── Semáforo global por intervalo ──
  const semaforo = useMemo(() => {
    if (!filteredData.length) return [];
    return INTERVALS.map(iv => {
      const counts = { green: 0, yellow: 0, red: 0, gray: 0 };
      filteredData.forEach(item => {
        const cls = diffClass(item[iv.key], iv.esperado);
        counts[cls] = (counts[cls] || 0) + 1;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { ...iv, ...counts, total, pctRed: total ? Math.round((counts.red / total) * 100) : 0 };
    });
  }, [filteredData]);

  // ── Demorados (Acep→Firma > 20d) ──
  const demorados = useMemo(() => {
    if (!filteredData.length) return [];
    const byEscribano = {};

    filteredData.forEach(item => {
      const val = item.diferencia_aceptacion_firma;
      if (val === "N/A" || val == null) return;
      const n = Number(val);
      if (isNaN(n) || n <= ESCROW_ESPERADO) return;

      const est = (item.Estado || item.estado || "").toString().trim();
      if (est !== "En Trámite") return;

      const nombre = getEscribano(item);
      if (!nombre) return;
      const beneficiario = item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? "—";

      if (!byEscribano[nombre]) byEscribano[nombre] = { nombre, items: [] };
      byEscribano[nombre].items.push({
        ...item,
        _escribano: nombre,
        _beneficiario: beneficiario,
        _depto: item.Departamento || "—",
        _barrio: item.Barrio || "—",
        _dias: n,
        _demora: n - ESCROW_ESPERADO,
      });
    });

    return Object.values(byEscribano)
      .map(e => ({
        ...e,
        avgDemora: Math.round(e.items.reduce((s, i) => s + i._demora, 0) / e.items.length),
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [filteredData]);

  // Lista plana de todos los casos demorados (para tabla + filtros)
  const demoradosFlat = useMemo(() => {
    const flat = [];
    demorados.forEach(esc => esc.items.forEach(i => flat.push(i)));
    return flat.sort((a, b) => b._demora - a._demora);
  }, [demorados]);

  const demoradoDeptos = useMemo(() =>
    [...new Set(demoradosFlat.map(i => i._depto).filter(v => v !== "—"))].sort(),
  [demoradosFlat]);

  // ── Filtros de la pestaña Demorados ──
  const [demoradoFiltro, setDemoradoFiltro] = useState({
    escribano: "", depto: "", localidad: "", barrio: "", estado: "", severidad: "", search: ""
  });
  const [demoradoDetail, setDemoradoDetail] = useState(null);
  const [demoradosShowAdvanced, setDemoradosShowAdvanced] = useState(false);

  // Valores únicos para los filtros
  const demoradoLocalidades = useMemo(() =>
    [...new Set(demoradosFlat.map(i => i.Localidad).filter(v => v && v !== "—"))].sort(),
  [demoradosFlat]);

  const demoradoBarrios = useMemo(() =>
    [...new Set(demoradosFlat.map(i => i._barrio).filter(v => v && v !== "—"))].sort(),
  [demoradosFlat]);

  const demoradoEstados = useMemo(() =>
    [...new Set(demoradosFlat.map(i => i.Estado || i.estado).filter(Boolean))].sort(),
  [demoradosFlat]);

  // Matcher compartido; si se pasa skipEscribano, ignora el filtro de escribano (para el sidebar)
  const matchDemorado = useCallback((i, skipEscribano = false) => {
    const f = demoradoFiltro;
    if (!skipEscribano && f.escribano && i._escribano !== f.escribano) return false;
    if (f.depto && i._depto !== f.depto) return false;
    if (f.localidad && i.Localidad !== f.localidad) return false;
    if (f.barrio && i._barrio !== f.barrio) return false;
    if (f.estado && (i.estado || i.Estado) !== f.estado) return false;
    if (f.severidad && severidadDias(i._dias) !== f.severidad) return false;
    if (f.search) {
      const q = f.search.trim().toLowerCase();
      const hay = `${i._escribano} ${i._beneficiario} ${i.DNI || ""} ${i._depto} ${i._barrio} ${i.Localidad || ""}`.toLowerCase().includes(q);
      if (!hay) return false;
    }
    return true;
  }, [demoradoFiltro]);

  const demoradosFiltrados = useMemo(() => demoradosFlat.filter(i => matchDemorado(i)), [demoradosFlat, matchDemorado]);

  // Sidebar: grupos por escribano sin aplicar el filtro de escribano (para poder cambiar entre ellos)
  const demoradosSidebar = useMemo(() => {
    const grupos = {};
    demoradosFlat.filter(i => matchDemorado(i, true)).forEach(i => {
      (grupos[i._escribano] = grupos[i._escribano] || []).push(i);
    });
    return Object.entries(grupos)
      .map(([nombre, items]) => {
        let peor = "green";
        items.forEach(i => {
          const s = severidadDias(i._dias);
          if (s === "red" || (s === "yellow" && peor === "green")) peor = s;
        });
        return { nombre, items, peor, avg: Math.round(items.reduce((s, i) => s + i._demora, 0) / items.length) };
      })
      .sort((a, b) => (b.items.length - a.items.length) || b.avg - a.avg);
  }, [demoradosFlat, matchDemorado]);

  // Tabla: grupos de los casos ya filtrados por escribo seleccionado
  const demoradosPorEscribano = useMemo(() => {
    const grupos = {};
    demoradosFiltrados.forEach(i => {
      (grupos[i._escribano] = grupos[i._escribano] || []).push(i);
    });
    return Object.entries(grupos)
      .map(([nombre, items]) => ({
        nombre,
        items,
        avg: Math.round(items.reduce((s, i) => s + i._demora, 0) / items.length),
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [demoradosFiltrados]);

  const tieneFiltroDemorados = !!(demoradoFiltro.escribano || demoradoFiltro.depto || demoradoFiltro.localidad || demoradoFiltro.barrio || demoradoFiltro.estado || demoradoFiltro.severidad || demoradoFiltro.search);

  const limpiarFiltrosDemorados = useCallback(() => {
    setDemoradoFiltro({ escribano: "", estado: "", depto: "", localidad: "", barrio: "", severidad: "", search: "" });
  }, []);

  // ── Exportar resumen del dashboard ──
  const exportResumen = useCallback(() => {
    const rows = [];
    const csv = s => `"${String(s).replace(/"/g, '""')}"`;
    rows.push("RESUMEN DASHBOARD");
    rows.push(`Generado: ${new Date().toLocaleString("es-AR")}`);
    rows.push("");
    rows.push("KPIs");
    rows.push(`${csv("Métrica")},${csv("Valor")}`);
    rows.push(`${csv("Total Escrituraciones")},${kpis ? kpis.total : 0}`);
    rows.push(`${csv("En Trámite")},${kpis ? kpis.enProceso : 0}`);
    rows.push(`${csv("Finalizadas")},${kpis ? kpis.finalizadas : 0}`);
    rows.push(`${csv("Firmas este Mes")},${kpis ? kpis.finalizadasEsteMes : 0}`);
    rows.push(`${csv("Ingresos este Mes")},${kpis ? kpis.ingresosEsteMes : 0}`);
    rows.push("");
    rows.push("SEMAFORO POR INTERVALO");
    rows.push(`${csv("Intervalo")},${csv("Esperado")},${csv("Verde")},${csv("Amarillo")},${csv("Rojo")},${csv("Total")},${csv("% Rojo")}`);
    semaforo.forEach(s =>
      rows.push(`${csv(s.label)},${s.esperado},${s.green},${s.yellow},${s.red},${s.total},${s.pctRed}%`)
    );
    rows.push("");
    rows.push("DEMORADOS (Acep→Firma > 20d)");
    rows.push(`${csv("Escribano")},${csv("Beneficiario")},${csv("DNI")},${csv("Departamento")},${csv("Barrio")},${csv("Días")},${csv("Demora")}`);
    demorados.forEach(esc => esc.items.forEach(i =>
      rows.push(`${csv(esc.nombre)},${csv(i._beneficiario)},${csv(i.DNI || "—")},${csv(i._depto)},${csv(i._barrio)},${i._dias},${i._demora}`)
    ));
    downloadCSV(`Dashboard_Resumen_${new Date().toISOString().slice(0, 10)}.csv`, rows.join("\n"));
  }, [kpis, semaforo, demorados]);

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

      {/* ── Tab Switcher ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex bg-slate-100 rounded-lg p-0.5 w-fit">
          {[
            { key: "resumen", label: "Resumen" },
            { key: "demorados", label: `Demorados (${demorados.reduce((s, e) => s + e.items.length, 0)})` },
          ].map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                state.tab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => set({ tab: tab.key })}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={exportResumen}
          className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
          title="Exportar KPIs, semáforo y demorados a CSV"
        >
          ⬇ Exportar resumen
        </button>
      </div>

      {state.tab === "resumen" ? (
        <>
          {/* ── Dashboard Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtros</span>

          <select
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={state.departamento}
            onChange={e => set({ departamento: e.target.value })}
          >
            <option value="Todos">Todos los departamentos</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={state.escribano}
            onChange={e => set({ escribano: e.target.value })}
          >
            <option value="Todos">Todos los escribanos</option>
            {escribanos.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <select
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={state.estado}
            onChange={e => set({ estado: e.target.value })}
          >
            <option value="Todos">Todos los estados</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <input
            type="date"
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={state.desde}
            onChange={e => set({ desde: e.target.value })}
            placeholder="Desde"
          />
          <input
            type="date"
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={state.hasta}
            onChange={e => set({ hasta: e.target.value })}
            placeholder="Hasta"
          />

          <button
            onClick={reset}
            disabled={!hasActiveFilters}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-red-50 enabled:hover:text-red-700 enabled:hover:border-red-200 text-slate-500 border-slate-200 bg-white"
          >
            Limpiar ×
          </button>

          <span className="text-[11px] text-slate-400 ml-auto">
            {filteredData.length} de {data.length} registros
          </span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to={linkTo({ tab: "resumen" })} className="block">
          <KPICard
            label="Total Escrituraciones"
            value={kpis.total}
            color="#3b82f6"
            bg="from-blue-50 to-blue-100/50"
            delta={kpis.ingresosEsteMes}
            deltaLabel="ingresos este mes"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
              </svg>
            }
          />
        </Link>
        <Link to={linkTo({ tab: "resumen", estado: "En Trámite" })} className="block">
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
        </Link>
        <Link to={linkTo({ tab: "resumen" })} className="block">
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
        </Link>
        <Link to={linkTo({ tab: "resumen" })} className="block">
          <KPICard
            label="Firmas este Mes"
            value={kpis.finalizadasEsteMes}
            color="#8b5cf6"
            bg="from-violet-50 to-violet-100/50"
            delta={kpis.deltaFirmas}
            deltaLabel="vs mes anterior"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            }
          />
        </Link>
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
              const isActive = state.estado === s.label;
              return (
                <Link
                  key={s.label}
                  to={linkTo({ estado: isActive ? "Todos" : s.label, tab: "resumen" })}
                  className={`block rounded-lg p-1.5 -m-1.5 transition-colors ${isActive ? "bg-slate-100" : "hover:bg-slate-50"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <StatusDot color={s.color} />
                      <span className={`text-xs font-semibold ${isActive ? "text-slate-900" : "text-slate-600"}`}>{s.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">{s.count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: s.color, opacity: state.estado && !isActive ? 0.3 : 1 }}
                    />
                  </div>
                </Link>
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

      {/* ── Row: Tendencia de demoras + Semáforo ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tendencia de demoras */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Tendencia de Demoras (Acep→Firma)</h3>
          {demoraTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={demoraTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px" }}
                  formatter={(value, name) => name === "pct" ? [`${value}% demorados`, "% Demora"] : [value, name]}
                />
                <Line type="monotone" dataKey="pct" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: "#ef4444" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-slate-400 text-sm">
              Sin datos suficientes para graficar la tendencia
            </div>
          )}
        </div>

        {/* Semáforo global */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Semáforo de Plazos</h3>
          <div className="space-y-3">
            {semaforo.map(iv => (
              <div key={iv.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="min-w-0 mr-3">
                  <div className="text-xs font-bold text-slate-700">{iv.label}</div>
                  <div className="text-[10px] text-slate-400">esperado {iv.esperado}d</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <CountChip color="#10b981" count={iv.green} label="ok" />
                  <CountChip color="#f59e0b" count={iv.yellow} label="alerta" />
                  <CountChip color="#ef4444" count={iv.red} label="demora" />
                  <span className={`ml-1 text-[11px] font-bold ${iv.pctRed > 30 ? "text-red-600" : "text-slate-400"}`}>{iv.pctRed}%</span>
                </div>
              </div>
            ))}
          </div>
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

              // Riesgo Acep→Firma: si el intervalo ya superó (o está por superar) el plazo de 20d hábiles
              const acepFirmaDias = contarDiasHabiles(item["Fecha de Aceptacion"], fechaRaw);
              const enRiesgo = acepFirmaDias !== null && acepFirmaDias > 20;
              const enAlerta = !enRiesgo && acepFirmaDias !== null && acepFirmaDias > 15;

              return (
                <div
                  key={idx}
                  className={`group relative bg-gradient-to-br from-slate-50 to-white border rounded-xl p-4 transition-all duration-200 ${
                    enRiesgo
                      ? "border-red-300 hover:border-red-400 hover:shadow-md"
                      : enAlerta
                        ? "border-amber-200 hover:border-amber-300 hover:shadow-md"
                        : "border-slate-200/60 hover:border-blue-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2 gap-1">
                    <span className="text-[10px] font-bold text-slate-300">#{idx + 1}</span>
                    <div className="flex items-center gap-1">
                      {diasRestantes !== null && diasRestantes <= 7 && diasRestantes >= 0 && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          {diasRestantes === 0 ? "Hoy" : `${diasRestantes}d`}
                        </span>
                      )}
                      {enRiesgo && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full" title={`Acep→Firma: ${acepFirmaDias}d hábiles (> 20d)`}>
                          Riesgo
                        </span>
                      )}
                      {enAlerta && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full" title={`Acep→Firma: ${acepFirmaDias}d hábiles`}>
                          Alerta
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-800 leading-tight mb-1 truncate">{nombre}</p>
                  <p className="text-xs text-slate-500 font-mono">{item.DNI || "—"}</p>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-600">{fechaRaw}</p>
                    {acepFirmaDias !== null && (
                      <p className={`text-[10px] font-bold ${enRiesgo ? "text-red-600" : enAlerta ? "text-amber-600" : "text-slate-400"}`}>
                        Acep→Firma: {acepFirmaDias}d
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

        </>

      ) : (
        /* ── Tab: Demorados ── */
        <div className="space-y-4">
          {demorados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
              <span className="text-3xl">✅</span>
              <p className="text-sm text-slate-500 font-medium mt-2">Sin demoras — todos los casos están dentro del plazo</p>
            </div>
          ) : (
            <>
              {/* Panel de casos demorados: sidebar de escribanos + tabla */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                {/* Header: título + píldoras de severidad + conteo */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Casos Demorados</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                      {[
                        { key: "", label: "Todos" },
                        { key: "red", label: "Críticos" },
                        { key: "yellow", label: "Medios" },
                        { key: "green", label: "Leves" },
                      ].map(p => (
                        <button
                          key={p.key || "all"}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                            demoradoFiltro.severidad === p.key
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                          onClick={() => setDemoradoFiltro(f => ({ ...f, severidad: p.key }))}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                      {demoradosFiltrados.length} de {demoradosFlat.length} casos
                    </span>
                  </div>
                </div>

                {/* Búsqueda + toggle de filtros avanzados */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    className="flex-1 min-w-[180px] px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Buscar por escribano, nombre, DNI, depto o barrio..."
                    value={demoradoFiltro.search}
                    onChange={e => setDemoradoFiltro(f => ({ ...f, search: e.target.value }))}
                  />
                  <button
                    onClick={() => setDemoradosShowAdvanced(v => !v)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      demoradosShowAdvanced
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Filtros {demoradosShowAdvanced ? "▲" : "▼"}
                  </button>
                  <button
                    onClick={limpiarFiltrosDemorados}
                    disabled={!tieneFiltroDemorados}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-red-50 enabled:hover:text-red-700 enabled:hover:border-red-200 text-slate-500 border-slate-200 bg-white"
                  >
                    Limpiar ×
                  </button>
                </div>

                {/* Filtros avanzados (colapsables) */}
                {demoradosShowAdvanced && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                    <select
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={demoradoFiltro.depto}
                      onChange={e => setDemoradoFiltro(f => ({ ...f, depto: e.target.value }))}
                    >
                      <option value="">Todos los departamentos</option>
                      {demoradoDeptos.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={demoradoFiltro.localidad}
                      onChange={e => setDemoradoFiltro(f => ({ ...f, localidad: e.target.value }))}
                    >
                      <option value="">Todas las localidades</option>
                      {demoradoLocalidades.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={demoradoFiltro.barrio}
                      onChange={e => setDemoradoFiltro(f => ({ ...f, barrio: e.target.value }))}
                    >
                      <option value="">Todos los barrios</option>
                      {demoradoBarrios.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={demoradoFiltro.estado}
                      onChange={e => setDemoradoFiltro(f => ({ ...f, estado: e.target.value }))}
                    >
                      <option value="">Todos los estados</option>
                      {demoradoEstados.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}

                {/* Master-detail: sidebar escribanos + tabla */}
                <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 items-start">
                  {/* Sidebar de escribanos */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Escribanos</span>
                    </div>
                    <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-50">
                      <button
                        onClick={() => setDemoradoFiltro(f => ({ ...f, escribano: "" }))}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                          !demoradoFiltro.escribano
                            ? "bg-slate-800 text-white"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-xs font-bold">Todos</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${!demoradoFiltro.escribano ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {demoradosFlat.length}
                        </span>
                      </button>
                      {demoradosSidebar.map(esc => (
                        <button
                          key={esc.nombre}
                          onClick={() => setDemoradoFiltro(f => ({ ...f, escribano: f.escribano === esc.nombre ? "" : esc.nombre }))}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                            demoradoFiltro.escribano === esc.nombre
                              ? "bg-red-600 text-white"
                              : "bg-white hover:bg-red-50/60"
                          }`}
                          title={`${esc.items.length} ${esc.items.length === 1 ? "caso" : "casos"} · prom +${esc.avg}d`}
                        >
                          <span className="text-xs font-semibold truncate">{esc.nombre}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className={`w-2 h-2 rounded-full ${esc.peor === "red" ? "bg-red-500" : esc.peor === "yellow" ? "bg-amber-400" : "bg-emerald-400"}`}
                              title="Peor severidad"
                            />
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${demoradoFiltro.escribano === esc.nombre ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                              {esc.items.length}
                            </span>
                          </div>
                        </button>
                      ))}
                      {demoradosSidebar.length === 0 && (
                        <div className="px-3 py-6 text-center text-xs text-slate-400">
                          Sin casos con los filtros actuales
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabla de casos */}
                  <div className="overflow-x-auto max-h-[540px] overflow-y-auto rounded-xl border border-slate-100">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase">Beneficiario</th>
                          <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase">DNI</th>
                          <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase">Depto</th>
                          <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase">Barrio</th>
                          <th className="text-center py-2 px-2 text-[10px] font-bold text-slate-500 uppercase">Días</th>
                          <th className="text-center py-2 px-2 text-[10px] font-bold text-slate-500 uppercase">Demora</th>
                          <th className="text-right py-2 px-2 text-[10px] font-bold text-slate-500 uppercase">Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {demoradosPorEscribano.map(grupo => (
                          <React.Fragment key={grupo.nombre}>
                            {!demoradoFiltro.escribano && (
                              <tr className="bg-slate-100/70">
                                <td colSpan={7} className="py-1.5 px-2">
                                  <span className="text-[11px] font-bold text-slate-700">{grupo.nombre}</span>
                                  <span className="ml-2 text-[10px] font-semibold text-slate-400">
                                    {grupo.items.length} {grupo.items.length === 1 ? "caso" : "casos"} · prom +{grupo.avg}d
                                  </span>
                                </td>
                              </tr>
                            )}
                            {grupo.items.map((item, idx) => {
                              const sev = severidadDias(item._dias);
                              return (
                                <tr
                                  key={idx}
                                  onClick={() => setDemoradoDetail(item)}
                                  className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${SEVERIDAD_STYLE[sev].row}`}
                                  title={isIPV(item) ? "IPV: Caso en Dirección de Viviendas" : undefined}
                                >
                                  <td className="py-2 px-2 font-semibold text-slate-800">{item._beneficiario}</td>
                                  <td className="py-2 px-2 font-mono text-slate-500">{item.DNI || "—"}</td>
                                  <td className="py-2 px-2 text-slate-600">{item._depto}</td>
                                  <td className="py-2 px-2 text-slate-600">{item._barrio}</td>
                                  <td className="py-2 px-2 text-center">
                                    <span className={`inline-block min-w-[2.5rem] px-1.5 py-0.5 rounded-full text-[11px] font-bold ${SEVERIDAD_STYLE[sev].badge}`}>
                                      {item._dias}d
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-center font-bold text-red-600">+{item._demora}d</td>
                                  <td className="py-2 px-2 text-right text-blue-600 font-semibold">Ver →</td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                        {demoradosFiltrados.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No hay casos que coincidan con los filtros
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modal detalle de un caso demorado ── */}
      <SlidePanel
        isOpen={!!demoradoDetail}
        onClose={() => setDemoradoDetail(null)}
        title={demoradoDetail ? `Detalle — ${demoradoDetail._beneficiario}` : "Detalle"}
      >
        {demoradoDetail && <DemoradoDetailPanel item={demoradoDetail} />}
      </SlidePanel>

    </div>
  );
}


function DemoradoDetailPanel({ item }) {
  const benef = item._beneficiario || "—";
  const escribano = item._escribano || "—";
  const demora = item._demora ?? null;
  const dias = item._dias ?? null;
  const sev = severidadDias(dias);
  const sevBadge = SEVERIDAD_STYLE[sev]?.badge || SEVERIDAD_STYLE.gray.badge;

  // Secciones: datos accionables primero, técnica al final
  const secciones = [
    {
      titulo: "Personas",
      campos: [
        ["Beneficiario", benef],
        ["DNI", item.DNI || "—"],
        ["Teléfono", item.Telefono || "—"],
        ["Cotitular", item["COTITULAR Nombre y Apellido"] || "—"],
        ["Cotitular DNI", item["COTITULAR DNI"] || "—"],
      ],
    },
    {
      titulo: "Ubicación",
      campos: [
        ["Departamento", item.Departamento || "—"],
        ["Localidad", item.Localidad || "—"],
        ["Barrio", item.Barrio || "—"],
        ["Seccional", item.Seccional ?? "—"],
      ],
    },
    {
      titulo: "Escribano",
      campos: [
        ["Escribano", escribano],
        ["Contacto", item["Contacto Escribano"] || "—"],
      ],
    },
    {
      titulo: "Parcela y Catastro",
      campos: [
        ["Mza. Plano", item["Mza. Plano"] ?? "—"],
        ["Lote Plano", item["Lote Plano"] ?? "—"],
        ["Mza. Oficial", item["Mza. Oficial"] ?? "—"],
        ["Lote oficial", item["Lote oficial"] ?? "—"],
        ["Nomenclatura Catastral", item["Nomenclatura Catastral"] ?? "—"],
        ["Cuenta Rentas", item["Cuenta Rentas"] ?? "—"],
        ["Matrícula", item.Matricula ?? "—"],
      ],
    },
  ];

  const renderCampo = ([label, val]) => (
    <div key={label} className="flex items-start justify-between px-3 py-2 bg-white border-b border-slate-50 last:border-0">
      <span className="text-[11px] font-medium text-slate-500 mr-3 flex-shrink-0">{label}</span>
      <span className="text-xs font-semibold text-slate-800 text-right break-words max-w-[60%]">{val || "—"}</span>
    </div>
  );

  return (
    <div className="p-1 space-y-5">
      {/* Resumen de la demora */}
      <div className={`rounded-2xl p-4 ${demora !== null && demora > 10 ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Acep→Firma</div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sevBadge}`}>
            {sev === "green" ? "Leve" : sev === "yellow" ? "Media" : "Crítica"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-red-600">{dias}d</span>
          <div>
            <div className="text-xs font-bold text-red-600">+{demora}d de demora</div>
            <div className="text-[11px] text-slate-500">Plazo esperado: 20 días hábiles</div>
          </div>
        </div>
      </div>

      {/* Fechas del proceso */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Fechas del Proceso</div>
        <div className="grid grid-cols-1 gap-2">
          {[
            ["Ingreso Colegio", item["Fecha Ingreso Colegio de Escribanos"]],
            ["Sorteo", item["Fecha de Sorteo"]],
            ["Aceptación", item["Fecha de Aceptacion"]],
            ["Firma", item["Fecha de Firma"]],
            ["Ingreso Registro", item["Fecha de Ingreso al Registro"]],
            ["PT Digital", item["Fecha de envío PT digital"]],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-[11px] font-medium text-slate-500">{label}</span>
              <span className={`text-xs font-semibold ${!val || val === "N/A" || val === "" ? "text-slate-300" : "text-slate-800"}`}>
                {formatFechaCorta(val)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Campos agrupados */}
      {secciones.map(sec => (
        <div key={sec.titulo}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{sec.titulo}</div>
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            {sec.campos.map(renderCampo)}
          </div>
        </div>
      ))}

      {/* Estado y observaciones */}
      {(item.Estado || item.estado || item.Observaciones) && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Estado</div>
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            {renderCampo(["Estado", item.Estado || item.estado || "—"])}
            {renderCampo(["Observaciones", item.Observaciones || "—"])}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, color, bg, icon, delta, deltaLabel }) {
  const deltaVal = delta ?? null;
  const deltaUp = deltaVal > 0;
  const deltaDown = deltaVal < 0;
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
      {deltaVal !== 0 && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className={`text-[11px] font-bold ${deltaUp ? "text-emerald-600" : deltaDown ? "text-red-600" : "text-slate-400"}`}>
            {deltaUp ? "▲" : deltaDown ? "▼" : "●"} {deltaVal > 0 ? "+" : ""}{deltaVal}
          </span>
          <span className="text-[11px] text-slate-400">{deltaLabel}</span>
        </div>
      )}
      <div
        className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.07]"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
