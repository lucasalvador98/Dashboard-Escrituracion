import React, { useMemo, useState } from "react";
import "./styles.css";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import SelectFilters from "./components/SelectFilters";
import Semaforo from "./components/Semaforo";

const itemsPerPage = 15;

const TABLAS = [
  { key: "ingreso_sorteo", label: "Ingreso Colegio vs Sorteo", fecha1: "Fecha Ingreso Colegio de Escribanos", fecha2: "Fecha de Sorteo", columna: "diferencia_ingreso_sorteo", pageState: "pageIngresoSorteo", setPageState: "setPageIngresoSorteo" },
  { key: "sorteo_aceptacion", label: "Sorteo vs Aceptación", fecha1: "Fecha de Sorteo", fecha2: "Fecha de Aceptacion", columna: "diferencia_sorteo_aceptacion", pageState: "pageSorteoAceptacion", setPageState: "setPageSorteoAceptacion" },
  { key: "aceptacion_firma", label: "Aceptación vs Firma", fecha1: "Fecha de Aceptacion", fecha2: "Fecha de Firma", columna: "diferencia_aceptacion_firma", pageState: "pageAceptacionFirma", setPageState: "setPageAceptacionFirma" },
  { key: "firma_ingreso", label: "Firma vs Ingreso Diario", fecha1: "Fecha de Firma", fecha2: "Fecha de Ingreso al Registro", columna: "diferencia_firma_ingreso", pageState: "pageFirmaIngreso", setPageState: "setPageFirmaIngreso" },
  { key: "ingreso_testimonio", label: "Ingreso Diario vs Testimonio", fecha1: "Fecha de Ingreso al Registro", fecha2: "Fecha de envío PT digital", columna: "diferencia_ingreso_testimonio", pageState: "pageIngresoTestimonio", setPageState: "setPageIngresoTestimonio" }
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

const Escrituracion = () => {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { filters, setFilters, applyFilters, derivedOptions } = useFilters({ departamento: "Todos", localidad: "Todos", barrio: "Todos", estado: "Todos", escribano: "", dni: "" });

  const [sortCol, setSortCol] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [activeTab, setActiveTab] = useState(TABLAS[0].key);

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
              const diferencia = item[columna];
              let rowClass = "";
              if (diferencia === "N/A") rowClass = "gray";
              else if (Number(diferencia) <= 3) rowClass = "green";
              else if (Number(diferencia) <= 7) rowClass = "yellow";
              else rowClass = "red";
              return (
                <tr key={index} className={rowClass}>
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

  return (
    <div className="main-container">
      {/* filtros en cascada (selects no editables) */}
      <SelectFilters data={processedData} filters={filters} setFilters={setFilters} />

      {/* componentes nuevos debajo de los filtros */}
      <div className="new-components" style={{ marginBottom: 12 }}>
        <Semaforo data={processedData} onSelectEstado={e => setFilters({ estado: e || "Todos" })} activeEstado={filters.estado} />
        {/* Aquí puedes añadir otros componentes nuevos bajo los filtros */}
      </div>

      <div className="tabs" style={{ marginTop: 12, marginBottom: 12 }}>
        {TABLAS.map(tab => (
          <button key={tab.key} className={activeTab === tab.key ? "tab-active" : "tab"} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
        ))}
      </div>

      <div className="tab-content">
        {TABLAS.map(tab => activeTab === tab.key && renderTable(
          itemsForTab(tab.key),
          tab.fecha1,
          tab.fecha2,
          tab.columna,
          tab.label,
          pagesMap[tab.pageState] ?? 1,
          pagesMap[tab.setPageState] ?? (() => {})
        ))}
      </div>
    </div>
  );
};

export default Escrituracion;
