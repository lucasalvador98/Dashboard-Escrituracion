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
  const { state: filters, set: setFilters, reset: resetFilters } = useUrlState({
    scope: "stock",
    defaults: { departamento: "Todos", localidad: "Todos", barrio: "Todos", estado: "Todos", escribano: "", dni: "" },
    sharedKeys: ["escribano", "estado"],
    replaceKeys: ["dni"],
  });

  const [formato, setFormato] = useState("finalizadas");
  const [detalle, setDetalle] = useState(null);
  const [expandedDeptos, setExpandedDeptos] = useState({});
  const [expandedLocs, setExpandedLocs] = useState({});

  const allData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filtered = useMemo(() => {
    return allData.filter(item => {
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
  }, [allData, filters]);

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

  const estadoCount = useMemo(() => {
    const counts = {};
    filtered.forEach(item => {
      const est = (item.Estado || "").toString().trim() || "Sin estado";
      counts[est] = (counts[est] || 0) + 1;
    });
    return counts;
  }, [filtered]);

  const allEstados = useMemo(() => Object.keys(estadoCount).sort(), [estadoCount]);

  function toggleDepto(d) { setExpandedDeptos(p => ({ ...p, [d]: !p[d] })); }
  function toggleLoc(d, l) { setExpandedLocs(p => ({ ...p, [d + "|" + l]: !p[d + "|" + l] })); }

  function buildExportUrl() {
    const params = new URLSearchParams({ formato });
    if (filters.departamento && filters.departamento !== "Todos") params.set("departamento", filters.departamento);
    if (filters.localidad && filters.localidad !== "Todos") params.set("localidad", filters.localidad);
    if (filters.barrio && filters.barrio !== "Todos") params.set("barrio", filters.barrio);
    return `${API_URL}/stock/planillas?${params.toString()}`;
  }

  if (loading) return <div className="flex justify-center py-8"><div className="spinner"></div></div>;
  if (error) return <div className="alert alert-error"><p>{error}</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Stock</h2>
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formato}
            onChange={e => setFormato(e.target.value)}
          >
            <option value="finalizadas">Formato: Finalizadas</option>
            <option value="en-tramite">Formato: En Trámite</option>
            <option value="firma">Formato: Firma</option>
          </select>
          <button
            onClick={() => downloadExcel(buildExportUrl(), `Stock_${formato}.xlsx`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar
          </button>
        </div>
      </div>

      <SelectFilters data={allData} filters={filters} setFilters={setFilters} resetFilters={resetFilters} />

      <div className="flex flex-wrap gap-2 mb-2">
        {allEstados.map(est => (
          <span key={est} className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-full">
            {est}: {estadoCount[est]}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-8"></th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Departamento</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Localidad</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Barrio</th>
              {allEstados.map(est => (
                <th key={est} className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{est}</th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(grouped).map(([depto, locs]) => {
              const deptoItems = Object.values(locs).flatMap(b => Object.values(b).flat());
              const deptoEstadoCount = {};
              deptoItems.forEach(i => {
                const est = (i.Estado || "").toString().trim() || "Sin estado";
                deptoEstadoCount[est] = (deptoEstadoCount[est] || 0) + 1;
              });
              return (
                <React.Fragment key={depto}>
                  <tr className="bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleDepto(depto)}>
                    <td className="px-2 py-3 text-center text-slate-400">{expandedDeptos[depto] ? "▼" : "▶"}</td>
                    <td colSpan={3} className="px-4 py-3 font-bold text-slate-800">{depto}</td>
                    {allEstados.map(est => (
                      <td key={est} className="px-4 py-3 text-center text-sm font-semibold text-slate-600">{deptoEstadoCount[est] || 0}</td>
                    ))}
                    <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">{deptoItems.length}</td>
                  </tr>

                  {expandedDeptos[depto] && Object.entries(locs).map(([loc, barriosObj]) => {
                    const locItems = Object.values(barriosObj).flat();
                    const locEstadoCount = {};
                    locItems.forEach(i => {
                      const est = (i.Estado || "").toString().trim() || "Sin estado";
                      locEstadoCount[est] = (locEstadoCount[est] || 0) + 1;
                    });
                    return (
                      <React.Fragment key={loc}>
                        <tr className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleLoc(depto, loc)}>
                          <td></td>
                          <td className="px-2 py-2.5 text-center text-slate-400 text-xs">{expandedLocs[depto + "|" + loc] ? "▼" : "▶"}</td>
                          <td colSpan={2} className="px-4 py-2.5 font-semibold text-slate-700">{loc}</td>
                          {allEstados.map(est => (
                            <td key={est} className="px-4 py-2.5 text-center text-sm text-slate-600">{locEstadoCount[est] || 0}</td>
                          ))}
                          <td className="px-4 py-2.5 text-center text-sm font-semibold text-slate-800">{locItems.length}</td>
                        </tr>

                        {expandedLocs[depto + "|" + loc] && Object.entries(barriosObj).map(([barrio, items]) => (
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
                            {allEstados.map(est => {
                              const count = items.filter(i => (i.Estado || "").toString().trim() === est).length;
                              return <td key={est} className="px-4 py-2.5 text-center text-sm text-slate-600">{count || 0}</td>;
                            })}
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

      {/* Panel lateral de detalle */}
      <SlidePanel isOpen={!!detalle} onClose={() => setDetalle(null)} title={detalle ? detalle.titulo : ""}>
        {detalle && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 font-medium">TU CASA TU ESCRITURA — Ley 9811</p>
              <button
                onClick={() => {
                  const partes = detalle.titulo.split(" - ");
                  const params = new URLSearchParams({ formato });
                  if (partes[0]) params.set("departamento", partes[0]);
                  if (partes[1]) params.set("localidad", partes[1]);
                  if (partes[2]) params.set("barrio", partes[2]);
                  downloadExcel(`${API_URL}/stock/planillas?${params}`, `Stock_${formato}.xlsx`);
                }}
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
    </div>
  );
}
