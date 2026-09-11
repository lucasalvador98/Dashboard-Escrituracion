import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import useDataLoader from "./hooks/useDataLoader";
import useUrlState from "./hooks/useUrlState";
import { parseDate, contarDiasHabiles, diffClass, INTERVALS } from "./lib/deadlines";
import SlidePanel from "./components/SlidePanel";
import DataTable from "./components/ui/DataTable";
import LoadingState from "./components/ui/LoadingState";
import ErrorAlert from "./components/ui/ErrorAlert";
import { useSemaphorePalette } from "./components/ui/renderCells";
import { useChartPalette } from "./theme/charts";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";

function StatusDot({ color }) {
  return (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        flexShrink: 0,
        backgroundColor: color,
      }}
    />
  );
}

// Small count chip for the interval semaphore (green/yellow/red counts). Uses
// MUI semantic colors so the counts stay legible in both themes (INV-2).
function CountChip({ color, count, label }) {
  if (!count) return null;
  return (
    <Chip
      size="small"
      color={color}
      label={count}
      title={label}
      sx={{ height: 20, minWidth: 26, fontWeight: 700, fontSize: 11 }}
    />
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

// Sort comparators for the demorados grid (DG-3): case-insensitive text with
// numeric collation (nulls/empty to the bottom) and plain numeric order.
function stringComparator(v1, v2) {
  const a = v1 == null || v1 === "" ? null : String(v1);
  const b = v2 == null || v2 === "" ? null : String(v2);
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b, undefined, { numeric: true });
}

function numberComparator(v1, v2) {
  const a = Number(v1);
  const b = Number(v2);
  const an = Number.isNaN(a) ? -Infinity : a;
  const bn = Number.isNaN(b) ? -Infinity : b;
  if (an === bn) return 0;
  return an < bn ? -1 : 1;
}

// Días badge for the demorados grid: same semaphore rule as the old severity
// badges (INV-2), colored from the theme semaphore slot so dark mode keeps the
// hue-preserving tints (no hardcoded light-only badge colors).
function diasBadgeCell() {
  return function DiasBadgeCell(params) {
    const palette = useSemaphorePalette();
    const sev = severidadDias(params.value);
    const colors = palette[sev] ?? palette.gray;
    return (
      <Chip
        size="small"
        label={`${params.value}d`}
        sx={{ bgcolor: colors.bg, color: colors.text, fontWeight: 700, minWidth: 52 }}
      />
    );
  };
}

// Sidebar row for the demorados escribano list: MUI ListItemButton with the
// count badge and (for escribanos) the worst-severity dot (INV-2: color is
// never the only cue — the count and title carry the same information).
function SidebarEscribanoItem({ active, activeColor = "primary.main", onClick, title, primary, count, severity }) {
  return (
    <ListItemButton
      selected={active}
      onClick={onClick}
      title={title}
      sx={{
        px: 1.5,
        py: 0.75,
        "&.Mui-selected": {
          bgcolor: activeColor,
          color: "#fff",
          "&:hover": { bgcolor: activeColor },
        },
        "&.Mui-selected .MuiListItemText-primary": { color: "#fff" },
      }}
    >
      <ListItemText
        primary={primary}
        primaryTypographyProps={{
          sx: {
            fontSize: 12,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        }}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        {severity && (
          <Box
            sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: severity }}
            title="Peor severidad"
          />
        )}
        <Box
          component="span"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            px: 0.75,
            py: 0.25,
            borderRadius: "999px",
            bgcolor: active ? "rgba(255,255,255,0.2)" : "action.hover",
            color: active ? "#fff" : "text.secondary",
          }}
        >
          {count}
        </Box>
      </Box>
    </ListItemButton>
  );
}

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
  const theme = useTheme();
  const chartPalette = useChartPalette();
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
        if (state.desde && fechaFirma < parseDate(state.desde)) return false;
        if (state.hasta && fechaFirma > parseDate(state.hasta)) return false;
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
      const est = (item.Estado || item.estado || "").toString().trim();
      if (est !== "En Trámite") return;

      const acep = item["Fecha de Aceptacion"];
      if (!acep || acep === "N/A") return;

      const firma = item["Fecha de Firma"];
      const firmaDate = firma && firma !== "N/A" ? firma : new Date().toISOString().slice(0, 10);
      const n = contarDiasHabiles(acep, firmaDate);
      if (n === 0 || n <= ESCROW_ESPERADO) return;

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

  // ── Tabla de casos demorados (DataGrid) ──
  // D8: flat grid over the filtered cases; the Escribano column replaces the
  // old group-header rows while no escribano filter is active (the sidebar
  // keeps the grouping). Pagination/sort are grid-owned (DG-3/4).
  const [demoradoPagination, setDemoradoPagination] = useState({ page: 0, pageSize: 15 });
  const [demoradoSortState, setDemoradoSortState] = useState([
    { field: "_escribano", sort: "asc" },
  ]);
  // D8 initial sort: escribano asc with the demora-desc tie-break coming from
  // the pre-sorted array order (DataGrid sort is stable). The community grid
  // supports a single sort column (disableMultipleColumnsSorting), so a
  // second _dias entry is never sent; the Escribano entry is dropped while an
  // escribano filter hides that column (keeps the sort model consistent with
  // the visible columns — no transient missing-field sort).
  const demoradoSort = useMemo(
    () => (demoradoFiltro.escribano ? demoradoSortState.filter(s => s.field !== "_escribano") : demoradoSortState),
    [demoradoSortState, demoradoFiltro.escribano]
  );
  // DG-4: back to page 1 whenever any demorados filter changes.
  useEffect(() => {
    setDemoradoPagination(p => (p.page === 0 ? p : { ...p, page: 0 }));
  }, [demoradoFiltro]);

  const gridRows = useMemo(
    () => demoradosFiltrados.map((item, idx) => ({ ...item, _gridId: idx })),
    [demoradosFiltrados]
  );

  const demoradoColumns = useMemo(() => {
    const cols = [];
    if (!demoradoFiltro.escribano) {
      cols.push({
        field: "_escribano",
        headerName: "Escribano",
        width: 170,
        sortComparator: stringComparator,
      });
    }
    cols.push(
      {
        field: "_beneficiario",
        headerName: "Beneficiario",
        flex: 1,
        minWidth: 170,
        sortComparator: stringComparator,
        renderCell: params => (
          <Box
            component="span"
            title={isIPV(params.row) ? "IPV: Caso en Dirección de Viviendas" : undefined}
            sx={{ fontWeight: 600 }}
          >
            {params.row._beneficiario}
          </Box>
        ),
      },
      {
        field: "DNI",
        headerName: "DNI",
        width: 120,
        sortComparator: stringComparator,
        renderCell: params => (
          <Box component="span" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
            {params.value || "—"}
          </Box>
        ),
      },
      { field: "_depto", headerName: "Depto", width: 110, sortComparator: stringComparator },
      { field: "_barrio", headerName: "Barrio", width: 140, sortComparator: stringComparator },
      {
        field: "_dias",
        headerName: "Días",
        width: 92,
        align: "center",
        headerAlign: "center",
        sortComparator: numberComparator,
        renderCell: diasBadgeCell(),
      },
      {
        field: "_demora",
        headerName: "Demora",
        width: 100,
        align: "center",
        headerAlign: "center",
        sortComparator: numberComparator,
        renderCell: params => (
          <Box component="span" sx={{ fontWeight: 700, color: "error.main" }}>
            +{params.value}d
          </Box>
        ),
      },
      {
        field: "_detalle",
        headerName: "Detalle",
        width: 96,
        align: "right",
        headerAlign: "right",
        sortable: false,
        renderCell: () => (
          <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>
            Ver →
          </Box>
        ),
      }
    );
    return cols;
  }, [demoradoFiltro.escribano]);

  // Size the grid to the rows on the current page so short lists do not render
  // a mostly-empty box (same approach as Stock/Escribanos).
  const rowsOnPage = Math.min(
    15,
    Math.max(gridRows.length - demoradoPagination.page * 15, 1)
  );
  const gridHeight = 112 + rowsOnPage * 40;

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
    return <LoadingState py={12} message="Cargando datos..." />;
  }

  if (error) {
    return <ErrorAlert message={error} sx={{ my: 2 }} />;
  }

  if (!kpis) return null;

  return (
    <div className="space-y-6">

      {/* ── Tab Switcher ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
        <Box sx={{ display: "inline-flex", bgcolor: "action.hover", borderRadius: 2, p: 0.25, width: "fit-content" }}>
          {[
            { key: "resumen", label: "Resumen" },
            { key: "demorados", label: `Demorados (${demorados.reduce((s, e) => s + e.items.length, 0)})` },
          ].map(tab => (
            <Button
              key={tab.key}
              onClick={() => set({ tab: tab.key })}
              sx={{
                px: 2,
                py: 0.75,
                fontSize: 14,
                fontWeight: 700,
                minWidth: 0,
                color: state.tab === tab.key ? "text.primary" : "text.secondary",
                bgcolor: state.tab === tab.key ? "background.paper" : "transparent",
                boxShadow: state.tab === tab.key ? 1 : 0,
                "&:hover": {
                  bgcolor: state.tab === tab.key ? "background.paper" : "action.selected",
                  color: "text.primary",
                },
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>
        <Button
          onClick={exportResumen}
          size="small"
          variant="outlined"
          color="primary"
          title="Exportar KPIs, semáforo y demorados a CSV"
          sx={{ fontSize: 12, fontWeight: 600 }}
        >
          ⬇ Exportar resumen
        </Button>
      </Box>

      {state.tab === "resumen" ? (
        <>
          {/* ── Dashboard Filters ── */}
      <Paper elevation={0} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Filtros
          </Typography>

          <TextField
            id="dashboard-filter-departamento"
            select
            size="small"
            value={state.departamento}
            onChange={e => set({ departamento: e.target.value })}
            SelectProps={{ native: true, inputProps: { "aria-label": "Departamento" } }}
            sx={{ minWidth: 190 }}
          >
            <option value="Todos">Todos los departamentos</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </TextField>

          <TextField
            id="dashboard-filter-escribano"
            select
            size="small"
            value={state.escribano}
            onChange={e => set({ escribano: e.target.value })}
            SelectProps={{ native: true, inputProps: { "aria-label": "Escribano" } }}
            sx={{ minWidth: 190 }}
          >
            <option value="Todos">Todos los escribanos</option>
            {escribanos.map(e => <option key={e} value={e}>{e}</option>)}
          </TextField>

          <TextField
            id="dashboard-filter-estado"
            select
            size="small"
            value={state.estado}
            onChange={e => set({ estado: e.target.value })}
            SelectProps={{ native: true, inputProps: { "aria-label": "Estado" } }}
            sx={{ minWidth: 170 }}
          >
            <option value="Todos">Todos los estados</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </TextField>

          <TextField
            id="dashboard-filter-desde"
            type="date"
            size="small"
            value={state.desde}
            onChange={e => set({ desde: e.target.value })}
            inputProps={{ "aria-label": "Desde" }}
            sx={{ width: 160 }}
          />
          <TextField
            id="dashboard-filter-hasta"
            type="date"
            size="small"
            value={state.hasta}
            onChange={e => set({ hasta: e.target.value })}
            inputProps={{ "aria-label": "Hasta" }}
            sx={{ width: 160 }}
          />

          <Button
            onClick={reset}
            disabled={!hasActiveFilters}
            size="small"
            variant="outlined"
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: "text.secondary",
              borderColor: "divider",
              "&:hover": {
                color: "error.main",
                borderColor: "error.light",
                bgcolor: alpha(theme.palette.error.main, 0.04),
              },
            }}
          >
            Limpiar ×
          </Button>

          <Typography variant="caption" sx={{ color: "text.secondary", ml: "auto" }}>
            {filteredData.length} de {data.length} registros
          </Typography>
        </Box>
      </Paper>

      {/* ── KPI Cards ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        <KPICard
          to={linkTo({ tab: "resumen" })}
          label="Total Escrituraciones"
          value={kpis.total}
          color="#3b82f6"
          delta={kpis.ingresosEsteMes}
          deltaLabel="ingresos este mes"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
            </svg>
          }
        />
        <KPICard
          to={linkTo({ tab: "resumen", estado: "En Trámite" })}
          label="En Trámite"
          value={kpis.enProceso}
          color="#f59e0b"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          }
        />
        <KPICard
          to={linkTo({ tab: "resumen" })}
          label="Finalizadas"
          value={kpis.finalizadas}
          color="#10b981"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>
            </svg>
          }
        />
        <KPICard
          to={linkTo({ tab: "resumen" })}
          label="Firmas este Mes"
          value={kpis.finalizadasEsteMes}
          color="#8b5cf6"
          delta={kpis.deltaFirmas}
          deltaLabel="vs mes anterior"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          }
        />
      </Box>

      {/* ── Row: Chart + Estado breakdown ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 2.5 }}>
        {/* Chart */}
        <Paper elevation={0} sx={{ gridColumn: { lg: "span 2" }, p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
          <Typography component="h3" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary", textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>Ingresos por Mes</Typography>
          {kpis.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={kpis.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartPalette.axis }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: chartPalette.axis }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={chartPalette.tooltip}
                  labelStyle={{ color: chartPalette.axis }}
                  itemStyle={{ color: chartPalette.item }}
                  formatter={(value) => [`${value} escrituraciones`, "Cantidad"]}
                  cursor={{ fill: chartPalette.cursor }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36} fill={chartPalette.bar} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260, color: "text.secondary", fontSize: 14 }}>
              Sin datos para graficar
            </Box>
          )}
        </Paper>

        {/* Estado breakdown */}
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
          <Typography component="h3" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary", textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>Distribución por Estado</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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
                <Box
                  key={s.label}
                  component={Link}
                  to={linkTo({ estado: isActive ? "Todos" : s.label, tab: "resumen" })}
                  sx={{
                    display: "block",
                    borderRadius: 2,
                    p: 0.75,
                    m: -0.75,
                    textDecoration: "none",
                    bgcolor: isActive ? "action.selected" : "transparent",
                    transition: "background-color .15s",
                    "&:hover": { bgcolor: isActive ? "action.selected" : "action.hover" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <StatusDot color={s.color} />
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: isActive ? "text.primary" : "text.secondary" }}>{s.label}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}>{s.count}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "action.hover",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: s.color,
                        opacity: state.estado && !isActive ? 0.3 : 1,
                        transition: "width .7s ease-out, opacity .3s",
                      },
                    }}
                  />
                </Box>
              );
            })}
          </Box>

          {/* Top escribanos */}
          {kpis.topEscribanos.length > 0 && (
            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography component="h4" sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.5 }}>Top Escribanos</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {kpis.topEscribanos.map(([nombre, count], i) => (
                  <Box key={nombre} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.disabled", width: 16 }}>{i + 1}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary", ml: 1 }}>{count}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* ── Row: Tendencia de demoras + Semáforo ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 2.5 }}>
        {/* Tendencia de demoras */}
        <Paper elevation={0} sx={{ gridColumn: { lg: "span 2" }, p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
          <Typography component="h3" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary", textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>Tendencia de Demoras (Acep→Firma)</Typography>
          {demoraTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={demoraTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartPalette.axis }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: chartPalette.axis }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={chartPalette.tooltip}
                  labelStyle={{ color: chartPalette.axis }}
                  itemStyle={{ color: chartPalette.item }}
                  formatter={(value, name) => name === "pct" ? [`${value}% demorados`, "% Demora"] : [value, name]}
                />
                <Line type="monotone" dataKey="pct" stroke={chartPalette.line} strokeWidth={2.5} dot={{ r: 4, fill: chartPalette.line }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, color: "text.secondary", fontSize: 14 }}>
              Sin datos suficientes para graficar la tendencia
            </Box>
          )}
        </Paper>

        {/* Semáforo global */}
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
          <Typography component="h3" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary", textTransform: "uppercase", letterSpacing: "0.06em", mb: 2 }}>Semáforo de Plazos</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {semaforo.map(iv => (
              <Box key={iv.key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, borderBottom: "1px solid", borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }}>
                <Box sx={{ minWidth: 0, mr: 1.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}>{iv.label}</Typography>
                  <Typography sx={{ fontSize: 10, color: "text.secondary" }}>esperado {iv.esperado}d</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                  <CountChip color="success" count={iv.green} label="ok" />
                  <CountChip color="warning" count={iv.yellow} label="alerta" />
                  <CountChip color="error" count={iv.red} label="demora" />
                  <Typography sx={{ ml: 0.5, fontSize: 11, fontWeight: 700, color: iv.pctRed > 30 ? "error.main" : "text.secondary" }}>{iv.pctRed}%</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      {/* ── Próximas Firmas ── */}
      {kpis.proximasFirmas.length > 0 && (
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography component="h3" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary", textTransform: "uppercase", letterSpacing: "0.06em" }}>Próximas Firmas</Typography>
            <Chip size="small" label={`${kpis.proximasFirmas.length} programadas`} sx={{ bgcolor: "action.hover", color: "text.secondary", fontWeight: 600 }} />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 1.5 }}>
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
                <Card
                  key={idx}
                  variant="outlined"
                  elevation={0}
                  sx={{
                    borderColor: enRiesgo ? "error.light" : enAlerta ? "warning.light" : "divider",
                    transition: "border-color .2s, box-shadow .2s",
                    "&:hover": {
                      boxShadow: 3,
                      borderColor: enRiesgo ? "error.main" : enAlerta ? "warning.main" : "primary.light",
                    },
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1, gap: 0.5 }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.disabled" }}>#{idx + 1}</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {diasRestantes !== null && diasRestantes <= 7 && diasRestantes >= 0 && (
                          <Chip size="small" color="warning" label={diasRestantes === 0 ? "Hoy" : `${diasRestantes}d`} sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                        )}
                        {enRiesgo && (
                          <Chip size="small" color="error" label="Riesgo" title={`Acep→Firma: ${acepFirmaDias}d hábiles (> 20d)`} sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                        )}
                        {enAlerta && (
                          <Chip size="small" color="warning" label="Alerta" title={`Acep→Firma: ${acepFirmaDias}d hábiles`} sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                        )}
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary", lineHeight: 1.2, mb: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary", fontFamily: "monospace" }}>{item.DNI || "—"}</Typography>
                    <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{fechaRaw}</Typography>
                      {acepFirmaDias !== null && (
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: enRiesgo ? "error.main" : enAlerta ? "warning.main" : "text.secondary" }}>
                          Acep→Firma: {acepFirmaDias}d
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Paper>
      )}

        </>

      ) : (
        /* ── Tab: Demorados ── */
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {demorados.length === 0 ? (
            <Paper elevation={0} sx={{ p: 8, textAlign: "center", border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
              <span role="img" aria-label="Sin demoras" style={{ fontSize: 32 }}>✅</span>
              <Typography sx={{ mt: 1, color: "text.secondary", fontSize: 14, fontWeight: 500 }}>
                Sin demoras — todos los casos están dentro del plazo
              </Typography>
            </Paper>
          ) : (
            <>
              {/* Panel de casos demorados: sidebar de escribanos + tabla */}
              <Paper elevation={0} sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
                {/* Header: título + píldoras de severidad + conteo */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
                  <Typography component="h3" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Casos Demorados
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Box sx={{ display: "inline-flex", bgcolor: "action.hover", borderRadius: 1.5, p: 0.25, width: "fit-content" }}>
                      {[
                        { key: "", label: "Todos" },
                        { key: "red", label: "Críticos" },
                        { key: "yellow", label: "Medios" },
                        { key: "green", label: "Leves" },
                      ].map(p => (
                        <Button
                          key={p.key || "all"}
                          size="small"
                          aria-pressed={demoradoFiltro.severidad === p.key}
                          onClick={() => setDemoradoFiltro(f => ({ ...f, severidad: p.key }))}
                          sx={{
                            px: 1.25,
                            py: 0.5,
                            fontSize: 11,
                            fontWeight: 700,
                            minWidth: 0,
                            color: demoradoFiltro.severidad === p.key ? "text.primary" : "text.secondary",
                            bgcolor: demoradoFiltro.severidad === p.key ? "background.paper" : "transparent",
                            boxShadow: demoradoFiltro.severidad === p.key ? 1 : 0,
                            "&:hover": {
                              bgcolor: demoradoFiltro.severidad === p.key ? "background.paper" : "action.selected",
                            },
                          }}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", bgcolor: "action.hover", px: 1.25, py: 0.5, borderRadius: "999px" }}>
                      {demoradosFiltrados.length} de {demoradosFlat.length} casos
                    </Typography>
                  </Box>
                </Box>

                {/* Búsqueda + toggle de filtros avanzados */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
                  <TextField
                    size="small"
                    value={demoradoFiltro.search}
                    onChange={e => setDemoradoFiltro(f => ({ ...f, search: e.target.value }))}
                    placeholder="Buscar por escribano, nombre, DNI, depto o barrio..."
                    inputProps={{ "aria-label": "Buscar casos demorados" }}
                    sx={{ flex: "1 1 180px", minWidth: 180 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    aria-expanded={demoradosShowAdvanced}
                    onClick={() => setDemoradosShowAdvanced(v => !v)}
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: demoradosShowAdvanced ? "primary.main" : "text.secondary",
                      borderColor: demoradosShowAdvanced ? "primary.light" : "divider",
                      bgcolor: demoradosShowAdvanced ? alpha(theme.palette.primary.main, 0.06) : "transparent",
                    }}
                  >
                    Filtros {demoradosShowAdvanced ? "▲" : "▼"}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={limpiarFiltrosDemorados}
                    disabled={!tieneFiltroDemorados}
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "text.secondary",
                      borderColor: "divider",
                      "&:hover:not(:disabled)": {
                        color: "error.main",
                        borderColor: "error.light",
                        bgcolor: alpha(theme.palette.error.main, 0.04),
                      },
                    }}
                  >
                    Limpiar ×
                  </Button>
                </Box>

                {/* Filtros avanzados (colapsables) */}
                {demoradosShowAdvanced && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap", bgcolor: "action.hover", borderRadius: 2, p: 1.5, border: "1px solid", borderColor: "divider" }}>
                    <TextField
                      select
                      size="small"
                      value={demoradoFiltro.depto}
                      onChange={e => setDemoradoFiltro(f => ({ ...f, depto: e.target.value }))}
                      SelectProps={{ native: true, inputProps: { "aria-label": "Departamento de casos demorados" } }}
                      sx={{ minWidth: 180 }}
                    >
                      <option value="">Todos los departamentos</option>
                      {demoradoDeptos.map(d => <option key={d} value={d}>{d}</option>)}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      value={demoradoFiltro.localidad}
                      onChange={e => setDemoradoFiltro(f => ({ ...f, localidad: e.target.value }))}
                      SelectProps={{ native: true, inputProps: { "aria-label": "Localidad de casos demorados" } }}
                      sx={{ minWidth: 170 }}
                    >
                      <option value="">Todas las localidades</option>
                      {demoradoLocalidades.map(d => <option key={d} value={d}>{d}</option>)}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      value={demoradoFiltro.barrio}
                      onChange={e => setDemoradoFiltro(f => ({ ...f, barrio: e.target.value }))}
                      SelectProps={{ native: true, inputProps: { "aria-label": "Barrio de casos demorados" } }}
                      sx={{ minWidth: 170 }}
                    >
                      <option value="">Todos los barrios</option>
                      {demoradoBarrios.map(d => <option key={d} value={d}>{d}</option>)}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      value={demoradoFiltro.estado}
                      onChange={e => setDemoradoFiltro(f => ({ ...f, estado: e.target.value }))}
                      SelectProps={{ native: true, inputProps: { "aria-label": "Estado de casos demorados" } }}
                      sx={{ minWidth: 170 }}
                    >
                      <option value="">Todos los estados</option>
                      {demoradoEstados.map(d => <option key={d} value={d}>{d}</option>)}
                    </TextField>
                  </Box>
                )}

                {/* Master-detail: sidebar escribanos + tabla */}
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "240px 1fr" }, gap: 2 }}>
                  {/* Sidebar de escribanos */}
                  <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", maxHeight: { xs: 300, lg: 480 }, display: "flex", flexDirection: "column" }}>
                    <ListSubheader component="div" disableSticky sx={{ bgcolor: "action.hover", color: "text.secondary", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: "32px" }}>
                      Escribanos
                    </ListSubheader>
                    <Box sx={{ overflowY: "auto", flex: 1 }}>
                      <List dense disablePadding>
                        <SidebarEscribanoItem
                          active={!demoradoFiltro.escribano}
                          onClick={() => setDemoradoFiltro(f => ({ ...f, escribano: "" }))}
                          primary="Todos"
                          count={demoradosFlat.length}
                          activeColor="primary.main"
                        />
                        {demoradosSidebar.map(esc => (
                          <SidebarEscribanoItem
                            key={esc.nombre}
                            active={demoradoFiltro.escribano === esc.nombre}
                            onClick={() => setDemoradoFiltro(f => ({ ...f, escribano: f.escribano === esc.nombre ? "" : esc.nombre }))}
                            primary={esc.nombre}
                            count={esc.items.length}
                            severity={esc.peor === "red" ? "error.main" : esc.peor === "yellow" ? "warning.main" : "success.main"}
                            title={`${esc.items.length} ${esc.items.length === 1 ? "caso" : "casos"} · prom +${esc.avg}d`}
                            activeColor="error.main"
                          />
                        ))}
                      </List>
                      {demoradosSidebar.length === 0 && (
                        <Box sx={{ px: 2, py: 4, textAlign: "center", fontSize: 12, color: "text.disabled" }}>
                          Sin casos con los filtros actuales
                        </Box>
                      )}
                    </Box>
                  </Paper>

                  {/* Tabla de casos */}
                  <DataTable
                    rows={gridRows}
                    columns={demoradoColumns}
                    getRowId={row => row._gridId}
                    height={gridHeight}
                    showToolbar
                    paginationModel={demoradoPagination}
                    onPaginationModelChange={setDemoradoPagination}
                    sortModel={demoradoSort}
                    onSortModelChange={setDemoradoSortState}
                    onRowClick={params => setDemoradoDetail(params.row)}
                    emptyState={{ message: "No hay casos que coincidan con los filtros" }}
                  />
                </Box>
              </Paper>
            </>
          )}
        </Box>
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

function KPICard({ to, label, value, color, icon, delta, deltaLabel }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const deltaVal = delta ?? null;
  const deltaUp = deltaVal > 0;
  const deltaDown = deltaVal < 0;
  // KPI cards are navigation links (deep-link into the dashboard with filters).
  // `component={Link}` keeps a real <a href> so dashboard-widgets assertions hold.
  const linkProps = to ? { component: Link, to } : {};
  return (
    <Card
      {...linkProps}
      elevation={1}
      sx={{
        position: "relative",
        height: "100%",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        border: "1px solid",
        borderColor: "divider",
        background: isDark
          ? alpha(color, 0.12)
          : `linear-gradient(135deg, ${alpha(color, 0.08)}, ${alpha(color, 0.03)})`,
        transition: "box-shadow .3s, transform .2s",
        "&:hover": { boxShadow: 4 },
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: alpha(color, 0.1) }}>
            {icon}
          </Box>
        </Box>
        <Typography component="div" sx={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1, mb: 0.25, color }}>
          {typeof value === "number" ? value.toLocaleString("es-AR") : value}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </Typography>
        {deltaVal !== 0 && (
          <Box sx={{ mt: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: deltaUp ? "success.main" : deltaDown ? "error.main" : "text.disabled" }}>
              {deltaUp ? "▲" : deltaDown ? "▼" : "●"} {deltaVal > 0 ? "+" : ""}{deltaVal}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{deltaLabel}</Typography>
          </Box>
        )}
        <Box sx={{ position: "absolute", right: -16, bottom: -16, width: 96, height: 96, borderRadius: "50%", bgcolor: color, opacity: 0.07 }} />
      </CardContent>
    </Card>
  );
}
