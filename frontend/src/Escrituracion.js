import React, { useMemo, useState, useRef, useEffect } from "react";
import "./styles.css";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import SelectFilters from "./components/SelectFilters";

const itemsPerPage = 15;

const TABLAS = [
  { key: "ingreso_sorteo", label: "Diferencia entre Ingreso y Sorteo", fecha1: "Fecha Ingreso Colegio de Escribanos", fecha2: "Fecha de Sorteo", columna: "diferencia_ingreso_sorteo", pageState: "pageIngresoSorteo", setPageState: "setPageIngresoSorteo" },
  { key: "sorteo_aceptacion", label: "Diferencia entre Sorteo y Aceptación", fecha1: "Fecha de Sorteo", fecha2: "Fecha de Aceptacion", columna: "diferencia_sorteo_aceptacion", pageState: "pageSorteoAceptacion", setPageState: "setPageSorteoAceptacion" },
  { key: "aceptacion_firma", label: "Diferencia entre Aceptación y Firma", fecha1: "Fecha de Aceptacion", fecha2: "Fecha de Firma", columna: "diferencia_aceptacion_firma", pageState: "pageAceptacionFirma", setPageState: "setPageAceptacionFirma" },
  { key: "firma_ingreso", label: "Diferencia entre Firma e Ingreso Diario", fecha1: "Fecha de Firma", fecha2: "Fecha de Ingreso al Registro", columna: "diferencia_firma_ingreso", pageState: "pageFirmaIngreso", setPageState: "setPageFirmaIngreso" },
  { key: "ingreso_testimonio", label: "Diferencia entre Ingreso Diario y Testimonio", fecha1: "Fecha de Ingreso al Registro", fecha2: "Fecha de envío PT digital", columna: "diferencia_ingreso_testimonio", pageState: "pageIngresoTestimonio", setPageState: "setPageIngresoTestimonio" }
];

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
  return Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));
}

function generarReporte(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(orig => {
    const item = { ...orig };
    TABLAS.forEach(({ fecha1, fecha2, columna }) => {
      item[columna] = calcularDiferenciaDias(item[fecha1], item[fecha2]);
    });
    return item;
  });
}

export default function Escrituracion({ activeDiffTabIndex = 0, onChangeDiffTab = () => {}, diffTabLabels = null }) {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { filters, setFilters, applyFilters, derivedOptions } = useFilters({ departamento: "Todos", localidad: "Todos", barrio: "Todos", estado: "Todos", escribano: "", dni: "" });

  const [sortCol, setSortCol] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [activeTab, setActiveTab] = useState(TABLAS[0].key);
  const currentDiffIndex = typeof activeDiffTabIndex === "number" ? activeDiffTabIndex : 0;
  const diffLabels = diffTabLabels && diffTabLabels.length ? diffTabLabels : TABLAS.map(t => t.label);

  // paginación por tabla
  const [pageIngresoSorteo, setPageIngresoSorteo] = useState(1);
  const [pageSorteoAceptacion, setPageSorteoAceptacion] = useState(1);
  const [pageAceptacionFirma, setPageAceptacionFirma] = useState(1);
  const [pageFirmaIngreso, setPageFirmaIngreso] = useState(1);
  const [pageIngresoTestimonio, setPageIngresoTestimonio] = useState(1);

  const processedData = useMemo(() => generarReporte(data), [data]);
  const filteredData = useMemo(() => applyFilters(processedData), [processedData, filters, applyFilters]);

  const options = derivedOptions(processedData);

  const departamentos = options.departamentos;
  const localidades = options.localidades;
  const barrios = options.barrios;
  const estados = options.estados;
  const escribanos = options.escribanos;

  const itemsForTab = (tabKey) => filteredData; // same source for all tables (renderTable slices/paginates)

  const getPaginated = (d, page) => d.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const pagesMap = {
    pageIngresoSorteo, setPageIngresoSorteo,
    pageSorteoAceptacion, setPageSorteoAceptacion,
    pageAceptacionFirma, setPageAceptacionFirma,
    pageFirmaIngreso, setPageFirmaIngreso,
    pageIngresoTestimonio, setPageIngresoTestimonio
  };

  // Reiniciar todas las paginaciones cuando se aplica un nuevo filtro
  const resetAllPages = () => {
    setPageIngresoSorteo(1);
    setPageSorteoAceptacion(1);
    setPageAceptacionFirma(1);
    setPageFirmaIngreso(1);
    setPageIngresoTestimonio(1);
  };

  const getSortIcon = (col) => sortCol !== col ? '' : (sortOrder === 'asc' ? ' ▲' : ' ▼');

  function handleSort(col) {
    if (sortCol === col) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortOrder('asc'); }
  }

  const renderPagination = (page, setPage, totalPages) => {
    if (totalPages <= 1) return null;
    let pages = [];
    pages.push(<button key={1} className={page === 1 ? "active" : ""} onClick={() => setPage(1)}>1</button>);
    if (totalPages > 6) {
      let start = Math.max(2, page - 2), end = Math.min(totalPages - 1, page + 2);
      if (start > 2) pages.push(<span key="start-ellipsis" className="ellipsis">...</span>);
      for (let i = start; i <= end; i++) pages.push(<button key={i} className={page === i ? "active" : ""} onClick={() => setPage(i)}>{i}</button>);
      if (end < totalPages - 1) pages.push(<span key="end-ellipsis" className="ellipsis">...</span>);
      pages.push(<button key={totalPages} className={page === totalPages ? "active" : ""} onClick={() => setPage(totalPages)}>{totalPages}</button>);
    } else {
      for (let i = 2; i <= totalPages; i++) pages.push(<button key={i} className={page === i ? "active" : ""} onClick={() => setPage(i)}>{i}</button>);
    }
    return (
      <div className="pagination">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>&lt;</button>
        {pages}
        <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>&gt;</button>
      </div>
    );
  };

  const renderTable = (d, fecha1, fecha2, columna, titulo, page, setPage) => {
    let sortedData = [...d];
    if (sortCol) {
      sortedData.sort((a, b) => {
        if (a[sortCol] == null) return 1;
        if (b[sortCol] == null) return -1;
        if (sortCol === columna) {
          let va = Number(a[sortCol]); let vb = Number(b[sortCol]);
          return sortOrder === 'asc' ? va - vb : vb - va;
        }
        if (sortCol === fecha1 || sortCol === fecha2) {
          let va = new Date(a[sortCol]); let vb = new Date(b[sortCol]);
          return sortOrder === 'asc' ? va - vb : vb - va;
        }
        if (typeof a[sortCol] === 'number' && typeof b[sortCol] === 'number') {
          return sortOrder === 'asc' ? a[sortCol] - b[sortCol] : b[sortCol] - a[sortCol];
        }
        return sortOrder === 'asc'
          ? String(a[sortCol]).localeCompare(String(b[sortCol]))
          : String(b[sortCol]).localeCompare(String(a[sortCol]));
      });
    }

    const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
    const paginatedData = getPaginated(sortedData, page);

    return (
      <div>
        <h3>{titulo} ({sortedData.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Localidad</th>
              <th>Barrio</th>
              <th>Beneficiario</th>
              <th>DNI</th>
              <th onClick={()=>handleSort(fecha1)} style={{cursor:'pointer'}}>{fecha1}{getSortIcon(fecha1)}</th>
              <th onClick={()=>handleSort(fecha2)} style={{cursor:'pointer'}}>{fecha2}{getSortIcon(fecha2)}</th>
              <th onClick={()=>handleSort(columna)} style={{cursor:'pointer'}}>Diferencia de días {getSortIcon(columna)}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => {
              // key estable: preferir item.id si existe, sino componerlo con campos únicos (DNI + nombres + fechas)
              const stableKey = item.id ?? `${item.DNI || "noDNI"}-${(item.Beneficiario || "").toString().replace(/\s+/g, "_").slice(0,40)}-${String(item[fecha1] || "")}-${String(item[fecha2] || "")}-${index}`;
               const diferencia = item[columna];
               let rowClass = "";
               if (diferencia === "N/A") rowClass = "gray";
               else if (Number(diferencia) <= 3) rowClass = "green";
               else if (Number(diferencia) <= 7) rowClass = "yellow";
               else rowClass = "red";
               return (
                <tr key={stableKey} className={rowClass}>
                  <td>{item.Departamento}</td>
                  <td>{item.Localidad}</td>
                  <td>{item.Barrio}</td>
                  <td>{item.Beneficiario}</td>
                  <td>{item.DNI}</td>
                  <td>{item[fecha1]}</td>
                  <td>{item[fecha2]}</td>
                  <td>{diferencia}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {renderPagination(page, setPage, totalPages)}
      </div>
    );
  };

  // antes del return, dentro del componente funcional
  const dataForStats = processedData ?? [];
  const totalCount = dataForStats.length;
  const counts = dataForStats.reduce((acc, it) => {
    const estado = (it.Estado || it.estado || it.EstadoProceso || "En Trámite").toString();
    acc[estado] = (acc[estado] || 0) + 1;
    return acc;
  }, {});

  const statDefs = [
    { key: "En Trámite", variant: "primary" },
    { key: "Finalizada sin Entregar", variant: "success" },
    { key: "Entregada", variant: "success" },
    { key: "De Baja", variant: "warning" },
    { key: "Hipotecada", variant: "danger" },
    { key: "No Retiradas", variant: "muted" },
  ];

  // processedData existe en tu componente (datos ya preprocesados por filtros generales)
  // Nuevo: datos filtrados aplicando el filtro activo (estado) — usado por la tabla
  // const filteredByEstado = (data) => {
  //   if (!filters || !filters.estado || filters.estado === "Todos") return data;
  //   const estadoFiltro = String(filters.estado).trim();
  //   return (data || []).filter(item => {
  //     const estadoItem = String(item.Estado || item.estado || item.EstadoProceso || "").trim();
  //     return estadoItem === estadoFiltro;
  //   });
  // };

  // referencia para hacer scroll a la tabla al aplicar filtro
  const tableRef = useRef(null);

  // estado local inmediato para el filtro por "estado" (aplica al click de tarjeta)
  // null = ninguno / mostrar todos
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState(
    (filters && filters.estado && filters.estado !== "Todos") ? filters.estado : null
  );

  // sincronizar si el filtro global cambia por otros controles (SelectFilters)
  useEffect(() => {
    const fromGlobal = (filters && filters.estado && filters.estado !== "Todos") ? filters.estado : null;
    if (fromGlobal !== selectedEstadoFilter) setSelectedEstadoFilter(fromGlobal);
  }, [filters && filters.estado]); // mantener sincronía con el hook de filtros

  // itemsForTab já retorna datos filtrados por useFilters; además aplicamos selectedEstadoFilter
  const itemsForTabFiltered = (tabKey) => {
    const items = itemsForTab(tabKey) || [];
    const estadoActivo = selectedEstadoFilter ?? ((filters && filters.estado && filters.estado !== "Todos") ? filters.estado : null);
    if (!estadoActivo) return items;
    const ef = String(estadoActivo).trim();
    return items.filter(item => String(item.Estado || item.estado || item.EstadoProceso || "").trim() === ef);
  };

  return (
    <>
      {/* filtros en cascada (selects no editables) */}
      <SelectFilters data={processedData} filters={filters} setFilters={setFilters} />

      {/* Tarjetas de estado (ahora actúan como filtros) */}
      <div className="status-cards" style={{ marginTop: 12 }}>
        {statDefs.map(s => {
          const count = counts[s.key] || 0;
          const pct = totalCount ? Math.round((count / totalCount) * 100) : 0;
          const isActive = (selectedEstadoFilter ?? (filters.estado && filters.estado !== "Todos" ? filters.estado : null)) === s.key;

          const toggleEstado = () => {
            // calcular nuevo estado y actualizar primero el filtro global
            const nuevoSel = (selectedEstadoFilter === s.key) ? null : s.key;
            // actualizar filtro global para que SelectFilters refleje el cambio inmediatamente
            setFilters(prev => ({ ...prev, estado: nuevoSel ? nuevoSel : "Todos" }));
            // luego actualizamos el estado local para la UI inmediata
            setSelectedEstadoFilter(nuevoSel);
            resetAllPages();
          };

          return (
            <div
              key={s.key}
              role="button"
              tabIndex={0}
              className={`status-card variant-${s.variant} ${isActive ? "selected" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={toggleEstado}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleEstado(); } }}
              aria-pressed={isActive}
            >
              <div className="left">
                <div className="label">{s.key}</div>
                <div className="value">{count.toLocaleString()}</div>
                <div className="meta">{pct}% del total</div>
              </div>
              <div className="badge">
                <div className="pct">{pct}%</div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Eliminado Semaforo embebido para evitar duplicados de tarjetas */}

      {/* NOTE: las sub-pestañas de diferencia ahora se muestran en la Sidebar */}
      <div className="tab-content" ref={tableRef}>
        {(() => {
          const tab = TABLAS[activeDiffTabIndex] || TABLAS[0];
          return renderTable(
            itemsForTabFiltered(tab.key),
            tab.fecha1,
            tab.fecha2,
            tab.columna,
            tab.label,
            pagesMap[tab.pageState] ?? 1,
            pagesMap[tab.setPageState] ?? (() => {})
          );
        })()}
      </div>
    </>
  );
};
