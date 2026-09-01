import React, { useState, useMemo, useCallback } from "react";
import useDataLoader from "./hooks/useDataLoader";
import useUrlState from "./hooks/useUrlState";
import API_CONFIG from "./config-api";

const API_URL = API_CONFIG.BASE_URL_BACKEND;

const ESTADO_FORMATO = {
  "Finalizada sin Entregar": "finalizadas",
  "En Trámite": "en-tramite",
};

const ACCORDION_COLUMNS = [
  { key: "nro", label: "N°", sortable: false },
  { key: "departamento", label: "Departamento", sortable: true },
  { key: "localidad", label: "Localidad", sortable: true },
  { key: "barrio", label: "Barrio", sortable: true },
  { key: "mza", label: "Mza", sortable: true },
  { key: "lote", label: "Lote", sortable: true },
  { key: "nombre", label: "Beneficiario", sortable: true },
  { key: "dni", label: "DNI", sortable: true },
  { key: "tel", label: "Teléfono", sortable: false },
  { key: "cotitular", label: "Cotitular", sortable: true },
  { key: "escribano", label: "Escribano", sortable: true },
];

function extractFields(item) {
  return {
    nombre: item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? item.ApellidoYNombre ?? item.Nombre ?? item.nombre ?? "—",
    dni: item.DNI ?? item.dni ?? item.documento ?? "—",
    mza: item["Mza. Plano"] ?? item["Mza. Oficial"] ?? item.Mza ?? item.MZA ?? item.mza ?? "—",
    lote: item["Lote Plano"] ?? item["Lote oficial"] ?? item["Lote Oficial"] ?? item.Lote ?? item.LOTE ?? "—",
    cotitular: item["COTITULAR Nombre y Apellido"] ?? item["COTITULAR - Nombre y Apellido"] ?? item.Cotitular ?? "—",
    tel: item.Telefono ?? item.telefono ?? "—",
    departamento: item.Departamento ?? "—",
    localidad: item.Localidad ?? "—",
    barrio: item.Barrio ?? "—",
    escribano: item["Escribano Designado"] ?? item.Escribano ?? item.escribano ?? "—",
  };
}

function downloadExcel(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function buildExportUrl(formato, filters) {
  const params = new URLSearchParams({ formato });
  if (filters.departamento && filters.departamento !== "Todos") params.set("departamento", filters.departamento);
  if (filters.localidad && filters.localidad !== "Todos") params.set("localidad", filters.localidad);
  if (filters.barrio && filters.barrio !== "Todos") params.set("barrio", filters.barrio);
  return `${API_URL}/stock/planillas?${params.toString()}`;
}

function SortIcon({ active, direction }) {
  if (!active) return <span className="text-slate-300 ml-1">⇅</span>;
  return <span className="text-blue-600 ml-1">{direction === "asc" ? "↑" : "↓"}</span>;
}

function AccordionTable({ items }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(item => {
      const f = extractFields(item);
      return Object.values(f).some(v => String(v).toLowerCase().includes(q));
    });
  }, [items, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const fa = extractFields(a);
      const fb = extractFields(b);
      const va = String(fa[sortKey] ?? "").toLowerCase();
      const vb = String(fb[sortKey] ?? "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = sorted.slice((safePage - 1) * perPage, safePage * perPage);

  const handleSort = (key, sortable) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        placeholder="Buscar beneficiario, DNI, departamento, localidad, barrio..."
        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-slate-100">
              {ACCORDION_COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`px-2.5 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200 ${col.sortable ? "cursor-pointer hover:bg-slate-200 select-none" : ""}`}
                  onClick={() => handleSort(col.key, col.sortable)}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && <SortIcon active={sortKey === col.key} direction={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, idx) => {
              const f = extractFields(item);
              const globalIdx = (safePage - 1) * perPage + idx;
              return (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-2.5 py-2 border border-slate-200 text-slate-400 font-medium">{globalIdx + 1}</td>
                  <td className="px-2.5 py-2 border border-slate-200 text-slate-700">{f.barrio}</td>
                  <td className="px-2.5 py-2 border border-slate-200 text-slate-700">{f.mza}</td>
                  <td className="px-2.5 py-2 border border-slate-200 text-slate-700">{f.lote}</td>
                  <td className="px-2.5 py-2 border border-slate-200 font-semibold text-slate-800">{f.nombre}</td>
                  <td className="px-2.5 py-2 border border-slate-200 font-mono text-[11px]">{f.dni}</td>
                  <td className="px-2.5 py-2 border border-slate-200 text-slate-700">{f.tel}</td>
                  <td className="px-2.5 py-2 border border-slate-200 text-slate-700">{f.cotitular}</td>
                  <td className="px-2.5 py-2 border border-slate-200 text-slate-700">{f.escribano}</td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={ACCORDION_COLUMNS.length} className="px-2.5 py-6 text-center text-slate-400 border border-slate-200">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400 font-medium">
            {sorted.length} registros — Página {safePage} de {totalPages}
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
              if (totalPages <= 5) pageNum = i + 1;
              else if (safePage <= 3) pageNum = i + 1;
              else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = safePage - 2 + i;
              return (
                <button
                  key={pageNum}
                  className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
                    safePage === pageNum ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
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

export default function StockTab() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { state: filters, set: setFilters, reset: resetFilters } = useUrlState({
    scope: "stock",
    defaults: { departamento: "Todos", localidad: "Todos", barrio: "Todos" },
  });

  const [expanded, setExpanded] = useState({});

  const allData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filtered = useMemo(() => {
    return allData.filter(item => {
      if (filters.departamento && filters.departamento !== "Todos") {
        const d = item.Departamento ?? "";
        if (!d.toUpperCase().includes(filters.departamento.trim().toUpperCase())) return false;
      }
      if (filters.localidad && filters.localidad !== "Todos") {
        const l = item.Localidad ?? "";
        if (!l.toUpperCase().includes(filters.localidad.trim().toUpperCase())) return false;
      }
      if (filters.barrio && filters.barrio !== "Todos") {
        const b = item.Barrio ?? "";
        if (!b.toUpperCase().includes(filters.barrio.trim().toUpperCase())) return false;
      }
      return true;
    });
  }, [allData, filters]);

  const estadoGroups = useMemo(() => {
    const groups = {};
    filtered.forEach(item => {
      const est = (item.Estado || "").toString().trim() || "Sin estado";
      if (!groups[est]) groups[est] = [];
      groups[est].push(item);
    });
    return groups;
  }, [filtered]);

  const allEstados = useMemo(() => Object.keys(estadoGroups).sort(), [estadoGroups]);

  const toggleAccordion = useCallback((estado) => {
    setExpanded(prev => ({ ...prev, [estado]: !prev[estado] }));
  }, []);

  const departamentos = useMemo(
    () => ["Todos", ...Array.from(new Set(allData.map(i => i.Departamento).filter(Boolean))).sort()],
    [allData]
  );

  const localidades = useMemo(() => {
    if (filters.departamento && filters.departamento !== "Todos") {
      return ["Todos", ...Array.from(new Set(allData.filter(i => i.Departamento === filters.departamento).map(i => i.Localidad).filter(Boolean))).sort()];
    }
    return ["Todos", ...Array.from(new Set(allData.map(i => i.Localidad).filter(Boolean))).sort()];
  }, [allData, filters.departamento]);

  const barrios = useMemo(() => {
    let pool = allData;
    if (filters.departamento && filters.departamento !== "Todos") pool = pool.filter(i => i.Departamento === filters.departamento);
    if (filters.localidad && filters.localidad !== "Todos") pool = pool.filter(i => i.Localidad === filters.localidad);
    return ["Todos", ...Array.from(new Set(pool.map(i => i.Barrio).filter(Boolean))).sort()];
  }, [allData, filters.departamento, filters.localidad]);

  if (loading) return <div className="flex justify-center py-8"><div className="spinner" /></div>;
  if (error) return <div className="alert alert-error"><p>{error}</p></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Stock</h2>

      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departamento</label>
          <select
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.departamento}
            onChange={e => setFilters({ departamento: e.target.value, localidad: "Todos", barrio: "Todos" })}
          >
            {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Localidad</label>
          <select
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.localidad}
            onChange={e => setFilters({ localidad: e.target.value, barrio: "Todos" })}
          >
            {localidades.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Barrio</label>
          <select
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.barrio}
            onChange={e => setFilters({ barrio: e.target.value })}
          >
            {barrios.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={resetFilters}
            disabled={filters.departamento === "Todos" && filters.localidad === "Todos" && filters.barrio === "Todos"}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {allEstados.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">Sin datos para los filtros seleccionados</div>
        )}
        {allEstados.map(estado => {
          const items = estadoGroups[estado];
          const isOpen = expanded[estado];
          const formato = ESTADO_FORMATO[estado];

          return (
            <div key={estado} className="border rounded-lg">
              <div
                className="bg-slate-50 hover:bg-slate-100 cursor-pointer p-3 flex justify-between items-center transition-colors"
                onClick={() => toggleAccordion(estado)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs">{isOpen ? "▼" : "▶"}</span>
                  <span className="font-bold text-slate-800 text-sm">{estado}</span>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-200 text-slate-600 rounded-full">
                    {items.length}
                  </span>
                </div>
                {formato && (
                  <button
                    className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 transition-colors font-medium"
                    onClick={e => {
                      e.stopPropagation();
                      downloadExcel(buildExportUrl(formato, filters), `Stock_${formato}.xlsx`);
                    }}
                  >
                    ↓ Planilla
                  </button>
                )}
              </div>
              {isOpen && (
                <div className="border-t p-3">
                  <AccordionTable items={items} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
