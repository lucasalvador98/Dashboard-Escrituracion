import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import SelectFilters from "./components/SelectFilters";
import API_CONFIG from "./config-api";

const API_URL = API_CONFIG.BASE_URL_BACKEND;

const ESTADOS_FINALIZADAS = ["Finalizada sin Entregar", "Entregada"];

// ─── Columnas del Excel de beneficiarios ────────────────────────────────────

const BENEF_COLUMNS = [
  { key: "NRO", label: "N°" },
  { key: "BARRIO", label: "BARRIO" },
  { key: "MZA", label: "MZA" },
  { key: "LOTE", label: "LOTE" },
  { key: "APELLIDO_Y_NOMBRE", label: "APELLIDO Y NOMBRE" },
  { key: "DNI", label: "DNI" },
  { key: "TELEFONO", label: "Teléfono" },
  { key: "COTITULAR_NOMBRE", label: "COTITULAR" },
  { key: "COTITULAR_DNI", label: "DNI Cotitular" },
  { key: "TELEFONO_COTITULAR", label: "Tel. Cotitular" },
];

// ─── Componente principal ───────────────────────────────────────────────────

export default function StockTab() {
  // ── Datos de escrituración (para la jerarquía) ──
  const { data: escritData, loading: loadingEscrit, error: errorEscrit } = useDataLoader("escrituracion");
  const { filters, setFilters, applyFilters, derivedOptions } = useFilters({
    departamento: "Todos",
    localidad: "Todos",
    barrio: "Todos",
    estado: "Todos",
    escribano: "",
    dni: ""
  });

  // Filtrar: solo finalizadas
  const escritFinalizadas = useMemo(
    () => (Array.isArray(escritData) ? escritData.filter(i => ESTADOS_FINALIZADAS.includes(i.Estado)) : []),
    [escritData]
  );

  const filtered = useMemo(() => applyFilters(escritFinalizadas), [escritFinalizadas, filters, applyFilters]);

  // ── Datos del Excel (beneficiarios) ──
  const [benefData, setBenefData] = useState([]);
  const [loadingBenef, setLoadingBenef] = useState(true);
  const [errorBenef, setErrorBenef] = useState(null);
  const [searchBenef, setSearchBenef] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingBenef(true);
    axios.get(`${API_URL}/stock-personas`)
      .then(res => { if (!cancelled) { setBenefData(Array.isArray(res.data?.data) ? res.data.data : []); setLoadingBenef(false); } })
      .catch(err => { if (!cancelled) { setErrorBenef(err?.message || "Error"); setLoadingBenef(false); } });
    return () => { cancelled = true; };
  }, []);

  const benefFiltered = searchBenef
    ? benefData.filter(item => Object.values(item).some(v => v && String(v).toLowerCase().includes(searchBenef.toLowerCase())))
    : benefData;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = `${API_URL}/stock-personas/exportar`;
    a.download = "VILLA CARLOS PAZ (TU CASA TU ESCRITURA- ENTREGA).xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Agrupación jerárquica ──
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

  function toggleDepto(d) { setExpandedDeptos(prev => ({ ...prev, [d]: !prev[d] })); }
  function toggleLoc(d, l) { setExpandedLocs(prev => ({ ...prev, [d + "|" + l]: !prev[d + "|" + l] })); }
  function showDetalle(items, titulo) { setDetalle({ items, titulo }); }
  function closeDetalle() { setDetalle(null); }

  return (
    <div className="space-y-10">
      {/* ═══════════════════════════════════════════════════════════
         SECCIÓN 1: Resumen por Departamento / Localidad / Barrio
         ═══════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4">
          Resumen por Departamento / Localidad / Barrio
        </h2>

        <SelectFilters data={escritFinalizadas} filters={filters} setFilters={setFilters} />

        {loadingEscrit && <div className="flex justify-center py-8"><div className="spinner"></div></div>}
        {errorEscrit && <div className="alert alert-error"><p>{errorEscrit}</p></div>}

        {!loadingEscrit && !errorEscrit && (
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
                          const items = Object.values(locs).flatMap(barrioObj => Object.values(barrioObj).flat());
                          const finalizadas = items.filter(i => i.Estado === "Finalizada sin Entregar").length;
                          const entregadas = items.filter(i => i.Estado === "Entregada").length;
                          return (
                            <>
                              <td>{finalizadas || 0}</td>
                              <td>{entregadas || 0}</td>
                              <td>{items.length}</td>
                            </>
                          );
                        })()}
                      </tr>

                      {expandedDeptos[depto] && Object.entries(locs).map(([loc, barriosObj]) => (
                        <React.Fragment key={loc}>
                          <tr className="row-loc" onClick={() => toggleLoc(depto, loc)} style={{ cursor: "pointer" }}>
                            <td style={{ paddingLeft: '2em' }}>{expandedLocs[depto + "|" + loc] ? "▼" : "▶"}</td>
                            <td></td>
                            <td colSpan={2} style={{ fontWeight: 500 }}>{loc}</td>
                            {(() => {
                              const items = Object.values(barriosObj).flat();
                              const finalizadas = items.filter(i => i.Estado === "Finalizada sin Entregar").length;
                              const entregadas = items.filter(i => i.Estado === "Entregada").length;
                              return (
                                <>
                                  <td>{finalizadas || 0}</td>
                                  <td>{entregadas || 0}</td>
                                  <td>{items.length}</td>
                                </>
                              );
                            })()}
                          </tr>

                          {expandedLocs[depto + "|" + loc] && Object.entries(barriosObj).map(([barrio, items], idx) => (
                            <tr key={barrio} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                              <td></td>
                              <td></td>
                              <td>{barrio}</td>
                              <td>
                                <button className="btn-detalle" onClick={() => showDetalle(items, `${depto} - ${loc} - ${barrio}`)}>
                                  Ver detalle
                                </button>
                              </td>
                              {(() => {
                                const finalizadas = items.filter(i => i.Estado === "Finalizada sin Entregar").length;
                                const entregadas = items.filter(i => i.Estado === "Entregada").length;
                                return (
                                  <>
                                    <td>{finalizadas || 0}</td>
                                    <td>{entregadas || 0}</td>
                                    <td>{items.length}</td>
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
      </section>

      {/* ═══════════════════════════════════════════════════════════
         SECCIÓN 2: Beneficiarios (Excel VILLA CARLOS PAZ)
         ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              VILLA CARLOS PAZ — Beneficiarios
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              TU CASA TU ESCRITURA - Ley 9811
            </p>
          </div>
          <button
            onClick={handleDownload}
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

        <div className="w-full max-w-sm mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, barrio..."
            value={searchBenef}
            onChange={(e) => setSearchBenef(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm"
          />
        </div>

        {loadingBenef && <div className="flex justify-center py-8"><div className="spinner"></div></div>}
        {errorBenef && <div className="alert alert-error"><p>{errorBenef}</p></div>}

        {!loadingBenef && !errorBenef && (
          <div className="table-wrap">
            <div className="overflow-x-auto">
              <table className="stock-table w-full">
                <thead>
                  <tr>
                    {BENEF_COLUMNS.map(col => (
                      <th key={col.key} className="whitespace-nowrap text-[11px]">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benefFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={BENEF_COLUMNS.length} className="text-center py-12 text-slate-400 font-medium">
                        No se encontraron beneficiarios
                      </td>
                    </tr>
                  ) : (
                    benefFiltered.map((item, idx) => (
                      <tr key={item.NRO ?? idx} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                        {BENEF_COLUMNS.map(col => (
                          <td key={col.key} className="text-sm">{item[col.key] ?? ""}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-200/60 text-sm text-slate-500">
              <span className="font-medium">
                {benefFiltered.length} beneficiario{benefFiltered.length !== 1 ? "s" : ""}
                {searchBenef && benefFiltered.length !== benefData.length ? ` (filtrado de ${benefData.length})` : ""}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════
         Modal de detalle (para la sección jerárquica)
         ═══════════════════════════════════════════════════════════ */}
      {detalle && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeDetalle}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '10px', minWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-800 mb-4">Detalle: {detalle.titulo}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1 text-slate-500 font-semibold">DNI</th>
                  <th className="text-left px-2 py-1 text-slate-500 font-semibold">Beneficiario</th>
                  <th className="text-left px-2 py-1 text-slate-500 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {detalle.items.map((item, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-2 py-1.5">{item.DNI}</td>
                    <td className="px-2 py-1.5">{item.Beneficiario}</td>
                    <td className="px-2 py-1.5">{item.Estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={closeDetalle} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
