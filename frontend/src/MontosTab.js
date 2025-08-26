import React, { useState, useEffect } from "react";
import axios from "axios";
import API_CONFIG from "./config-api";
const API_URL = API_CONFIG.BASE_URL_BACKEND;

function MontosTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ departamento: "Todos", localidad: "Todos" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_URL}/escrituracion`);
        const arr = Array.isArray(response.data.data) ? response.data.data : Array.isArray(response.data) ? response.data : [];
        setData(arr);
        setLoading(false);
      } catch (error) {
        setError("Error al cargar datos");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtros dependientes
  const departamentos = ["Todos", ...new Set(data.map(item => item.Departamento))];
  const localidades = filtros.departamento === "Todos"
    ? ["Todos", ...new Set(data.map(item => item.Localidad))]
    : ["Todos", ...new Set(data.filter(item => item.Departamento === filtros.departamento).map(item => item.Localidad))];
  const escribanos = [...new Set(data.map(item => item["Escribano Designado"]).filter(Boolean))];

  // Filtrar datos
  let filtered = data.filter(item => {
    if (filtros.departamento && item.Departamento.trim().toUpperCase().indexOf(filtros.departamento.trim().toUpperCase()) === -1) return false;
    if (filtros.localidad && item.Localidad.trim().toUpperCase().indexOf(filtros.localidad.trim().toUpperCase()) === -1) return false;
    if (filtros.escribano && item["Escribano Designado"] && item["Escribano Designado"].toUpperCase().indexOf(filtros.escribano.trim().toUpperCase()) === -1) return false;
    return true;
  });

  // Agrupación por Departamento > Localidad
  const grouped = {};
  filtered.forEach(item => {
    if (!grouped[item.Departamento]) grouped[item.Departamento] = {};
    if (!grouped[item.Departamento][item.Localidad]) grouped[item.Departamento][item.Localidad] = [];
    grouped[item.Departamento][item.Localidad].push(item);
  });

  // Suma de montos y beneficiarios por estado
  function sumMontos(items, estado) {
    return items
      .filter(i => i.Estado === estado)
      .reduce((acc, curr) => {
        let monto = curr.MontoEjecutado;
        if (typeof monto === 'string') {
          // Eliminar puntos, comas, símbolos y espacios
          monto = monto.replace(/[^\d.-]/g, '');
        }
        return acc + (parseFloat(monto) || 0);
      }, 0);
  }
  function sumBenef(items, estado) {
    return items.filter(i => i.Estado === estado).length;
  }

  // Suma total general
  let totalBenefEntregada = 0;
  let totalMontoEntregada = 0;
  let totalBenefFinalizada = 0;
  let totalMontoFinalizada = 0;

  Object.entries(grouped).forEach(([depto, locs]) => {
    Object.entries(locs).forEach(([loc, items]) => {
      totalBenefEntregada += sumBenef(items, "Entregada");
      totalMontoEntregada += sumMontos(items, "Entregada");
      totalBenefFinalizada += sumBenef(items, "Finalizada sin Entregar");
      totalMontoFinalizada += sumMontos(items, "Finalizada sin Entregar");
    });
  });

  // Formato moneda
  function formatMoney(val) {
  // Forzar formato $xxx.xxx,yy
  let num = Number(val);
  if (isNaN(num)) return "$0,00";
  let parts = num.toFixed(2).split(".");
  let intPart = parts[0];
  let decPart = parts[1];
  // Separador de miles con punto
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$${intPart},${decPart}`;
  }

  function renderAutoComplete(options, value, onChange, placeholder) {
    const filteredOptions = options.filter(opt => opt.toUpperCase().includes(value.trim().toUpperCase()));
    return (
      <div className="autocomplete">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="filter-input"
        />
        {value && (
          <ul className="autocomplete-list">
            {filteredOptions.slice(0,8).map(opt => (
              <li key={opt} onClick={() => onChange(opt)}>{opt}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="main-container">
      <div className="filters filters-modern">
        {renderAutoComplete(departamentos, filtros.departamento, val => setFiltros(f=>({...f,departamento:val,localidad:"Todos"})), "Departamento")}
        {renderAutoComplete(localidades, filtros.localidad, val => setFiltros(f=>({...f,localidad:val})), "Localidad")}
        {renderAutoComplete(escribanos, filtros.escribano || "", val => setFiltros(f=>({...f,escribano:val})), "Escribano Designado")}
      </div>
      {loading && <p>Cargando datos...</p>}
      {error && <p style={{color:'red'}}>{error}</p>}
      {!loading && !error && (
        <div style={{overflowX:'auto',maxHeight:'70vh',position:'relative'}}>
          <table className="stock-table">
            <thead>
              <tr>
                <th>Departamento</th>
                <th>Localidad</th>
                <th>Beneficiarios Entregada</th>
                <th>Monto Entregada</th>
                <th>Beneficiarios Finalizada sin Entregar</th>
                <th>Monto Finalizada sin Entregar</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([depto, locs]) => (
                Object.entries(locs).map(([loc, items], idx) => (
                  <tr key={depto+loc} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                    <td>{depto}</td>
                    <td>{loc}</td>
                    <td>{sumBenef(items, "Entregada")}</td>
                    <td>{formatMoney(sumMontos(items, "Entregada"))}</td>
                    <td>{sumBenef(items, "Finalizada sin Entregar")}</td>
                    <td>{formatMoney(sumMontos(items, "Finalizada sin Entregar"))}</td>
                  </tr>
                ))
              ))}
              <tr style={{fontWeight:'bold',background:'#e1eafc'}}>
                <td colSpan={2}>Suma total</td>
                <td>{totalBenefEntregada}</td>
                <td>{formatMoney(totalMontoEntregada)}</td>
                <td>{totalBenefFinalizada}</td>
                <td>{formatMoney(totalMontoFinalizada)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MontosTab;
