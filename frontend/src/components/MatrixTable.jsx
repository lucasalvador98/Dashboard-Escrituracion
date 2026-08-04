import React from "react";
import { INTERVALS } from "../hooks/useEscrituracion";
import { diffClass } from "../hooks/useEscrituracion";

export default function MatrixTable({
  allColumns, visibleCols, sortCol, sortOrder, handleSort,
  paginatedData, safePage, itemsPerPage, filterByField,
  setIntervalDetail, filters,
}) {
  const sortIcon = col => (sortCol !== col ? "" : sortOrder === "asc" ? " ▲" : " ▼");
  const ariaSort = col => {
    if (sortCol !== col) return "none";
    return sortOrder === "asc" ? "ascending" : "descending";
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
                {visibleColumns.map(c => {
                  if (c.key.startsWith("diferencia_")) {
                    const iv = INTERVALS.find(i => i.key === c.key);
                    if (!iv) return null;
                    const val = item[iv.key];
                    const forceRed = iv.key === "diferencia_aceptacion_firma" ? 20 : undefined;
                    const cls = diffClass(val, iv.esperado, forceRed);
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
              </tr>
            );
          })}

          {paginatedData.length === 0 && (
            <tr>
              <td colSpan={1 + visibleColumns.length} className="text-center py-12">
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
    </div>
  );
}
