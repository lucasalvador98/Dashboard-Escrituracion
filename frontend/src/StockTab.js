import React, { useMemo, useState } from "react";
import "./styles.css";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import SelectFilters from "./components/SelectFilters";

export default function StockTab() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { filters, setFilters, applyFilters } = useFilters({
    departamento: "Todos",
    localidad: "Todos",
    barrio: "Todos",
    estado: "Todos",
    escribano: "",
    dni: ""
  });

  const filtered = useMemo(() => applyFilters(data), [data, filters, applyFilters]);

  // Agrupación por Departamento > Localidad > Barrio
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(item => {
      const dept = item.Departamento || "Sin Departamento";
      const loc = item.Localidad || "Sin Localidad";
      const bar = item.Barrio || "Sin Barrio";
      if (!g[dept]) g[dept] = {};
      if (!g[dept][loc]) g[dept][loc] = {};
      if (!g[dept][loc][bar]) g[dept][loc][bar] = [];
      g[dept][loc][bar].push(item);
    });
    return g;
  }, [filtered]);

  const estadosCols = ["De Baja", "En Trámite", "Entregada", "Finalizada sin Entregar", "Hipotecada", "No Retiradas"];

  function contarEstados(items) {
    const counts = {};
    estadosCols.forEach(e => (counts[e] = 0));
    items.forEach(item => {
      if (counts[item.Estado] !== undefined) counts[item.Estado]++;
    });
    return counts;
  }

  const [expandedDeptos, setExpandedDeptos] = useState({});
  const [expandedLocs, setExpandedLocs] = useState({});
  const [detalle, setDetalle] = useState(null);

  function toggleDepto(depto) {
    setExpandedDeptos(prev => ({ ...prev, [depto]: !prev[depto] }));
  }
  function toggleLoc(depto, loc) {
    setExpandedLocs(prev => ({ ...prev, [depto + "|" + loc]: !prev[depto + "|" + loc] }));
  }
  function showDetalle(items, titulo) {
    setDetalle({ items, titulo });
  }
  function closeDetalle() {
    setDetalle(null);
  }

  return (
    <div className="main-container">
      <SelectFilters data={data} filters={filters} setFilters={setFilters} />

      {loading && <p>Cargando datos...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: "auto", maxHeight: "70vh", position: "relative" }}>
          <table className="stock-table">
            <thead>
              <tr>
                <th></th>
                <th>Departamento</th>
                <th>Localidad</th>
                <th>Barrio</th>
                {estadosCols.map(e => <th key={e}>{e}</th>)}
                <th>Suma total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([depto, locs]) => (
                <React.Fragment key={depto}>
                  <tr className="row-depto" onClick={() => toggleDepto(depto)} style={{ cursor: "pointer" }}>
                    <td>{expandedDeptos[depto] ? "▼" : "▶"}</td>
                    <td colSpan={2} style={{ fontWeight: 600 }}>{depto}</td>
                    <td></td>
                    {(() => {
                      let items = [];
                      Object.values(locs).forEach(barrioObj => {
                        Object.values(barrioObj).forEach(arr => (items = items.concat(arr)));
                      });
                      const counts = contarEstados(items);
                      return [...estadosCols.map(e => <td key={e}>{counts[e] || 0}</td>), <td key="total">{items.length}</td>];
                    })()}
                  </tr>

                  {expandedDeptos[depto] && Object.entries(locs).map(([loc, barriosObj]) => (
                    <React.Fragment key={loc}>
                      <tr className="row-loc" onClick={() => toggleLoc(depto, loc)} style={{ cursor: "pointer" }}>
                        <td style={{ paddingLeft: '2em' }}>{expandedLocs[depto + "|" + loc] ? "▼" : "▶"}</td>
                        <td></td>
                        <td colSpan={2} style={{ fontWeight: 500 }}>{loc}</td>
                        {(() => {
                          let items = [];
                          Object.values(barriosObj).forEach(arr => (items = items.concat(arr)));
                          const counts = contarEstados(items);
                          return [...estadosCols.map(e => <td key={e}>{counts[e] || 0}</td>), <td key="total">{items.length}</td>];
                        })()}
                      </tr>

                      {expandedLocs[depto + "|" + loc] && Object.entries(barriosObj).map(([barrio, items], idx) => (
                        <tr key={barrio} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                          <td></td>
                          <td></td>
                          <td>{barrio}</td>
                          <td>
                            <button className="btn-detalle" onClick={() => showDetalle(items, `${depto} - ${loc} - ${barrio}`)}>Ver detalle</button>
                          </td>
                          {(() => {
                            const counts = contarEstados(items);
                            return [...estadosCols.map(e => <td key={e}>{counts[e] || 0}</td>), <td key="total">{items.length}</td>];
                          })()}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalle && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeDetalle}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '10px', minWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3>Detalle: {detalle.titulo}</h3>
            <table style={{ width: '100%', marginTop: '1em' }}>
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Departamento</th>
                  <th>Localidad</th>
                  <th>Barrio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {detalle.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.DNI}</td>
                    <td>{item.Departamento}</td>
                    <td>{item.Localidad}</td>
                    <td>{item.Barrio}</td>
                    <td>{item.Estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={closeDetalle} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#2980b9', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
