import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import useExportCSV from "./hooks/useExportCSV";
import SelectFilters from "./components/SelectFilters";
import SlidePanel from "./components/SlidePanel";
import TimelineBar from "./components/TimelineBar";
import ColumnToggle from "./components/ColumnToggle";
import LocationOn from '@mui/icons-material/LocationOn';
import ArrowForward from '@mui/icons-material/ArrowForward';
import FileDownload from '@mui/icons-material/FileDownload';
import ViewColumn from '@mui/icons-material/ViewColumn';

const itemsPerPage = 15;

// Los 5 intervalos del semáforo
const INTERVALS = [
  { key: "diferencia_ingreso_sorteo", label: "Ing→Sort", fullLabel: "Ingreso Colegio → Sorteo", fecha1: "Fecha Ingreso Colegio de Escribanos", fecha2: "Fecha de Sorteo", esperado: 10 },
  { key: "diferencia_sorteo_aceptacion", label: "Sort→Acep", fullLabel: "Sorteo → Aceptación", fecha1: "Fecha de Sorteo", fecha2: "Fecha de Aceptacion", esperado: 5 },
  { key: "diferencia_aceptacion_firma", label: "Acep→Firma", fullLabel: "Aceptación → Firma", fecha1: "Fecha de Aceptacion", fecha2: "Fecha de Firma", esperado: 20 },
  { key: "diferencia_firma_ingreso", label: "Firma→IngD", fullLabel: "Firma → Ingreso Diario", fecha1: "Fecha de Firma", fecha2: "Fecha de Ingreso al Registro", esperado: 5 },
  { key: "diferencia_ingreso_testimonio", label: "IngD→Test", fullLabel: "Ingreso Diario → Testimonio", fecha1: "Fecha de Ingreso al Registro", fecha2: "Fecha de envío PT digital", esperado: 15 },
];

const INTERVAL_KEYS = INTERVALS.map(i => i.key);

// Columnas de la tabla para export y toggle de visibilidad
const TABLE_COLUMNS = [
  { key: "Departamento", label: "Departamento", alwaysOn: true },
  { key: "Localidad", label: "Localidad", alwaysOn: true },
  { key: "Barrio", label: "Barrio", alwaysOn: true },
  { key: "Beneficiarios", label: "Beneficiario", alwaysOn: true },
  { key: "DNI", label: "DNI", alwaysOn: true },
  { key: "Escribano Designado", label: "Escribano", alwaysOn: false },
  { key: "Estado", label: "Estado", alwaysOn: true },
  ...INTERVALS.map(iv => ({ key: iv.key, label: iv.label, fullLabel: iv.fullLabel, alwaysOn: false })),
];

// Keys que se activan por defecto (columnas core + fechas)
const DEFAULT_ACTIVE_KEYS = new Set([
  ...TABLE_COLUMNS.filter(c => c.alwaysOn).map(c => c.key),
  ...DATE_COLS,
]);

// Columnas internas que no se muestran como columnas del usuario
const INTERNAL_KEYS = new Set([
  ...INTERVAL_KEYS,
  "id",
]);

// Label limpio para columnas del Sheet
function labelize(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Dni/g, "DNI")
    .replace(/Mza\b/g, "Mza.")
    .replace(/Lote\b/g, "Lote")
    .replace(/Tel\b/g, "Tel.")
    .replace(/Cot\b/g, "Cot.")
    .replace(/Ing d/g, "Ing D");
}

const COLUMN_GROUPS = [
  { label: "Ubicación", keys: ["Departamento", "Localidad", "Barrio"] },
  { label: "Partes", keys: ["Beneficiarios", "DNI", "Escribano Designado"] },
  { label: "Estado", keys: ["Estado"] },
  { label: "Plazos", keys: INTERVAL_KEYS },
];

// Columnas que contienen fechas reales (para sort seguro)
const DATE_COLS = new Set([
  "Fecha Ingreso Colegio de Escribanos",
  "Fecha de Sorteo",
  "Fecha de Aceptacion",
  "Fecha de Firma",
  "Fecha de Ingreso al Registro",
  "Fecha de envío PT digital",
]);

function contarDiasHabiles(inicio, fin) {
  let count = 0;
  const current = new Date(inicio);
  current.setDate(current.getDate() + 1);
  while (current <= fin) {
    const d = current.getDay();
    if (d !== 0 && d !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function calcularDiferenciaDias(fecha1, fecha2) {
  if (!fecha1 || !fecha2 || fecha1 === "N/A" || fecha2 === "N/A") return "N/A";
  const parse = f => {
    if (!f) return NaN;
    if (f.includes("/")) return new Date(f.split("/").reverse().join("-"));
    return new Date(f);
  };
  const date1 = parse(fecha1);
  const date2 = parse(fecha2);
  if (isNaN(date1) || isNaN(date2)) return "N/A";
  return contarDiasHabiles(date1, date2);
}

function generarReporte(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(orig => {
    const item = { ...orig };
    INTERVALS.forEach(({ fecha1, fecha2, key }) => {
      item[key] = calcularDiferenciaDias(item[fecha1], item[fecha2]);
    });
    return item;
  });
}

/** Determina la clase semáforo de un valor numérico según el plazo esperado */
function diffClass(val, esperado) {
  if (val === "N/A" || val === "" || val == null) return "gray";
  const n = Number(val);
  if (isNaN(n)) return "gray";
  const amarillo = Math.ceil(esperado * 1.3);
  if (n <= esperado) return "green";
  if (n <= amarillo) return "yellow";
  return "red";
}

export default function Escrituracion() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { filters, setFilters, applyFilters } = useFilters({
    departamento: "Todos", localidad: "Todos", barrio: "Todos",
    estado: "Todos", escribano: "", dni: ""
  });

  // === Datos procesados ===
  const rawData = Array.isArray(data) ? data : [];

  // ── Columnas dinámicas: detectar todas las keys del JSON ──
  const allColumns = useMemo(() => {
    if (!rawData.length) return TABLE_COLUMNS;

    const dataKeys = new Set();
    rawData.forEach(item => {
      Object.keys(item).forEach(k => dataKeys.add(k));
    });

    const coreKeys = new Set(TABLE_COLUMNS.map(c => c.key));
    const coreCols = TABLE_COLUMNS.map(c => c.key);

    // Extra columns: in data but not core and not internal
    const extraCols = [...dataKeys]
      .filter(k => !coreKeys.has(k) && !INTERNAL_KEYS.has(k))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const allKeys = [...coreCols, ...extraCols];
    return allKeys.map(key => {
      const existing = TABLE_COLUMNS.find(c => c.key === key);
      return existing || { key, label: labelize(key), alwaysOn: false };
    });
  }, [rawData]);

  // Grupos dinámicos: core groups + "Otras" para las que no están en ningún grupo
  const allGroups = useMemo(() => {
    const groupedKeys = new Set(COLUMN_GROUPS.flatMap(g => g.keys));
    const ungrouped = allColumns
      .filter(c => !groupedKeys.has(c.key) && !INTERNAL_KEYS.has(c.key))
      .map(c => c.key);
    if (ungrouped.length === 0) return COLUMN_GROUPS;
    return [...COLUMN_GROUPS, { label: "Otras", keys: ungrouped }];
  }, [allColumns]);

  const [sortCol, setSortCol] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [intervalDetail, setIntervalDetail] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [showColToggle, setShowColToggle] = useState(false);
  const [visibleCols, setVisibleCols] = useState(() => {
    const saved = localStorage.getItem("escrituracion_visibleCols");
    if (saved) return JSON.parse(saved);
    // First render: allColumns may be empty, use TABLE_COLUMNS as fallback
    return TABLE_COLUMNS.filter(c => c.alwaysOn).map(c => c.key);
  });

  // Sync visibleCols when allColumns loads (first data arrival)
  useEffect(() => {
    const saved = localStorage.getItem("escrituracion_visibleCols");
    if (saved) return; // User has manually configured — respect it
    // First load with data: activate core + date columns
    const defaults = allColumns.filter(c => DEFAULT_ACTIVE_KEYS.has(c.key)).map(c => c.key);
    setVisibleCols(prev => {
      // Only update if the default set changed (data just arrived)
      if (prev.length === TABLE_COLUMNS.filter(c => c.alwaysOn).length && defaults.length !== prev.length) {
        return defaults;
      }
      return prev;
    });
  }, [allColumns]);

  // Columnas de export: todas las columnas visibles
  const exportColumns = useMemo(() => {
    return allColumns.filter(c => visibleCols.includes(c.key)).map(c => ({
      key: c.key,
      label: c.label,
    }));
  }, [visibleCols, allColumns]);

  // Click en celda → filtra por ese valor
  const filterByField = useCallback((field, value) => {
    if (!value || value === "N/A") return;
    if (field === "Escribano Designado") {
      setFilters({ escribano: value });
    } else if (field === "Estado") {
      setSelectedEstado(value);
      setFilters({ estado: value });
    } else if (field === "Departamento" || field === "Localidad" || field === "Barrio") {
      setFilters({ [field.toLowerCase()]: value });
    }
    setPage(1);
  }, [setFilters]);

  function toggleColumn(colKey) {
    setVisibleCols(prev => {
      const next = prev.includes(colKey)
        ? prev.filter(k => k !== colKey)
        : [...prev, colKey];
      localStorage.setItem("escrituracion_visibleCols", JSON.stringify(next));
      return next;
    });
  }

  const processedData = useMemo(() => generarReporte(rawData), [rawData]);
  const filteredData = useMemo(() => applyFilters(processedData), [processedData, filters, applyFilters]);

  // Sync selectedEstado cuando se cambia estado desde el dropdown de filtros
  useEffect(() => {
    const estadoFromDropdown = filters.estado && filters.estado !== "Todos" ? filters.estado : null;
    if (estadoFromDropdown !== selectedEstado) {
      setSelectedEstado(estadoFromDropdown);
    }
  }, [filters.estado]);

  const estadoFiltered = useMemo(() => {
    if (!selectedEstado) return filteredData;
    return filteredData.filter(item => {
      const est = (item.Estado || item.estado || item.EstadoProceso || "").toString().trim();
      return est === selectedEstado;
    });
  }, [filteredData, selectedEstado]);

  // === Sorting ===
  const sortedData = useMemo(() => {
    const arr = [...estadoFiltered];
    if (!sortCol) return arr;
    arr.sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];

      // Null/undefined siempre al final
      if (va == null || va === "") return 1;
      if (vb == null || vb === "") return -1;

      // Columnas de diferencia (semáforo) — numérico con N/A
      if (INTERVAL_KEYS.includes(sortCol)) {
        const na = va === "N/A" ? Infinity : Number(va);
        const nb = vb === "N/A" ? Infinity : Number(vb);
        if (isNaN(na) && isNaN(nb)) return 0;
        if (isNaN(na)) return 1;
        if (isNaN(nb)) return -1;
        return sortOrder === "asc" ? na - nb : nb - na;
      }

      // Fechas reales — solo para columnas que sabemos que son fechas
      if (DATE_COLS.has(sortCol)) {
        const da = new Date(va);
        const db = new Date(vb);
        if (isNaN(da) && isNaN(db)) return 0;
        if (isNaN(da)) return 1;
        if (isNaN(db)) return -1;
        return sortOrder === "asc" ? da - db : db - da;
      }

      // Números vanilla
      if (typeof va === "number" && typeof vb === "number") {
        return sortOrder === "asc" ? va - vb : vb - va;
      }

      // Strings (localeCompare)
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [estadoFiltered, sortCol, sortOrder]);

  const { exportCSV } = useExportCSV({
    data: sortedData,
    filename: `Escrituracion_${new Date().toISOString().slice(0, 10)}`,
    columns: exportColumns,
  });

  // === Paginación ===
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedData = sortedData.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  function handleSort(col) {
    if (sortCol === col) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortOrder("asc");
    }
    setPage(1);
  }

  const sortIcon = col => (sortCol !== col ? "" : sortOrder === "asc" ? " ▲" : " ▼");
  const ariaSort = col => {
    if (sortCol !== col) return "none";
    return sortOrder === "asc" ? "ascending" : "descending";
  };

  // === Stats ===
  const counts = useMemo(() => {
    const acc = {};
    processedData.forEach(item => {
      const est = (item.Estado || item.estado || item.EstadoProceso || "En Trámite").toString();
      acc[est] = (acc[est] || 0) + 1;
    });
    return acc;
  }, [processedData]);

  const totalCount = processedData.length;

  const statDefs = [
    { key: "En Trámite", variant: "primary" },
    { key: "Finalizada sin Entregar", variant: "success" },
    { key: "Entregada", variant: "success" },
    { key: "De Baja", variant: "warning" },
    { key: "Hipotecada", variant: "danger" },
    { key: "No Retiradas", variant: "muted" },
  ];

  const tableRef = useRef(null);

  // === Paginación UI ===
  function renderPagination() {
    if (totalPages <= 1) return null;
    const pages = [];
    pages.push(
      <button key={1} className={safePage === 1 ? "active" : ""} onClick={() => setPage(1)}>1</button>
    );
    if (totalPages > 6) {
      let start = Math.max(2, safePage - 2);
      let end = Math.min(totalPages - 1, safePage + 2);
      if (start > 2) pages.push(<span key="start-ellipsis" className="ellipsis">...</span>);
      for (let i = start; i <= end; i++) {
        pages.push(
          <button key={i} className={safePage === i ? "active" : ""} onClick={() => setPage(i)}>{i}</button>
        );
      }
      if (end < totalPages - 1) pages.push(<span key="end-ellipsis" className="ellipsis">...</span>);
      pages.push(
        <button key={totalPages} className={safePage === totalPages ? "active" : ""} onClick={() => setPage(totalPages)}>{totalPages}</button>
      );
    } else {
      for (let i = 2; i <= totalPages; i++) {
        pages.push(
          <button key={i} className={safePage === i ? "active" : ""} onClick={() => setPage(i)}>{i}</button>
        );
      }
    }
    return (
      <div className="pagination">
        <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>&lt;</button>
        {pages}
        <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>&gt;</button>
      </div>
    );
  }

  // === Header helper ===
  const th = (label, field) => (
    <th
      role="button"
      aria-sort={ariaSort(field)}
      onClick={() => handleSort(field)}
      className="sortable-th"
    >
      {label}{sortIcon(field)}
    </th>
  );

  return (
    <>
      {/* Toolbar: export + columnas visibles */}
      <div className="toolbar-row">
        <button className="toolbar-btn" onClick={exportCSV} title="Exportar CSV">
          <FileDownload sx={{ fontSize: 16 }} />
          Exportar
        </button>
        <div className="toolbar-group-right">
          <button
            className={`toolbar-btn ${showColToggle ? "active" : ""}`}
            onClick={() => setShowColToggle(prev => !prev)}
            title="Mostrar/ocultar columnas"
          >
            <ViewColumn sx={{ fontSize: 16 }} />
            Columnas
          </button>
          {showColToggle && (
            <ColumnToggle
              columns={allColumns}
              groups={allGroups}
              visibleCols={visibleCols}
              onToggle={toggleColumn}
              onClose={() => setShowColToggle(false)}
            />
          )}
        </div>
      </div>

      <SelectFilters data={processedData} filters={filters} setFilters={setFilters} />

      {/* Tarjetas de estado (filtro por click) */}
      <div className="status-cards">
        {statDefs.map(s => {
          const count = counts[s.key] || 0;
          const pct = totalCount ? Math.round((count / totalCount) * 100) : 0;
          const isActive = selectedEstado === s.key;

          const toggle = () => {
            setSelectedEstado(prev => (prev === s.key ? null : s.key));
            setFilters(prev => ({
              ...prev,
              estado: selectedEstado === s.key ? "Todos" : s.key,
            }));
            setPage(1);
          };

          return (
            <div
              key={s.key}
              role="button"
              tabIndex={0}
              className={`status-card ${isActive ? "selected" : ""}`}
              onClick={toggle}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
              aria-pressed={isActive}
            >
              <div className="label">{s.key}</div>
              <div className="value">{count.toLocaleString()}</div>
              <div className="meta">{pct}% del total</div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="spinner"></div>
        </div>
      )}
      {error && <div className="alert alert-error my-4"><p>{error}</p></div>}

      {!loading && !error && (
        <div ref={tableRef}>
          {/* Leyenda del semáforo */}
          <div className="semaforo-legend">
            <div className="legend-item">
              <span className="legend-color bg-green-500"></span>
              <span>Dentro del plazo</span>
            </div>
            <div className="legend-item">
              <span className="legend-color bg-yellow-500"></span>
              <span>Alerta (&gt; plazo)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color bg-red-500"></span>
              <span>Demora (&gt; +30%)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color bg-gray-400"></span>
              <span>Sin datos</span>
            </div>
            <div className="legend-item text-slate-400 ml-auto text-[10px]">
              {sortedData.length} registros
            </div>
          </div>

          {/* Tabla semáforo unificada */}
          <div className="table-wrap overflow-x-auto">
            <table className="data-table matrix-table">
              <thead>
                <tr>
                  <th className="row-num">N°</th>
                  {allColumns.filter(c => visibleCols.includes(c.key)).map(c =>
                    c.key.startsWith("diferencia_")
                      ? (() => {
                          const iv = INTERVALS.find(i => i.key === c.key);
                          return iv ? (
                            <th
                              key={iv.key}
                              role="button"
                              aria-sort={ariaSort(iv.key)}
                              onClick={() => handleSort(iv.key)}
                              className="sortable-th diff-th"
                              title={iv.fullLabel}
                            >
                              <span>{iv.label}</span>
                              <span className="diff-threshold">{iv.esperado}d</span>
                              {sortIcon(iv.key)}
                            </th>
                          ) : null;
                        })()
                      : th(c.label, c.key)
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, idx) => {
                  const stableKey = item.id ?? `${item.DNI || "noDNI"}-${idx}-${safePage}`;
                  const escribano = item["Escribano Designado"] ?? item.Escribano ?? item.escribano ?? "";
                  const estado = item.Estado ?? item.estado ?? item.EstadoProceso ?? "";
                  const beneficiario = item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? item.ApellidoYNombre ?? "—";

                  return (
                    <tr key={stableKey}>
                      <td className="row-num">{idx + 1 + (safePage - 1) * itemsPerPage}</td>
                      {allColumns.filter(c => visibleCols.includes(c.key)).map(c => {
                        if (c.key.startsWith("diferencia_")) {
                          const iv = INTERVALS.find(i => i.key === c.key);
                          if (!iv) return null;
                          const val = item[iv.key];
                          const cls = diffClass(val, iv.esperado);
                          const fechas = item[iv.fecha1] && item[iv.fecha2]
                            ? `${item[iv.fecha1]} → ${item[iv.fecha2]}`
                            : "Fechas no disponibles";
                          return (
                            <td
                              key={iv.key}
                              className={`diff-cell ${cls}`}
                              title={`${iv.fullLabel}\n${fechas}`}
                              onClick={() => setIntervalDetail({ item, interval: iv })}
                              style={{ cursor: 'pointer' }}
                            >
                              <span className="diff-badge">
                                {val !== "N/A" && val !== "" && val != null ? `${val}d` : "—"}
                              </span>
                            </td>
                          );
                        }

                        const rawVal = item[c.key];
                        const displayVal = c.key === "Beneficiarios" ? beneficiario
                          : c.key === "Escribano Designado" ? escribano
                          : c.key === "Estado" ? (item.Estado ?? item.estado ?? item.EstadoProceso ?? "")
                          : rawVal ?? "—";

                        const isClickable = ["Departamento", "Localidad", "Barrio", "Escribano Designado", "Estado"].includes(c.key);

                        return (
                          <td
                            key={c.key}
                            className={
                              (c.key === "Beneficiarios" ? "font-semibold text-slate-800" : "") +
                              (c.key === "DNI" ? " font-mono text-xs" : "") +
                              (c.key === "Escribano Designado" ? " text-slate-500 text-xs" : "") +
                              (isClickable ? " cell-clickable" : "")
                            }
                            onClick={() => isClickable && filterByField(c.key, rawVal)}
                            title={isClickable ? `Filtrar por "${displayVal}"` : undefined}
                          >
                            {c.key === "Estado" ? (
                              <span className={`status-pill ${displayVal === "Entregada" ? "pill-green" : displayVal === "Finalizada sin Entregar" ? "pill-blue" : displayVal === "De Baja" ? "pill-gray" : displayVal === "Hipotecada" ? "pill-red" : "pill-default"}`}>
                                {displayVal}
                              </span>
                            ) : c.key === "DNI" ? (
                              <span className="font-mono">{displayVal}</span>
                            ) : (
                              displayVal
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={1 + allColumns.filter(c => visibleCols.includes(c.key)).length} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl">🔍</span>
                        <span className="text-slate-400 font-medium">No hay registros</span>
                        <span className="text-xs text-slate-300 max-w-xs">
                          {filters.departamento !== "Todos" || filters.localidad !== "Todos" || filters.barrio !== "Todos" || filters.estado !== "Todos" || filters.escribano || filters.dni || selectedEstado
                            ? "Probá sacando algunos filtros o limpiando la búsqueda"
                            : "No hay datos para mostrar en esta sección"}
                        </span>
                        {(filters.departamento !== "Todos" || filters.localidad !== "Todos" || filters.barrio !== "Todos" || filters.estado !== "Todos" || filters.escribano || filters.dni || selectedEstado) && (
                          <button
                            className="text-xs text-blue-600 font-semibold hover:text-blue-800 mt-1"
                            onClick={() => {
                              setFilters({ departamento: "Todos", localidad: "Todos", barrio: "Todos", estado: "Todos", escribano: "", dni: "" });
                              setSelectedEstado(null);
                            }}
                          >
                            Limpiar todos los filtros
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {renderPagination()}
        </div>
      )}

      {/* SlidePanel detalle de fechas por intervalo */}
      <SlidePanel
        isOpen={!!intervalDetail}
        onClose={() => setIntervalDetail(null)}
        title={intervalDetail ? intervalDetail.interval.fullLabel : "Detalle"}
      >
        {intervalDetail && (() => {
          const iv = intervalDetail.interval;
          const item = intervalDetail.item;
          const val = item[iv.key];
          const cls = diffClass(val, iv.esperado);
          const fecha1Val = item[iv.fecha1] || "—";
          const fecha2Val = item[iv.fecha2] || "—";
          const statusLabels = { green: '✅ Dentro del plazo', yellow: '⚠️ Alerta', red: '🔴 Demora', gray: '⚪ Sin datos' };
          const statusLabel = statusLabels[cls] || 'Sin datos';
          return (
            <div className="p-1">
              {/* Header with status pill */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-base font-semibold text-slate-800">{iv.fullLabel}</h4>
                  <span className={`diff-badge ${cls}`}>{statusLabel}</span>
                </div>
                <p className="text-sm text-slate-600">
                   {(item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? item.ApellidoYNombre)}{item.DNI ? ` — DNI ${item.DNI}` : ""}
                </p>
              </div>

              {/* Timeline visual */}
              <div className="mb-6">
                <div className="text-xs font-medium text-slate-500 uppercase mb-2">Progreso General</div>
                <TimelineBar
                  item={item}
                  intervals={INTERVALS}
                  highlightedInterval={iv.key}
                />
              </div>

              {/* Fechas lado a lado */}
              <div className="detail-dates-row">
                <div className="date-card date-card--from">
                  <div className="date-label">Desde</div>
                  <div className="date-field-name">{iv.fecha1}</div>
                  <div className="date-value">{fecha1Val}</div>
                </div>
                <div className="date-arrow">
                  <div className="arrow-line"></div>
                  <ArrowForward sx={{ fontSize: 20, color: '#6366f1' }} />
                  <div className="arrow-line"></div>
                </div>
                <div className="date-card date-card--to">
                  <div className="date-label">Hasta</div>
                  <div className="date-field-name">{iv.fecha2}</div>
                  <div className="date-value">{fecha2Val}</div>
                </div>
              </div>

              {/* Resultado */}
              <div className="detail-result">
                <div className="result-label">Diferencia</div>
                <div className="result-value-row">
                  <span className={`diff-badge ${cls} text-lg px-5 py-2`}>
                    {val !== "N/A" && val !== "" && val != null ? `${val} días hábiles` : "Sin datos"}
                  </span>
                  <span className="result-threshold">
                    Plazo esperado: <strong>{iv.esperado} días</strong>
                  </span>
                </div>
              </div>

              {/* Meta info */}
              <div className="detail-meta">
                <div><LocationOn sx={{ fontSize: 14, verticalAlign: 'middle', marginRight: 0.5 }} /> {item.Departamento || "—"}</div>
                <div>{item.Localidad || "—"}</div>
                <div>{item.Barrio || "—"}</div>
                <div>Estado: <strong>{item.Estado || "—"}</strong></div>
              </div>
            </div>
          );
        })()}
      </SlidePanel>
    </>
  );
}
