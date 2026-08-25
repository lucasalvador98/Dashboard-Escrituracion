import React, { useRef, useState } from "react";
import { INTERVALS } from "../hooks/useEscrituracion";
import { diffClass } from "../hooks/useEscrituracion";
import ColumnToggle from "./ColumnToggle";

function isIPV(item) {
  return /DIRECC[IÓO]N DE VIVIENDAS/i.test(item.Observaciones || "");
}

export default function MatrixTable({
  allColumns, visibleCols, sortCol, sortOrder, handleSort,
  paginatedData, safePage, itemsPerPage, filterByField,
  setIntervalDetail, filters, allGroups, toggleColumn,
  showColToggle, setShowColToggle,
}) {
  const sortIcon = col => (sortCol !== col ? "" : sortOrder === "asc" ? " ▲" : " ▼");
  const ariaSort = col => {
    if (sortCol !== col) return "none";
    return sortOrder === "asc" ? "ascending" : "descending";
  };

  // Posición del dropdown de columnas (fixed para no recortarse por overflow-x)
  const dotsRef = useRef(null);
  const [dotsPos, setDotsPos] = useState(null);

  const toggleDots = () => {
    if (showColToggle) {
      setShowColToggle(false);
      return;
    }
    const rect = dotsRef.current?.getBoundingClientRect();
    if (rect) {
      setDotsPos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
    }
    setShowColToggle(true);
  };

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

  const visibleColumns = allColumns.filter(c => visibleCols.includes(c.key));

  return (
    <div className="table-wrap overflow-x-auto">
      <table className="data-table matrix-table">
        <thead>
          <tr>
            <th className="row-num">N°</th>
            {visibleColumns.map(c =>
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
            <th className="col-dots-th" ref={dotsRef}>
              <button
                className={`col-dots-btn ${showColToggle ? "active" : ""}`}
                onClick={toggleDots}
                title="Mostrar/ocultar columnas"
                aria-label="Configurar columnas"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="19" cy="12" r="2"/>
                </svg>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((item, idx) => {
            const stableKey = item.id ?? `${item.DNI || "noDNI"}-${idx}-${safePage}`;
            const escribano = item["Escribano Designado"] ?? item.Escribano ?? item.escribano ?? "";
            const estado = item.Estado ?? item.estado ?? item.EstadoProceso ?? "";
            const beneficiario = item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? item.ApellidoYNombre ?? "—";

            return (
              <tr key={stableKey} title={isIPV(item) ? "IPV: Caso en Dirección de Viviendas" : undefined}>
                <td className="row-num">{idx + 1 + (safePage - 1) * itemsPerPage}</td>
                {visibleColumns.map(c => {
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
                    : c.key === "Estado" ? estado
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
                {/* Celda espejo del botón de tres puntos para mantener la alineación */}
                <td className="col-dots-cell" />
              </tr>
            );
          })}

          {paginatedData.length === 0 && (
            <tr>
              <td colSpan={2 + visibleColumns.length} className="text-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  <span className="text-slate-400 font-medium">No hay registros</span>
                  <span className="text-xs text-slate-300 max-w-xs">
                    {filters.departamento !== "Todos" || filters.localidad !== "Todos" || filters.barrio !== "Todos" || filters.estado !== "Todos" || filters.escribano || filters.dni
                      ? "Probá sacando algunos filtros o limpiando la búsqueda"
                      : "No hay datos para mostrar en esta sección"}
                  </span>
                  {(filters.departamento !== "Todos" || filters.localidad !== "Todos" || filters.barrio !== "Todos" || filters.estado !== "Todos" || filters.escribano || filters.dni) && (
                    <button
                      className="text-xs text-blue-600 font-semibold hover:text-blue-800 mt-1"
                      onClick={() => {
                        setFilters({ departamento: "Todos", localidad: "Todos", barrio: "Todos", estado: "Todos", escribano: "", dni: "" });
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

      {/* Dropdown de columnas posicionado fixed para evitar recortes */}
      {showColToggle && dotsPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowColToggle(false)} />
          <div style={{ position: "fixed", top: dotsPos.top, right: dotsPos.right, zIndex: 50 }}>
            <ColumnToggle
              columns={allColumns}
              groups={allGroups}
              visibleCols={visibleCols}
              onToggle={toggleColumn}
              onClose={() => setShowColToggle(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
