import React, { useState, useEffect, useMemo, useCallback } from "react";
import TextField from "@mui/material/TextField";
import useDataLoader from "./hooks/useDataLoader";
import useUrlState from "./hooks/useUrlState";
import DataTable from "./components/ui/DataTable";
import API_CONFIG from "./config-api";

const API_URL = API_CONFIG.BASE_URL_BACKEND;

const PAGE_SIZE = 15;

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

const COLUMN_WIDTHS = {
  nro: 60,
  departamento: 140,
  localidad: 150,
  barrio: 150,
  mza: 84,
  lote: 84,
  nombre: 240,
  dni: 130,
  tel: 140,
  cotitular: 220,
  escribano: 190,
};

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

// Sort comparator replicating the previous accordion table semantics (DG-3):
// case-insensitive text comparison via localeCompare.
function textComparator(v1, v2) {
  const a = String(v1 ?? "").toLowerCase();
  const b = String(v2 ?? "").toLowerCase();
  return a.localeCompare(b);
}

// Adapter: ACCORDION_COLUMNS descriptors → DataGrid column defs. The `nro`
// column keeps the previous global row number ((page * PAGE_SIZE) + index + 1)
// and is never sortable/hideable; the remaining columns carry the `sortable`
// flag declared in ACCORDION_COLUMNS (task 3.2).
function buildStockColumns(page) {
  return ACCORDION_COLUMNS.map(col => {
    if (col.key === "nro") {
      return {
        field: "nro",
        headerName: col.label,
        width: COLUMN_WIDTHS.nro,
        sortable: false,
        filterable: false,
        hideable: false,
        disableColumnMenu: true,
        align: "center",
        headerAlign: "center",
        renderCell: params =>
          params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 + page * PAGE_SIZE,
      };
    }
    return {
      field: col.key,
      headerName: col.label,
      width: COLUMN_WIDTHS[col.key] || 150,
      sortable: col.sortable,
      sortComparator: col.sortable ? textComparator : undefined,
    };
  });
}

function AccordionTable({ items }) {
  const [search, setSearch] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: PAGE_SIZE });
  const [sortModel, setSortModel] = useState([]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(item => {
      const f = extractFields(item);
      return Object.values(f).some(v => String(v).toLowerCase().includes(q));
    });
  }, [items, search]);

  // DG-4: reset to the first page whenever the search or the group data changes.
  useEffect(() => {
    setPaginationModel(p => (p.page === 0 ? p : { ...p, page: 0 }));
  }, [filtered]);

  // DataGrid needs unique row ids; extractFields produces the display values and
  // the filtered index keeps identity stable across the grid's internal sorting.
  const gridRows = useMemo(
    () => filtered.map((item, idx) => ({ ...extractFields(item), _stockId: idx })),
    [filtered]
  );

  const columns = useMemo(() => buildStockColumns(paginationModel.page), [paginationModel.page]);

  // Size the grid to the rows actually on the current page so short groups do
  // not render a mostly-empty box.
  const rowsOnPage = Math.min(
    PAGE_SIZE,
    Math.max(gridRows.length - paginationModel.page * PAGE_SIZE, 1)
  );
  const gridHeight = 112 + rowsOnPage * 40;

  return (
    <div className="space-y-2">
      <TextField
        size="small"
        fullWidth
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar beneficiario, DNI, departamento, localidad, barrio..."
        inputProps={{ "aria-label": "Buscar en la tabla de stock" }}
      />
      <DataTable
        rows={gridRows}
        columns={columns}
        getRowId={row => row._stockId}
        height={gridHeight}
        showToolbar
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        emptyState={{ message: "Sin resultados", hint: "Probá ajustando la búsqueda" }}
      />
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
