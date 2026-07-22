import React, { useMemo, useState, useRef, useEffect } from "react";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import SelectFilters from "./components/SelectFilters";

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

  const [sortCol, setSortCol] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [intervalDetail, setIntervalDetail] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);

  // === Datos procesados ===
  const rawData = Array.isArray(data) ? data : [];
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
      if (va == null) return 1;
      if (vb == null) return -1;
      // Números (diffs, montos)
      if (INTERVAL_KEYS.includes(sortCol)) {
        const na = va === "N/A" ? Infinity : Number(va);
        const nb = vb === "N/A" ? Infinity : Number(vb);
        return sortOrder === "asc" ? na - nb : nb - na;
      }
      // Fechas
      if (typeof va === "string" && va.includes("/")) {
        const da = new Date(va.split("/").reverse().join("-"));
        const db = new Date(vb.split("/").reverse().join("-"));
        return sortOrder === "asc" ? da - db : db - da;
      }
      // Strings / números
      if (typeof va === "number" && typeof vb === "number") {
        return sortOrder === "asc" ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb));
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [estadoFiltered, sortCol, sortOrder]);

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
                  {th("Departamento", "Departamento")}
                  {th("Localidad", "Localidad")}
                  {th("Barrio", "Barrio")}
                  {th("Beneficiario", "Beneficiario")}
                  {th("DNI", "DNI")}
                  {th("Escribano", "Escribano Designado")}
                  {th("Estado", "Estado")}
                  {INTERVALS.map(iv => (
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
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, idx) => {
                  const stableKey = item.id ?? `${item.DNI || "noDNI"}-${idx}-${safePage}`;
                  const escribano = item["Escribano Designado"] ?? item.Escribano ?? item.escribano ?? "";
                  const estado = item.Estado ?? item.estado ?? item.EstadoProceso ?? "";

                  return (
                    <tr key={stableKey}>
                      <td className="row-num">{idx + 1 + (safePage - 1) * itemsPerPage}</td>
                      <td>{item.Departamento}</td>
                      <td>{item.Localidad}</td>
                      <td>{item.Barrio}</td>
                      <td className="font-semibold text-slate-800">{item.Beneficiario}</td>
                      <td className="font-mono text-xs">{item.DNI}</td>
                      <td className="text-slate-500 text-xs">{escribano}</td>
                      <td>
                        <span className={`status-pill ${estado === "Entregada" ? "pill-green" : estado === "Finalizada sin Entregar" ? "pill-blue" : estado === "De Baja" ? "pill-gray" : estado === "Hipotecada" ? "pill-red" : "pill-default"}`}>
                          {estado}
                        </span>
                      </td>
                      {INTERVALS.map(iv => {
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
                      })}
                    </tr>
                  );
                })}

                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={8 + INTERVALS.length} className="text-center py-12 text-slate-400 font-medium">
                      No hay registros que coincidan con los filtros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {renderPagination()}
        </div>
      )}

      {/* Modal detalle de fechas por intervalo */}
      {intervalDetail && (() => {
        const iv = intervalDetail.interval;
        const item = intervalDetail.item;
        const val = item[iv.key];
        const cls = diffClass(val, iv.esperado);
        const fecha1Val = item[iv.fecha1] || "—";
        const fecha2Val = item[iv.fecha2] || "—";
        return (
          <div
            className="modal-overlay"
            onClick={() => setIntervalDetail(null)}
          >
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">{iv.fullLabel}</h3>
                  <p className="modal-subtitle">
                    {item.Beneficiario}{item.DNI ? ` — DNI ${item.DNI}` : ""}
                  </p>
                </div>
                <button
                  className="modal-close"
                  onClick={() => setIntervalDetail(null)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="modal-body">
                {/* Fechas */}
                <div className="detail-dates-row">
                  <div className="date-card">
                    <div className="date-label">Desde</div>
                    <div className="date-field">{iv.fecha1}</div>
                    <div className="date-value">{fecha1Val}</div>
                  </div>
                  <div className="date-arrow">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                  </div>
                  <div className="date-card">
                    <div className="date-label">Hasta</div>
                    <div className="date-field">{iv.fecha2}</div>
                    <div className="date-value">{fecha2Val}</div>
                  </div>
                </div>

                {/* Resultado */}
                <div className="detail-result">
                  <div className="result-label">Diferencia</div>
                  <div className="result-value-row">
                    <span className={`diff-badge ${cls}`} style={{ fontSize: '1rem', padding: '0.25rem 1rem' }}>
                      {val !== "N/A" && val !== "" && val != null ? `${val} días hábiles` : "Sin datos"}
                    </span>
                    <span className="result-threshold">
                      Plazo esperado: <strong>{iv.esperado} días</strong>
                    </span>
                  </div>
                </div>

                {/* Info adicional */}
                <div className="detail-meta">
                  <span>Departamento: {item.Departamento || "—"}</span>
                  <span>Localidad: {item.Localidad || "—"}</span>
                  <span>Barrio: {item.Barrio || "—"}</span>
                  <span>Estado: {item.Estado || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
