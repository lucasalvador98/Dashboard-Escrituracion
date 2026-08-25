import React, { useState, useMemo, useEffect } from "react";
import useDataLoader from "./hooks/useDataLoader";
import useUrlState from "./hooks/useUrlState";
import SelectFilters from "./components/SelectFilters";
import SlidePanel from "./components/SlidePanel";
import API_CONFIG from "./config-api";

const API_URL = API_CONFIG.BASE_URL_BACKEND;
const DETALLE_PER_PAGE = 10;

function downloadExcel(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Tabla de detalle paginada (reutilizable) ─────────────────────────────────

function DetalleTable({ items, columns, renderCell }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / DETALLE_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = items.slice((safePage - 1) * DETALLE_PER_PAGE, safePage * DETALLE_PER_PAGE);

  // Reset page when items change
  useEffect(() => setPage(1), [items]);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-slate-100">
              {columns.map(col => (
                <th key={col.key} className="px-2.5 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, idx) => {
              const globalIdx = (safePage - 1) * DETALLE_PER_PAGE + idx;
              return (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-2.5 py-2 border border-slate-200 text-slate-700">
                      {renderCell(col.key, item, globalIdx)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginado */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400 font-medium">
            {items.length} registros — Página {safePage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              ←
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (safePage <= 3) {
                pageNum = i + 1;
              } else if (safePage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = safePage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
                    safePage === pageNum
                      ? "bg-blue-600 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Columnas de detalle compartidas ──────────────────────────────────────────

const DETALLE_COLUMNS = [
  { key: "nro", label: "N°" },
  { key: "barrio", label: "Barrio" },
  { key: "mza", label: "Mza" },
  { key: "lote", label: "Lote" },
  { key: "nombre", label: "Beneficiario" },
  { key: "dni", label: "DNI" },
  { key: "tel", label: "Teléfono" },
  { key: "cotitular", label: "Cotitular" },
  { key: "dniCot", label: "DNI Cot." },
  { key: "telCot", label: "Tel. Cot." },
  { key: "asistencia", label: "Asistencia" },
  { key: "escribano", label: "Escribano" },
];

function extractDetalleFields(item) {
  return {
    nombre: item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? item.ApellidoYNombre ?? item.Nombre ?? item.nombre ?? "—",
    dni: item.DNI ?? item.dni ?? item.documento ?? "—",
    mza: item["Mza. Plano"] ?? item["Mza. Oficial"] ?? item.Mza ?? item.MZA ?? item.mza ?? "—",
    lote: item["Lote Plano"] ?? item["Lote oficial"] ?? item["Lote Oficial"] ?? item.Lote ?? item.LOTE ?? "—",
    cotitular: item["COTITULAR Nombre y Apellido"] ?? item["COTITULAR - Nombre y Apellido"] ?? item.Cotitular ?? "—",
    dniCot: item["COTITULAR DNI"] ?? item["COTITULAR - DNI"] ?? item.CotitularDNI ?? "—",
    telCot: item["COTITULAR Telefono"] ?? item["Tel. Cotitular"] ?? item.TelefonoCotitular ?? "—",
    tel: item.Telefono ?? item.telefono ?? "—",
    asistencia: item.Asistencia ?? item.ASISTENCIA ?? "—",
    barrio: item.Barrio ?? "—",
    escribano: item["Escribano Designado"] ?? item.Escribano ?? item.escribano ?? "—",
    contactoEscribano: item["Contacto Escribano"] ?? "",
  };
}

function renderDetalleCell(key, item, idx) {
  const f = extractDetalleFields(item);
  if (key === "nro") return <span className="text-slate-400 font-medium">{idx + 1}</span>;
  if (key === "nombre") return <span className="font-semibold text-slate-800">{f.nombre}</span>;
  if (key === "dni") return <span className="font-mono text-[11px]">{f.dni}</span>;
  return f[key] || "—";
}


export default function StockTab() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { state: tabState, set: setTab } = useUrlState({
    scope: "stock",
    defaults: { subtab: "finalizadas" },
    scopedKeys: ["subtab"],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Stock</h2>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {[
            { key: "finalizadas", label: "Finalizadas" },
            { key: "tramite", label: "En Trámite" },
          ].map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                tabState.subtab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setTab({ subtab: tab.key })}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {tabState.subtab === "finalizadas" ? (
        <StockFinalizadas data={data} loading={loading} error={error} />
      ) : (
        <StockTramite data={data} loading={loading} error={error} />
      )}
    </div>
  );
}


// ─── FINALIZADAS ──────────────────────────────────────────────────────────────

function StockFinalizadas({ data, loading, error }) {
  const { state: filters, set: setFilters, reset: resetFilters } = useUrlState({
    scope: "stock",
    defaults: { departamento: "Todos", localidad: "Todos", barrio: "Todos", estado: "Todos", escribano: "", dni: "" },
    sharedKeys: ["escribano", "estado"],
    replaceKeys: ["dni"],
  });

  const ESTADOS = ["Finalizada sin Entregar", "Entregada"];

  const finalizadas = useMemo(
    () => (Array.isArray(data) ? data.filter(i => ESTADOS.includes(i.Estado)) : []),
    [data]
  );

  const filtered = useMemo(() => {
    if (!Array.isArray(finalizadas)) return [];
    return finalizadas.filter(item => {
      if (filters.departamento && filters.departamento !== "Todos" && item.Departamento && !item.Departamento.toUpperCase().includes(filters.departamento.trim().toUpperCase())) return false;
      if (filters.localidad && filters.localidad !== "Todos" && item.Localidad && !item.Localidad.toUpperCase().includes(filters.localidad.trim().toUpperCase())) return false;
      if (filters.barrio && filters.barrio !== "Todos" && item.Barrio && !item.Barrio.toUpperCase().includes(filters.barrio.trim().toUpperCase())) return false;
      if (filters.estado && filters.estado !== "Todos" && item.Estado && !item.Estado.toUpperCase().includes(filters.estado.trim().toUpperCase())) return false;
      const itemDNI = item?.DNI ?? item?.dni ?? item?.documento ?? "";
      if (filters.dni && (!itemDNI || !String(itemDNI).includes(filters.dni))) return false;
      const itemEscribano = item?.["Escribano Designado"] ?? item?.Escribano ?? item?.escribano ?? "";
      if (filters.escribano && (!itemEscribano || !itemEscribano.toUpperCase().includes(filters.escribano.trim().toUpperCase()))) return false;
      return true;
    });
  }, [finalizadas, filters]);

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
      <SelectFilters data={finalizadas} filters={filters} setFilters={setFilters} resetFilters={resetFilters} />

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-8"></th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Localidad</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Barrio</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Fin. sin Entregar</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Entregada</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(grouped).map(([depto, locs]) => {
              const deptoItems = Object.values(locs).flatMap(b => Object.values(b).flat());
              const fin = deptoItems.filter(i => i.Estado === "Finalizada sin Entregar").length;
              const ent = deptoItems.filter(i => i.Estado === "Entregada").length;
              return (
                <React.Fragment key={depto}>
                  <tr className="bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleDepto(depto)}>
                    <td className="px-2 py-3 text-center text-slate-400">{expandedDeptos[depto] ? "▼" : "▶"}</td>
                    <td colSpan={3} className="px-4 py-3 font-bold text-slate-800">{depto}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-slate-600">{fin}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-slate-600">{ent}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">{deptoItems.length}</td>
                  </tr>

                  {expandedDeptos[depto] && Object.entries(locs).map(([loc, barriosObj]) => {
                    const locItems = Object.values(barriosObj).flat();
                    const locFin = locItems.filter(i => i.Estado === "Finalizada sin Entregar").length;
                    const locEnt = locItems.filter(i => i.Estado === "Entregada").length;
                    return (
                      <React.Fragment key={loc}>
                        <tr className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleLoc(depto, loc)}>
                          <td></td>
                          <td className="px-2 py-2.5 text-center text-slate-400 text-xs">{expandedLocs[depto + "|" + loc] ? "▼" : "▶"}</td>
                          <td colSpan={2} className="px-4 py-2.5 font-semibold text-slate-700">{loc}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-slate-600">{locFin}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-slate-600">{locEnt}</td>
                          <td className="px-4 py-2.5 text-center text-sm font-semibold text-slate-800">{locItems.length}</td>
                        </tr>

                        {expandedLocs[depto + "|" + loc] && Object.entries(barriosObj).map(([barrio, items]) => {
                          const barFin = items.filter(i => i.Estado === "Finalizada sin Entregar").length;
                          const barEnt = items.filter(i => i.Estado === "Entregada").length;
                          return (
                            <tr key={barrio} className="hover:bg-blue-50/40 transition-colors">
                              <td></td>
                              <td></td>
                              <td className="pl-8 text-sm text-slate-600">{barrio}</td>
                              <td className="px-4 py-2.5">
                                <button
                                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                  onClick={() => setDetalle({ titulo: `${depto} - ${loc} - ${barrio}`, items })}
                                >
                                  Ver detalle
                                </button>
                              </td>
                              <td className="px-4 py-2.5 text-center text-sm text-slate-600">{barFin}</td>
                              <td className="px-4 py-2.5 text-center text-sm text-slate-600">{barEnt}</td>
                              <td className="px-4 py-2.5 text-center text-sm font-semibold text-slate-800">{items.length}</td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Panel lateral de detalle */}
      <SlidePanel isOpen={!!detalle} onClose={() => setDetalle(null)} title={detalle ? detalle.titulo : ""}>
        {detalle && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 font-medium">TU CASA TU ESCRITURA — Ley 9811</p>
              <button
                onClick={() => downloadExcel(
                  `${API_URL}/stock/exportar?departamento=${encodeURIComponent(detalle.titulo.split(" - ")[0])}&localidad=${encodeURIComponent(detalle.titulo.split(" - ")[1])}&barrio=${encodeURIComponent(detalle.titulo.split(" - ")[2])}`,
                  `Stock_${detalle.titulo.split(" - ")[2].replace(/\s+/g, "_")}.xlsx`
                )}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Descargar Excel
              </button>
            </div>

            <DetalleTable
              items={detalle.items}
              columns={DETALLE_COLUMNS}
              renderCell={renderDetalleCell}
            />
          </div>
        )}
      </SlidePanel>
    </>
  );
}


// ─── EN TRÁMITE ───────────────────────────────────────────────────────────────

function StockTramite({ data, loading, error }) {
  const { state: filters, set: setFilters, reset: resetFilters } = useUrlState({
    scope: "stock",
    defaults: { departamento: "Todos", localidad: "Todos", barrio: "Todos", estado: "Todos", escribano: "", dni: "" },
    sharedKeys: ["escribano", "estado"],
    replaceKeys: ["dni"],
  });

  const tramite = useMemo(
    () => (Array.isArray(data) ? data.filter(i => (i.Estado || "").trim() === "En Trámite") : []),
    [data]
  );

  const filtered = useMemo(() => {
    if (!Array.isArray(tramite)) return [];
    return tramite.filter(item => {
      if (filters.departamento && filters.departamento !== "Todos" && item.Departamento && !item.Departamento.toUpperCase().includes(filters.departamento.trim().toUpperCase())) return false;
      if (filters.localidad && filters.localidad !== "Todos" && item.Localidad && !item.Localidad.toUpperCase().includes(filters.localidad.trim().toUpperCase())) return false;
      if (filters.barrio && filters.barrio !== "Todos" && item.Barrio && !item.Barrio.toUpperCase().includes(filters.barrio.trim().toUpperCase())) return false;
      if (filters.estado && filters.estado !== "Todos" && item.Estado && !item.Estado.toUpperCase().includes(filters.estado.trim().toUpperCase())) return false;
      const itemDNI = item?.DNI ?? item?.dni ?? item?.documento ?? "";
      if (filters.dni && (!itemDNI || !String(itemDNI).includes(filters.dni))) return false;
      const itemEscribano = item?.["Escribano Designado"] ?? item?.Escribano ?? item?.escribano ?? "";
      if (filters.escribano && (!itemEscribano || !itemEscribano.toUpperCase().includes(filters.escribano.trim().toUpperCase()))) return false;
      return true;
    });
  }, [tramite, filters]);

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

  // Pre-cargar datos del escribano cuando se abre el detalle
  useEffect(() => {
    if (!detalle || !detalle.items || !detalle.items.length) return;
    const escribanos = [...new Set(detalle.items.map(i => i["Escribano Designado"] ?? i.Escribano ?? ""))];
    if (escribanos.length === 1 && escribanos[0]) {
      const contacto = detalle.items[0]["Contacto Escribano"] || "";
      setFirmaForm(p => ({
        ...p,
        nombre: p.nombre || escribanos[0],
        tel: p.tel || String(contacto),
      }));
    }
  }, [detalle]);

  function toggleDepto(d) { setExpandedDeptos(p => ({ ...p, [d]: !p[d] })); }
  function toggleLoc(d, l) { setExpandedLocs(p => ({ ...p, [d + "|" + l]: !p[d + "|" + l] })); }

  if (loading) return <div className="flex justify-center py-8"><div className="spinner"></div></div>;
  if (error) return <div className="alert alert-error"><p>{error}</p></div>;

  return (
    <>
      <SelectFilters data={tramite} filters={filters} setFilters={setFilters} resetFilters={resetFilters} />

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-8"></th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Localidad</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Barrio</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">En Trámite</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(grouped).map(([depto, locs]) => {
              const deptoCount = Object.values(locs).flatMap(b => Object.values(b).flat()).length;
              return (
                <React.Fragment key={depto}>
                  <tr className="bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleDepto(depto)}>
                    <td className="px-2 py-3 text-center text-slate-400">{expandedDeptos[depto] ? "▼" : "▶"}</td>
                    <td colSpan={3} className="px-4 py-3 font-bold text-slate-800">{depto}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">{deptoCount}</td>
                  </tr>

                  {expandedDeptos[depto] && Object.entries(locs).map(([loc, barriosObj]) => {
                    const locCount = Object.values(barriosObj).flat().length;
                    return (
                      <React.Fragment key={loc}>
                        <tr className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleLoc(depto, loc)}>
                          <td></td>
                          <td className="px-2 py-2.5 text-center text-slate-400 text-xs">{expandedLocs[depto + "|" + loc] ? "▼" : "▶"}</td>
                          <td colSpan={2} className="px-4 py-2.5 font-semibold text-slate-700">{loc}</td>
                          <td className="px-4 py-2.5 text-center text-sm font-semibold text-slate-800">{locCount}</td>
                        </tr>

                        {expandedLocs[depto + "|" + loc] && Object.entries(barriosObj).map(([barrio, items]) => (
                          <tr key={barrio} className="hover:bg-blue-50/40 transition-colors">
                            <td></td>
                            <td></td>
                            <td className="pl-8 text-sm text-slate-600">{barrio}</td>
                            <td className="px-4 py-2.5">
                              <button
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                onClick={() => setDetalle({ titulo: `${depto} - ${loc} - ${barrio}`, items, barrio, loc, depto })}
                              >
                                Ver detalle
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-center text-sm font-semibold text-slate-800">{items.length}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Panel lateral FIRMA */}
      <SlidePanel isOpen={!!detalle} onClose={() => setDetalle(null)} title={detalle ? `FIRMA — ${detalle.titulo}` : ""}>
        {detalle && (
          <div className="space-y-4">
            {/* Formulario de firma */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Datos del Evento de Firma</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Fecha</label>
                  <input type="date" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={firmaForm.fecha} onChange={e => setFirmaForm(p => ({ ...p, fecha: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Hora</label>
                  <input type="time" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={firmaForm.hora} onChange={e => setFirmaForm(p => ({ ...p, hora: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500">Lugar</label>
                <input type="text" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: SALON COOP. 22 DE MAYO" value={firmaForm.lugar} onChange={e => setFirmaForm(p => ({ ...p, lugar: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Escribano</label>
                  <input type="text" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nombre y Apellido" value={firmaForm.nombre} onChange={e => setFirmaForm(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Teléfono</label>
                  <input type="text" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={firmaForm.tel} onChange={e => setFirmaForm(p => ({ ...p, tel: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500">Mail</label>
                <input type="email" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={firmaForm.mail} onChange={e => setFirmaForm(p => ({ ...p, mail: e.target.value }))} />
              </div>
            </div>

            {/* Botón descargar FIRMA */}
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  departamento: detalle.depto || "",
                  localidad: detalle.loc || "",
                  barrio: detalle.barrio || "",
                  fecha: firmaForm.fecha, hora: firmaForm.hora, lugar: firmaForm.lugar,
                  escribano_nombre: firmaForm.nombre, escribano_tel: firmaForm.tel, escribano_mail: firmaForm.mail,
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

            {/* Tabla paginada */}
            <DetalleTable
              items={detalle.items}
              columns={DETALLE_COLUMNS}
              renderCell={renderDetalleCell}
            />
          </div>
        )}
      </SlidePanel>
    </>
  );
}
