import React, { useEffect, useState } from "react";
import axios from "axios";
import "./styles.css";
import API_CONFIG from "./config-api";

const itemsPerPage = 15;

const TABLAS = [
  {
    key: "ingreso_sorteo",
    label: "Ingreso Colegio vs Sorteo",
    fecha1: "Fecha Ingreso Colegio de Escribanos",
    fecha2: "Fecha de Sorteo",
    columna: "diferencia_ingreso_sorteo",
    pageState: "pageIngresoSorteo",
    setPageState: "setPageIngresoSorteo"
  },
  {
    key: "sorteo_aceptacion",
    label: "Sorteo vs Aceptación",
    fecha1: "Fecha de Sorteo",
    fecha2: "Fecha de Aceptacion",
    columna: "diferencia_sorteo_aceptacion",
    pageState: "pageSorteoAceptacion",
    setPageState: "setPageSorteoAceptacion"
  },
  {
    key: "aceptacion_firma",
    label: "Aceptación vs Firma",
    fecha1: "Fecha de Aceptacion",
    fecha2: "Fecha de Firma",
    columna: "diferencia_aceptacion_firma",
    pageState: "pageAceptacionFirma",
    setPageState: "setPageAceptacionFirma"
  },
  {
    key: "firma_ingreso",
    label: "Firma vs Ingreso Diario",
    fecha1: "Fecha de Firma",
    fecha2: "Fecha de Ingreso al Registro",
    columna: "diferencia_firma_ingreso",
    pageState: "pageFirmaIngreso",
    setPageState: "setPageFirmaIngreso"
  },
  {
    key: "ingreso_testimonio",
    label: "Ingreso Diario vs Testimonio",
    fecha1: "Fecha de Ingreso al Registro",
    fecha2: "Fecha de envío PT digital",
    columna: "diferencia_ingreso_testimonio",
    pageState: "pageIngresoTestimonio",
    setPageState: "setPageIngresoTestimonio"
  }
];

const Escrituracion = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [departamento, setDepartamento] = useState("Todos");
  const [localidad, setLocalidad] = useState("Todos");
  const [barrio, setBarrio] = useState("Todos");
  const [estado, setEstado] = useState("Todos");
  const [dni, setDni] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  // Estados de paginación por tabla
  const [pageIngresoSorteo, setPageIngresoSorteo] = useState(1);
  const [pageSorteoAceptacion, setPageSorteoAceptacion] = useState(1);
  const [pageAceptacionFirma, setPageAceptacionFirma] = useState(1);
  const [pageFirmaIngreso, setPageFirmaIngreso] = useState(1);
  const [pageIngresoTestimonio, setPageIngresoTestimonio] = useState(1);

  // Estado para pestañas
  const [activeTab, setActiveTab] = useState(TABLAS[0].key);

  // Cargar datos desde la API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = API_CONFIG.BASE_URL_BACKEND;
        const response = await axios.get(`${API_URL}/escrituracion?limit=1000`);
        const processedData = generarReporte(Array.isArray(response.data.data) ? response.data.data : Array.isArray(response.data) ? response.data : []);
        setData(processedData);
        setFilteredData(processedData);
      } catch (error) {
        console.error("Error al cargar los datos:", error.response?.data?.detail || error.message);
      }
    };
    fetchData();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...data];
    if (departamento !== "Todos") filtered = filtered.filter(item => item.Departamento === departamento);
    if (localidad !== "Todos") filtered = filtered.filter(item => item.Localidad === localidad);
    if (barrio !== "Todos") filtered = filtered.filter(item => item.Barrio === barrio);
    if (estado !== "Todos") filtered = filtered.filter(item => item.Estado === estado);
    if (dni) filtered = filtered.filter(item => item.DNI && item.DNI.toString().includes(dni));
    setFilteredData(filtered);
    // Reiniciar paginación al cambiar filtros
    setPageIngresoSorteo(1);
    setPageSorteoAceptacion(1);
    setPageAceptacionFirma(1);
    setPageFirmaIngreso(1);
    setPageIngresoTestimonio(1);
  }, [departamento, localidad, barrio, estado, dni, data]);

  // Calcular diferencias de días entre pares de fechas
  const calcularDiferenciaDias = (fecha1, fecha2) => {
    if (!fecha1 || !fecha2 || fecha1 === "N/A" || fecha2 === "N/A") return "N/A";
    const date1 = new Date(fecha1.split("/").reverse().join("-"));
    const date2 = new Date(fecha2.split("/").reverse().join("-"));
    if (isNaN(date1) || isNaN(date2)) return "N/A";
    return Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));
  };

  // Generar reporte con semaforización
  const generarReporte = (data) => {
    TABLAS.forEach(({ fecha1, fecha2, columna }) => {
      data.forEach(item => {
        item[columna] = calcularDiferenciaDias(item[fecha1], item[fecha2]);
      });
    });
    return data;
  };

  // Filtros dependientes
  const departamentos = [...new Set(data.map(item => item.Departamento))];
  const localidades = departamento === "Todos"
    ? [...new Set(data.map(item => item.Localidad))]
    : [...new Set(data.filter(item => item.Departamento === departamento).map(item => item.Localidad))];
  const barrios = (departamento === "Todos" && localidad === "Todos")
    ? [...new Set(data.map(item => item.Barrio))]
    : [...new Set(data.filter(item =>
        (departamento === "Todos" || item.Departamento === departamento) &&
        (localidad === "Todos" || item.Localidad === localidad)
      ).map(item => item.Barrio))];
  const estados = [...new Set(data.map(item => item.Estado))];

  // Paginación por tabla
  const getPaginated = (data, page) => data.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const renderPagination = (page, setPage, totalPages) => {
    if (totalPages <= 1) return null;

    let pages = [];
    // Siempre mostrar la primera página
    pages.push(
      <button
        key={1}
        className={page === 1 ? "active" : ""}
        onClick={() => setPage(1)}
      >
        1
      </button>
    );

    // Si hay más de 6 páginas, mostrar secciones de 5
    if (totalPages > 6) {
      let start = Math.max(2, page - 2);
      let end = Math.min(totalPages - 1, page + 2);

      if (start > 2) {
        pages.push(<span key="start-ellipsis" className="ellipsis">...</span>);
      }

      for (let i = start; i <= end; i++) {
        pages.push(
          <button
            key={i}
            className={page === i ? "active" : ""}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      }

      if (end < totalPages - 1) {
        pages.push(<span key="end-ellipsis" className="ellipsis">...</span>);
      }

      // Siempre mostrar la última página
      pages.push(
        <button
          key={totalPages}
          className={page === totalPages ? "active" : ""}
          onClick={() => setPage(totalPages)}
        >
          {totalPages}
        </button>
      );
    } else {
      // Si hay 6 o menos páginas, mostrar todas
      for (let i = 2; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            className={page === i ? "active" : ""}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      }
    }

    return (
      <div className="pagination">
        <button onClick={() => setPage(page - 1)} disabled={page === 1}>&lt;</button>
        {pages}
        <button onClick={() => setPage(page + 1)} disabled={page === totalPages}>&gt;</button>
      </div>
    );
  };

  // Flecha visual para sort
  const getSortIcon = (col) => {
    if (sortCol !== col) return '';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  // Función de sort
  function handleSort(col) {
    if (sortCol === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortOrder('asc');
    }
  }

  const renderTable = (data, fecha1, fecha2, columna, titulo, page, setPage) => {
    // Ordenar aquí, no en el estado global
    let sortedData = [...data];
    if (sortCol) {
      sortedData.sort((a, b) => {
        if (a[sortCol] == null) return 1;
        if (b[sortCol] == null) return -1;
        // Diferencia de días
        if (sortCol === columna) {
          let va = Number(a[sortCol]);
          let vb = Number(b[sortCol]);
          return sortOrder === 'asc' ? va - vb : vb - va;
        }
        // Fechas
        if (sortCol === fecha1 || sortCol === fecha2) {
          let va = new Date(a[sortCol]);
          let vb = new Date(b[sortCol]);
          return sortOrder === 'asc' ? va - vb : vb - va;
        }
        // Texto
        if (typeof a[sortCol] === 'number' && typeof b[sortCol] === 'number') {
          return sortOrder === 'asc' ? a[sortCol] - b[sortCol] : b[sortCol] - a[sortCol];
        }
        return sortOrder === 'asc'
          ? String(a[sortCol]).localeCompare(String(b[sortCol]))
          : String(b[sortCol]).localeCompare(String(a[sortCol]));
      });
    }
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const paginatedData = getPaginated(sortedData, page);

    return (
      <div>
        <h3>{titulo}</h3>
        <table>
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Localidad</th>
              <th>Barrio</th>
              <th>Beneficiario</th>
              <th>DNI</th>
              <th onClick={()=>handleSort(fecha1)} style={{cursor:'pointer'}}>
                {fecha1} {getSortIcon(fecha1)}
              </th>
              <th onClick={()=>handleSort(fecha2)} style={{cursor:'pointer'}}>
                {fecha2} {getSortIcon(fecha2)}
              </th>
              <th onClick={()=>handleSort(columna)} style={{cursor:'pointer'}}>
                Diferencia de días {getSortIcon(columna)}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => {
              const diferencia = item[columna];
              let rowColor = "";
              if (diferencia === "N/A") rowColor = "gray";
              else if (diferencia <= 3) rowColor = "green";
              else if (diferencia <= 7) rowColor = "yellow";
              else rowColor = "red";
              return (
                <tr key={index} className={rowColor}>
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

  // Relaciona el estado de paginación con cada tabla
  const pageStates = {
    pageIngresoSorteo, setPageIngresoSorteo,
    pageSorteoAceptacion, setPageSorteoAceptacion,
    pageAceptacionFirma, setPageAceptacionFirma,
    pageFirmaIngreso, setPageFirmaIngreso,
    pageIngresoTestimonio, setPageIngresoTestimonio
  };

  return (
    <div className="main-container">
      <div className="filters">
        <label>
          Departamento:
          <select value={departamento} onChange={e => {
            setDepartamento(e.target.value);
            setLocalidad("Todos");
            setBarrio("Todos");
          }}>
            <option value="Todos">Todos</option>
            {departamentos.map(dep => <option key={dep} value={dep}>{dep}</option>)}
          </select>
        </label>
        <label>
          Localidad:
          <select value={localidad} onChange={e => {
            setLocalidad(e.target.value);
            setBarrio("Todos");
          }}>
            <option value="Todos">Todos</option>
            {localidades.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </label>
        <label>
          Barrio:
          <select value={barrio} onChange={e => setBarrio(e.target.value)}>
            <option value="Todos">Todos</option>
            {barrios.map(bar => <option key={bar} value={bar}>{bar}</option>)}
          </select>
        </label>
        <label>
          Estado:
          <select value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="Todos">Todos</option>
            {estados.map(est => <option key={est} value={est}>{est}</option>)}
          </select>
        </label>
        <label>
          DNI:
          <input
            type="text"
            value={dni}
            onChange={e => setDni(e.target.value)}
          />
        </label>
      </div>

      {/* Pestañas */}
      <div className="tabs">
        {TABLAS.map(tab => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "tab-active" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="tab-content">
        {TABLAS.map(tab => (
          activeTab === tab.key &&
          renderTable(
            filteredData,
            tab.fecha1,
            tab.fecha2,
            tab.columna,
            tab.label,
            pageStates[tab.pageState],
            pageStates[tab.setPageState]
          )
        ))}
      </div>
    </div>
  );
};

export default Escrituracion;
