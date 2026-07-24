import React, { useState, useMemo } from "react";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import SelectFilters from "./components/SelectFilters";
import SlidePanel from "./components/SlidePanel";
import API_CONFIG from "./config-api";

const API_URL = API_CONFIG.BASE_URL_BACKEND;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
  const [activeSubTab, setActiveSubTab] = useState("finalizadas"); // "finalizadas" | "tramite"

  return (
    <div className="space-y-4">
      {/* Header + sub-tabs */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
          Stock
        </h2>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
              activeSubTab === "finalizadas"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveSubTab("finalizadas")}
          >
            Finalizadas
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
              activeSubTab === "tramite"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveSubTab("tramite")}
          >
            En Trámite
          </button>
        </div>
      </div>

      {activeSubTab === "finalizadas" ? (
        <StockFinalizadas data={data} loading={loading} error={error} />
      ) : (
        <StockTramite data={data} loading={loading} error={error} />
      )}
    </div>
  );
}


// ─── FINALIZADAS ──────────────────────────────────────────────────────────────

function StockFinalizadas({ data, loading, error }) {
  const { filters, setFilters, applyFilters } = useFilters({
    departamento: "Todos", localidad: "Todos", barrio: "Todos",
    estado: "Todos", escribano: "", dni: "",
  });

  const ESTADOS_FINALIZADAS = ["Finalizada sin Entregar", "Entregada"];

  const finalizadas = useMemo(
    () => (Array.isArray(data) ? data.filter(i => ESTADOS_FINALIZADAS.includes(i.Estado)) : []),
    [data]
  );

  const filtered = useMemo(() => applyFilters(finalizadas), [finalizadas, filters, applyFilters]);

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

  if (loading) return <div className="flex justify-center py-8"><div className="spinner"></div></div>;
  if (error) return <div className="alert alert-error"><p>{error}</p></div>;

  return (
    <>
      <SelectFilters data={finalizadas} filters={filters} setFilters={setFilters} />

      <div className="table-wrap overflow-x-auto">
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
                          <button className="btn-detalle" onClick={() => setDetalle({ titulo: `${depto} - ${loc} - ${barrio}`, items })}>
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

      {/* Panel lateral de detalle */}
      <SlidePanel isOpen={!!detalle} onClose={() => setDetalle(null)} title={detalle ? detalle.titulo : ""}>
        {detalle && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500 font-medium">TU CASA TU ESCRITURA - Ley 9811</p>
              <button
                onClick={() => downloadExcel(
                  `${API_URL}/stock/exportar?departamento=${encodeURIComponent(detalle.titulo.split(" - ")[0])}&localidad=${encodeURIComponent(detalle.titulo.split(" - ")[1])}&barrio=${encodeURIComponent(detalle.titulo.split(" - ")[2])}`,
                  `Stock_${detalle.titulo.split(" - ")[2].replace(/\s+/g, "_")}.xlsx`
                )}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Descargar Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#d9e1f2" }}>
                    <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 text-center">N°</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 text-center">BARRIO</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 text-center">MZA</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 text-center">LOTE</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 text-center">APELLIDO Y NOMBRE</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 text-center">DNI</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 text-center">Teléfono</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 text-center">COTITULAR</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 text-center">DNI Cot.</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 text-center">Tel. Cot.</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-300 text-center">ASISTENCIA</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.items.map((item, idx) => {
                    const nombre = item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? item.ApellidoYNombre ?? item.Nombre ?? item.nombre;
                    const dni = item.DNI ?? item.dni ?? item.documento;
                    const mza = item["Mza. Plano"] ?? item["Mza. Oficial"] ?? item.Mza ?? item.MZA ?? item.mza;
                    const lote = item["Lote Plano"] ?? item["Lote oficial"] ?? item["Lote Oficial"] ?? item.Lote ?? item.LOTE;
                    const cotitular = item["COTITULAR Nombre y Apellido"] ?? item["COTITULAR - Nombre y Apellido"] ?? item.Cotitular;
                    const dniCot = item["COTITULAR DNI"] ?? item["COTITULAR - DNI"] ?? item.CotitularDNI;
                    const telCot = item["COTITULAR Telefono"] ?? item["Tel. Cotitular"] ?? item.TelefonoCotitular;
                    return (
                      <tr key={idx} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-3 py-2 text-center border border-slate-200">{idx + 1}</td>
                        <td className="px-3 py-2 text-center border border-slate-200">{item.Barrio || ""}</td>
                        <td className="px-3 py-2 text-center border border-slate-200">{mza || "—"}</td>
                        <td className="px-3 py-2 text-center border border-slate-200">{lote || "—"}</td>
                        <td className="px-3 py-2 text-center border border-slate-200 font-semibold text-slate-800">{nombre || "—"}</td>
                        <td className="px-3 py-2 text-center border border-slate-200 font-mono text-xs">{dni || "—"}</td>
                        <td className="px-3 py-2 text-center border border-slate-200">{item.Telefono || item.telefono || "—"}</td>
                        <td className="px-3 py-2 text-center border border-slate-200">{cotitular || "—"}</td>
                        <td className="px-3 py-2 text-center border border-slate-200">{dniCot || "—"}</td>
                        <td className="px-3 py-2 text-center border border-slate-200">{telCot || "—"}</td>
                        <td className="px-3 py-2 text-center border border-slate-200">{item.Asistencia || item.ASISTENCIA || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SlidePanel>
    </>
  );
}


// ─── EN TRÁMITE ───────────────────────────────────────────────────────────────

function StockTramite({ data, loading, error }) {
  const { filters, setFilters, applyFilters } = useFilters({
    departamento: "Todos", localidad: "Todos", barrio: "Todos",
    estado: "Todos", escribano: "", dni: "",
  });

  const tramite = useMemo(
    () => (Array.isArray(data) ? data.filter(i => (i.Estado || "").trim() === "En Trámite") : []),
    [data]
  );

  const filtered = useMemo(() => applyFilters(tramite), [tramite, filters, applyFilters]);

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
  const [firmaForm, setFirmaForm] = useState({ fecha: "", hora: "", lugar: "", nombre: "", tel: "", mail: "" });

  function toggleDepto(d) { setExpandedDeptos(p => ({ ...p, [d]: !p[d] })); }
  function toggleLoc(d, l) { setExpandedLocs(p => ({ ...p, [d + "|" + l]: !p[d + "|" + l] })); }

  if (loading) return <div className="flex justify-center py-8"><div className="spinner"></div></div>;
  if (error) return <div className="alert alert-error"><p>{error}</p></div>;

  return (
    <>
      <SelectFilters data={tramite} filters={filters} setFilters={setFilters} />

      <div className="table-wrap overflow-x-auto">
        <table className="stock-table w-full">
          <thead>
            <tr>
              <th></th>
              <th>Departamento</th>
              <th>Localidad</th>
              <th>Barrio</th>
              <th>En Trámite</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([depto, locs]) => (
              <React.Fragment key={depto}>
                <tr className="row-depto" onClick={() => toggleDepto(depto)} style={{ cursor: "pointer" }}>
                  <td>{expandedDeptos[depto] ? "▼" : "▶"}</td>
                  <td colSpan={2} style={{ fontWeight: 600 }}>{depto}</td>
                  <td></td>
                  <td>{Object.values(locs).flatMap(b => Object.values(b).flat()).length}</td>
                </tr>

                {expandedDeptos[depto] && Object.entries(locs).map(([loc, barriosObj]) => (
                  <React.Fragment key={loc}>
                    <tr className="row-loc" onClick={() => toggleLoc(depto, loc)} style={{ cursor: "pointer" }}>
                      <td style={{ paddingLeft: "2em" }}>{expandedLocs[depto + "|" + loc] ? "▼" : "▶"}</td>
                      <td></td>
                      <td colSpan={2} style={{ fontWeight: 500 }}>{loc}</td>
                      <td>{Object.values(barriosObj).flat().length}</td>
                    </tr>

                    {expandedLocs[depto + "|" + loc] && Object.entries(barriosObj).map(([barrio, items], idx) => (
                      <tr key={barrio} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                        <td></td>
                        <td></td>
                        <td>{barrio}</td>
                        <td>
                          <button className="btn-detalle" onClick={() => setDetalle({ titulo: `${depto} - ${loc} - ${barrio}`, items, barrio, loc, depto })}>
                            Ver detalle
                          </button>
                        </td>
                        <td>{items.length}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Panel lateral FIRMA */}
      <SlidePanel isOpen={!!detalle} onClose={() => setDetalle(null)} title={detalle ? `FIRMA — ${detalle.titulo}` : ""}>
        {detalle && (
          <div className="space-y-4">
            {/* Formulario de firma */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-700 uppercase">Datos del Evento de Firma</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Fecha</label>
                  <input type="date" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg" value={firmaForm.fecha} onChange={e => setFirmaForm(p => ({ ...p, fecha: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Hora</label>
                  <input type="time" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg" value={firmaForm.hora} onChange={e => setFirmaForm(p => ({ ...p, hora: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Lugar</label>
                <input type="text" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg" placeholder="Ej: SALON COOP. 22 DE MAYO" value={firmaForm.lugar} onChange={e => setFirmaForm(p => ({ ...p, lugar: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Escribano</label>
                  <input type="text" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg" placeholder="Nombre y Apellido" value={firmaForm.nombre} onChange={e => setFirmaForm(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Teléfono</label>
                  <input type="text" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg" value={firmaForm.tel} onChange={e => setFirmaForm(p => ({ ...p, tel: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Mail</label>
                <input type="email" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg" value={firmaForm.mail} onChange={e => setFirmaForm(p => ({ ...p, mail: e.target.value }))} />
              </div>
            </div>

            {/* Botón descargar FIRMA */}
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  departamento: detalle.depto || "",
                  localidad: detalle.loc || "",
                  barrio: detalle.barrio || "",
                  fecha: firmaForm.fecha,
                  hora: firmaForm.hora,
                  lugar: firmaForm.lugar,
                  escribano_nombre: firmaForm.nombre,
                  escribano_tel: firmaForm.tel,
                  escribano_mail: firmaForm.mail,
                });
                downloadExcel(`${API_URL}/stock/firma/exportar?${params}`, `Firma_${detalle.barrio.replace(/\s+/g, "_")}.xlsx`);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar Formato FIRMA
            </button>

            {/* Preview de beneficiarios */}
            <div className="text-xs font-medium text-slate-500">{detalle.items.length} beneficiarios en este barrio</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-1.5 text-left font-bold text-slate-500">#</th>
                    <th className="px-2 py-1.5 text-left font-bold text-slate-500">Beneficiario</th>
                    <th className="px-2 py-1.5 text-left font-bold text-slate-500">DNI</th>
                    <th className="px-2 py-1.5 text-left font-bold text-slate-500">Mza</th>
                    <th className="px-2 py-1.5 text-left font-bold text-slate-500">Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.items.map((item, idx) => {
                    const nombre = item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? item.ApellidoYNombre;
                    const mza = item["Mza. Plano"] ?? item["Mza. Oficial"] ?? item.Mza;
                    const lote = item["Lote Plano"] ?? item["Lote oficial"] ?? item.Lote;
                    return (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-2 py-1">{idx + 1}</td>
                        <td className="px-2 py-1 font-medium">{nombre || "—"}</td>
                        <td className="px-2 py-1 font-mono">{item.DNI || "—"}</td>
                        <td className="px-2 py-1">{mza || "—"}</td>
                        <td className="px-2 py-1">{lote || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SlidePanel>
    </>
  );
}
