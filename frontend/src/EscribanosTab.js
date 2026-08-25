import React, { useMemo, useState } from "react";
import useDataLoader from "./hooks/useDataLoader";
import useUrlState from "./hooks/useUrlState";
import SlidePanel from "./components/SlidePanel";

const ITEMS_PER_PAGE = 15;

function multiField(obj, ...fields) {
  for (const f of fields) {
    if (obj[f] != null && obj[f] !== "") return obj[f];
  }
  return null;
}

function getEscribano(item) {
  return multiField(item, "Escribano Designado", "Escribano", "escribano", "ESCRIBANO", "EscribanoDesignado") || "";
}

function getNombre(item) {
  return multiField(item, "Beneficiarios", "Beneficiario", "APELLIDO Y NOMBRE", "ApellidoYNombre", "Nombre") || "—";
}

// Color de badge según estado
function estadoClass(estado) {
  switch (estado) {
    case "En Trámite": return "bg-blue-100 text-blue-700";
    case "Finalizada sin Entregar": return "bg-indigo-100 text-indigo-700";
    case "Entregada": return "bg-green-100 text-green-700";
    case "De Baja": return "bg-red-100 text-red-700";
    case "Hipotecada": return "bg-orange-100 text-orange-700";
    case "No Retiradas": return "bg-slate-200 text-slate-600";
    case "Definitivo retirado": return "bg-teal-100 text-teal-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export default function EscribanosTab() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { state: urlState, set: setUrl } = useUrlState({
    scope: "escribanos",
    defaults: { search: "" },
    sharedKeys: ["escribano", "estado"],
    scopedKeys: ["search"],
  });
  const [page, setPage] = useState(1);
  const [selectedEscribano, setSelectedEscribano] = useState(null);

  const allData = useMemo(() => Array.isArray(data) ? data : [], [data]);

  // Estados únicos presentes en los datos (dinámicos, no hardcodeados)
  const estadosUnicos = useMemo(() => {
    const set = new Set();
    allData.forEach(item => {
      const estado = (item.Estado || item.estado || item.EstadoProceso || "").toString().trim();
      if (estado) set.add(estado);
    });
    return [...set].sort();
  }, [allData]);

  const escribanos = useMemo(() => {
    const map = {};
    allData.forEach(item => {
      const nombre = getEscribano(item);
      if (!nombre || nombre === "N/A") return;

      if (!map[nombre]) {
        map[nombre] = { nombre, total: 0, estadoCounts: {}, registros: [] };
      }
      const e = map[nombre];
      e.total++;
      e.registros.push(item);

      const estado = (item.Estado || item.estado || item.EstadoProceso || "").toString().trim();
      if (estado) e.estadoCounts[estado] = (e.estadoCounts[estado] || 0) + 1;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [allData]);

  const filtered = useMemo(() => {
    if (!urlState.search.trim()) return escribanos;
    const q = urlState.search.trim().toUpperCase();
    return escribanos.filter(e => e.nombre.toUpperCase().includes(q));
  }, [escribanos, urlState.search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // Reset page on search
  const handleSearch = (val) => { setUrl({ search: val }); setPage(1); };

  function renderPagination() {
    if (totalPages <= 1) return null;
    const pages = [];
    pages.push(<button key={1} className={safePage === 1 ? "active" : ""} onClick={() => setPage(1)}>1</button>);
    if (totalPages > 6) {
      let start = Math.max(2, safePage - 2);
      let end = Math.min(totalPages - 1, safePage + 2);
      if (start > 2) pages.push(<span key="se" className="ellipsis">...</span>);
      for (let i = start; i <= end; i++) pages.push(<button key={i} className={safePage === i ? "active" : ""} onClick={() => setPage(i)}>{i}</button>);
      if (end < totalPages - 1) pages.push(<span key="ee" className="ellipsis">...</span>);
      pages.push(<button key={totalPages} className={safePage === totalPages ? "active" : ""} onClick={() => setPage(totalPages)}>{totalPages}</button>);
    } else {
      for (let i = 2; i <= totalPages; i++) pages.push(<button key={i} className={safePage === i ? "active" : ""} onClick={() => setPage(i)}>{i}</button>);
    }
    return (
      <div className="pagination">
        <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>&lt;</button>
        {pages}
        <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>&gt;</button>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-16"><div className="spinner"></div></div>;
  if (error) return <div className="alert alert-error my-4"><p>{error}</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Escribanos</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {escribanos.length} escribanos — {filtered.length} mostrados
          </p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Buscar escribano..."
            value={urlState.search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium text-sm">No se encontraron escribanos</div>
      ) : (
        <>
          <div className="table-wrap overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Escribano</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                {estadosUnicos.map(est => (
                  <th key={est} className="px-3 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{est}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((e, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEscribano(e)}
                >
                  <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{e.nombre}</td>
                  <td className="px-3 py-2 text-center font-bold text-slate-900">{e.total}</td>
                  {estadosUnicos.map(est => {
                    const count = e.estadoCounts[est] || 0;
                    return (
                      <td key={est} className="px-3 py-2 text-center">
                        {count > 0 ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${estadoClass(est)}`}>{count}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          {renderPagination()}
        </>
      )}

      {/* Panel lateral con registros del escribano */}
      <SlidePanel
        isOpen={!!selectedEscribano}
        onClose={() => setSelectedEscribano(null)}
        title={selectedEscribano ? selectedEscribano.nombre : ""}
      >
        {selectedEscribano && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-slate-900">{selectedEscribano.total}</div>
                <div className="text-xs font-medium text-slate-500">Total</div>
              </div>
              {estadosUnicos.map(est => {
                const count = selectedEscribano.estadoCounts[est] || 0;
                if (!count) return null;
                return (
                  <div key={est} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-slate-700">{count}</div>
                    <div className="text-xs font-medium text-slate-500">{est}</div>
                  </div>
                );
              })}
            </div>

            {/* Tabla de registros */}
            <div className="text-xs font-medium text-slate-500">
              {selectedEscribano.registros.length} registros
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-1.5 text-left font-bold text-slate-500">#</th>
                    <th className="px-2 py-1.5 text-left font-bold text-slate-500">Beneficiario</th>
                    <th className="px-2 py-1.5 text-left font-bold text-slate-500">DNI</th>
                    <th className="px-2 py-1.5 text-left font-bold text-slate-500">Barrio</th>
                    <th className="px-2 py-1.5 text-left font-bold text-slate-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEscribano.registros.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-2 py-1">{idx + 1}</td>
                      <td className="px-2 py-1 font-medium">{getNombre(item)}</td>
                      <td className="px-2 py-1 font-mono">{item.DNI || "—"}</td>
                      <td className="px-2 py-1">{item.Barrio || "—"}</td>
                      <td className="px-2 py-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold ${estadoClass(item.Estado || item.estado || item.EstadoProceso || "")}`}>
                          {item.Estado || item.estado || item.EstadoProceso || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
