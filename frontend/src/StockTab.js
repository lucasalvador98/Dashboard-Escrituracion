import React, { useState, useMemo } from "react";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import SelectFilters from "./components/SelectFilters";
import API_CONFIG from "./config-api";

const API_URL = API_CONFIG.BASE_URL_BACKEND;
const ESTADOS_FINALIZADAS = ["Finalizada sin Entregar", "Entregada"];

function downloadExcel(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function StockTab() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { filters, setFilters, applyFilters } = useFilters({
    departamento: "Todos", localidad: "Todos", barrio: "Todos",
    estado: "Todos", escribano: "", dni: "",
  });

  // Solo finalizadas
  const finalizadas = useMemo(
    () => (Array.isArray(data) ? data.filter(i => ESTADOS_FINALIZADAS.includes(i.Estado)) : []),
    [data]
  );

  const filtered = useMemo(() => applyFilters(finalizadas), [finalizadas, filters, applyFilters]);

  // Agrupación jerárquica
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

  const [expandedDeptos, setExpandedDeptos] = useState({});
  const [expandedLocs, setExpandedLocs] = useState({});
  const [detalle, setDetalle] = useState(null);

  function toggleDepto(d) { setExpandedDeptos(p => ({ ...p, [d]: !p[d] })); }
  function toggleLoc(d, l) { setExpandedLocs(p => ({ ...p, [d + "|" + l]: !p[d + "|" + l] })); }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
          Stock — Finalizadas
        </h2>
        <button
          onClick={() => downloadExcel(`${API_URL}/stock/exportar`, "Stock_General.xlsx")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar Excel
        </button>
      </div>

      <SelectFilters data={finalizadas} filters={filters} setFilters={setFilters} />

      {loading && <div className="flex justify-center py-8"><div className="spinner"></div></div>}
      {error && <div className="alert alert-error"><p>{error}</p></div>}

      {!loading && !error && (
        <div className="table-wrap">
          <div className="overflow-x-auto">
            <table className="stock-table w-full">
              <thead>
                <tr>
                  <th></th>
                  <th>Departamento</th>
                  <th>Localidad</th>
                  <th>Barrio</th>
                  <th>Finalizada sin Entregar</th>
                  <th>Entregada</th>
                  <th>Total</th>
                  <th></th>
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
                        const items = Object.values(locs).flatMap(b => Object.values(b).flat());
                        const fin = items.filter(i => i.Estado === "Finalizada sin Entregar").length;
                        const ent = items.filter(i => i.Estado === "Entregada").length;
                        return <><td>{fin}</td><td>{ent}</td><td>{items.length}</td><td></td></>;
                      })()}
                    </tr>

                    {expandedDeptos[depto] && Object.entries(locs).map(([loc, barriosObj]) => (
                      <React.Fragment key={loc}>
                        <tr className="row-loc" onClick={() => toggleLoc(depto, loc)} style={{ cursor: "pointer" }}>
                          <td style={{ paddingLeft: "2em" }}>{expandedLocs[depto + "|" + loc] ? "▼" : "▶"}</td>
                          <td></td>
                          <td colSpan={2} style={{ fontWeight: 500 }}>{loc}</td>
                          {(() => {
                            const items = Object.values(barriosObj).flat();
                            const fin = items.filter(i => i.Estado === "Finalizada sin Entregar").length;
                            const ent = items.filter(i => i.Estado === "Entregada").length;
                            return <><td>{fin}</td><td>{ent}</td><td>{items.length}</td><td></td></>;
                          })()}
                        </tr>

                        {expandedLocs[depto + "|" + loc] && Object.entries(barriosObj).map(([barrio, items], idx) => (
                          <tr key={barrio} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                            <td></td>
                            <td></td>
                            <td>{barrio}</td>
                            <td>
                              <button className="btn-detalle" onClick={() => setDetalle({ items, titulo: `${depto} - ${loc} - ${barrio}` })}>
                                Ver detalle
                              </button>
                            </td>
                            {(() => {
                              const fin = items.filter(i => i.Estado === "Finalizada sin Entregar").length;
                              const ent = items.filter(i => i.Estado === "Entregada").length;
                              return (
                                <>
                                  <td>{fin}</td>
                                  <td>{ent}</td>
                                  <td>{items.length}</td>
                                  <td>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadExcel(
                                          `${API_URL}/stock/exportar?departamento=${encodeURIComponent(depto)}&localidad=${encodeURIComponent(loc)}&barrio=${encodeURIComponent(barrio)}`,
                                          `Stock_${barrio.replace(/\s+/g, "_")}.xlsx`
                                        );
                                      }}
                                      className="text-blue-600 hover:text-blue-800 text-xs font-semibold underline"
                                    >
                                      Descargar
                                    </button>
                                  </td>
                                </>
                              );
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
        </div>
      )}

      {/* Modal de detalle */}
      {detalle && (
        <div
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setDetalle(null)}
        >
          <div style={{ background: "#fff", padding: "2rem", borderRadius: "10px", minWidth: "450px", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">Detalle: {detalle.titulo}</h3>
              <button
                onClick={() => downloadExcel(
                  `${API_URL}/stock/exportar?departamento=${encodeURIComponent(detalle.titulo.split(" - ")[0])}&localidad=${encodeURIComponent(detalle.titulo.split(" - ")[1])}&barrio=${encodeURIComponent(detalle.titulo.split(" - ")[2])}`,
                  `Stock_${detalle.titulo.split(" - ")[2].replace(/\s+/g, "_")}.xlsx`
                )}
                className="text-blue-600 hover:text-blue-800 text-xs font-semibold underline"
              >
                Descargar Excel
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1.5 text-slate-500 font-semibold text-[11px] uppercase">N°</th>
                  <th className="text-left px-2 py-1.5 text-slate-500 font-semibold text-[11px] uppercase">Beneficiario</th>
                  <th className="text-left px-2 py-1.5 text-slate-500 font-semibold text-[11px] uppercase">DNI</th>
                  <th className="text-left px-2 py-1.5 text-slate-500 font-semibold text-[11px] uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {detalle.items.map((item, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 text-slate-400">{idx + 1}</td>
                    <td className="px-2 py-1.5">{item.Beneficiario}</td>
                    <td className="px-2 py-1.5">{item.DNI}</td>
                    <td className="px-2 py-1.5">{item.Estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setDetalle(null)} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
