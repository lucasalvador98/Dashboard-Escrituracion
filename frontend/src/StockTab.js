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

// Fetch datos reales desde el Excel vía API
async function fetchStockData({ departamento, localidad, barrio }) {
  const params = new URLSearchParams();
  if (barrio) params.set("barrio", barrio);
  const url = `${API_URL}/stock/datos${params.toString() ? "?" + params.toString() : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al cargar datos de stock");
  return res.json();
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

  function abrirDetalle(depto, loc, barrio, items) {
    setDetalle({ titulo: `${depto} - ${loc} - ${barrio}`, items, loading: true, stockData: null, depto, loc, barrio });
    fetchStockData({ departamento: depto, localidad: loc, barrio })
      .then(data => setDetalle(prev => prev ? { ...prev, stockData: data, loading: false } : prev))
      .catch(() => setDetalle(prev => prev ? { ...prev, stockData: null, loading: false } : prev));
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
          Stock — Finalizadas
        </h2>
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
                        return <><td>{fin}</td><td>{ent}</td><td>{items.length}</td></>;
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
                            return <><td>{fin}</td><td>{ent}</td><td>{items.length}</td></>;
                          })()}
                        </tr>

                        {expandedLocs[depto + "|" + loc] && Object.entries(barriosObj).map(([barrio, items], idx) => (
                          <tr key={barrio} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                            <td></td>
                            <td></td>
                            <td>{barrio}</td>
                            <td>
                              <button className="btn-detalle" onClick={() => abrirDetalle(depto, loc, barrio, items)}>
                                Ver detalle
                              </button>
                            </td>
                            {(() => {
                              const fin = items.filter(i => i.Estado === "Finalizada sin Entregar").length;
                              const ent = items.filter(i => i.Estado === "Entregada").length;
                              return <><td>{fin}</td><td>{ent}</td><td>{items.length}</td></>;
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

      {/* Modal de detalle — MISMO FORMATO que el Excel modelo */}
      {detalle && (
        <div
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setDetalle(null)}
        >
          <div style={{ background: "#fff", padding: "2rem", borderRadius: "12px", minWidth: "90vw", maxWidth: "1200px", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  {detalle.titulo}
                </h3>
              <p className="text-sm text-slate-500 font-medium">
                    TU CASA TU ESCRITURA - Ley 9811
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadExcel(
                      `${API_URL}/stock/exportar?departamento=${encodeURIComponent(detalle.titulo.split(" - ")[0])}&localidad=${encodeURIComponent(detalle.titulo.split(" - ")[1])}&barrio=${encodeURIComponent(detalle.titulo.split(" - ")[2])}`,
                      `Stock_${detalle.titulo.split(" - ")[2].replace(/\s+/g, "_")}.xlsx`
                    )}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Descargar Excel
                  </button>
                  <button onClick={() => setDetalle(null)} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all">
                    Cerrar
                  </button>
                </div>
              </div>

            <div className="table-wrap">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#d9e1f2" }}>
                      <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 whitespace-nowrap text-center">N°</th>
                      <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 whitespace-nowrap text-center">BARRIO</th>
                      <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 whitespace-nowrap text-center">MZA</th>
                      <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 whitespace-nowrap text-center">LOTE</th>
                      <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 whitespace-nowrap text-center">APELLIDO Y NOMBRE</th>
                      <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 whitespace-nowrap text-center">DNI</th>
                      <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 whitespace-nowrap text-center">Teléfono</th>
                      <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 whitespace-nowrap text-center">COTITULAR</th>
                      <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 whitespace-nowrap text-center">DNI Cotitular</th>
                      <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 whitespace-nowrap text-center">Tel. Cotitular</th>
                      <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 whitespace-nowrap text-center">ASISTENCIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.loading ? (
                      <tr>
                        <td colSpan={11} className="text-center py-8 text-slate-400 text-sm">
                          Cargando datos del Excel…
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const hasStock = Array.isArray(detalle.stockData) && detalle.stockData.length > 0;
                        const datos = hasStock ? detalle.stockData : detalle.items;
                        return datos.map((item, idx) => {
                        const fromExcel = hasStock;
                        return (
                        <tr key={idx} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-3 py-2 text-sm text-center border border-slate-200">{idx + 1}</td>
                          <td className="px-3 py-2 text-sm text-center border border-slate-200">{fromExcel ? (item.Barrio || "") : (item.Barrio || "")}</td>
                          <td className="px-3 py-2 text-sm text-center border border-slate-200">{fromExcel ? (item.Mza || "") : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 text-sm text-center border border-slate-200">{fromExcel ? (item.Lote || "") : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 text-sm text-center border border-slate-200 font-semibold text-slate-800">{(item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? item.Nombre) || <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 text-sm text-center border border-slate-200 font-mono text-xs">{(item.DNI ?? item.dni ?? item.documento) || <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 text-sm text-center border border-slate-200">{fromExcel ? (item.Telefono || "") : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 text-sm text-center border border-slate-200">{fromExcel ? (item.Cotitular || "") : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 text-sm text-center border border-slate-200">{fromExcel ? (item.CotitularDNI || "") : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 text-sm text-center border border-slate-200">{fromExcel ? (item.TelefonoCotitular || "") : <span className="text-slate-300">—</span>}</td>
                          <td className="px-3 py-2 text-sm text-center border border-slate-200">{fromExcel ? (item.Asistencia || "") : <span className="text-slate-300">—</span>}</td>
                        </tr>
                        );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
