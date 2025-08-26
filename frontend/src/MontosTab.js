import React, { useState, useEffect } from "react";
import axios from "axios";

function MontosTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({ departamento: "Todos", localidad: "Todos" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = process.env.BASE_URL_BACKEND || "http://localhost:8000";
        const response = await axios.get(`${API_URL}/escrituracion?limit=1000`);
        setData(Array.isArray(response.data.data) ? response.data.data : []);
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

  // Filtrar datos
  let filtered = data.filter(item => {
    if (filtros.departamento !== "Todos" && item.Departamento !== filtros.departamento) return false;
    if (filtros.localidad !== "Todos" && item.Localidad !== filtros.localidad) return false;
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

  return (
    <div className="main-container">
      <div className="filters">
        <label>Departamento:
          <select value={filtros.departamento} onChange={e=>setFiltros(f=>({...f,departamento:e.target.value,localidad:"Todos"}))}>
            {departamentos.map(dep=><option key={dep} value={dep}>{dep}</option>)}
          </select>
        </label>
        <label>Localidad:
          <select value={filtros.localidad} onChange={e=>setFiltros(f=>({...f,localidad:e.target.value}))}>
            {localidades.map(loc=><option key={loc} value={loc}>{loc}</option>)}
          </select>
        </label>
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
