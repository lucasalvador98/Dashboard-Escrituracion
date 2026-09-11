import React, { useEffect, useMemo, useState } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import useDataLoader from "./hooks/useDataLoader";
import useUrlState from "./hooks/useUrlState";
import SlidePanel from "./components/SlidePanel";
import DataTable from "./components/ui/DataTable";
import LoadingState from "./components/ui/LoadingState";
import ErrorAlert from "./components/ui/ErrorAlert";
import { countBadgeCell } from "./components/ui/renderCells";

const PAGE_SIZE = 15;

// MUI chip color per estado, preserving the previous Tailwind badge semantics
// (INV-3): En Trámite blue→info, Finalizada sin Entregar indigo→primary,
// Entregada green→success, De Baja red→error, Hipotecada orange→warning,
// No Retiradas slate→default, Definitivo retirado teal→success. Unknown
// estados fall back to the neutral default chip.
const ESTADO_BADGE_COLORS = {
  "En Trámite": "info",
  "Finalizada sin Entregar": "primary",
  "Entregada": "success",
  "De Baja": "error",
  "Hipotecada": "warning",
  "No Retiradas": "default",
  "Definitivo retirado": "success",
};

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

// Color de badge según estado (usado por la tabla de detalle del panel).
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

// Sort comparators for the summary grid (DG-3): the Escribano column compares
// case-insensitively (numeric collation), the Total/Estado columns compare
// numerically. The summary data is already aggregated, so these only affect
// user-driven header clicks and the initial total desc sort.
function stringComparator(v1, v2) {
  const a = v1 == null || v1 === "" ? null : String(v1);
  const b = v2 == null || v2 === "" ? null : String(v2);
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b, undefined, { numeric: true });
}

function numberComparator(v1, v2) {
  const a = Number(v1);
  const b = Number(v2);
  const an = Number.isNaN(a) ? -Infinity : a;
  const bn = Number.isNaN(b) ? -Infinity : b;
  if (an === bn) return 0;
  return an < bn ? -1 : 1;
}

// Adapter: aggregated escribano rows → DataGrid column defs. "Escribano" and
// "Total" are followed by one column per Estado present in the data (dynamic,
// not hardcoded — DG-2), each rendering a fixed-color count badge.
function buildEscribanoColumns(estadosUnicos) {
  const cols = [
    {
      field: "nombre",
      headerName: "Escribano",
      flex: 1,
      minWidth: 220,
      sortComparator: stringComparator,
    },
    {
      field: "total",
      headerName: "Total",
      width: 110,
      align: "center",
      headerAlign: "center",
      sortComparator: numberComparator,
    },
  ];

  estadosUnicos.forEach((est, idx) => {
    cols.push({
      field: `estado_${idx}`,
      headerName: est,
      width: Math.max(120, est.length * 9 + 32),
      align: "center",
      headerAlign: "center",
      sortComparator: numberComparator,
      renderCell: countBadgeCell(ESTADO_BADGE_COLORS[est] || "default"),
    });
  });

  return cols;
}

export default function EscribanosTab() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { state: urlState, set: setUrl } = useUrlState({
    scope: "escribanos",
    defaults: { search: "" },
    sharedKeys: ["escribano", "estado"],
    scopedKeys: ["search"],
  });
  const [selectedEscribano, setSelectedEscribano] = useState(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: PAGE_SIZE });
  // DG-3: initial sort is total desc (the previous table's default order).
  const [sortModel, setSortModel] = useState([{ field: "total", sort: "desc" }]);

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

  // DG-4: reset to the first page whenever the search changes.
  useEffect(() => {
    setPaginationModel(p => (p.page === 0 ? p : { ...p, page: 0 }));
  }, [filtered]);

  const columns = useMemo(() => buildEscribanoColumns(estadosUnicos), [estadosUnicos]);

  // DataGrid needs unique row ids; each row also carries the estado counts as
  // flat fields (`estado_<i>`) so the per-Estado badge columns can render them
  // from params.value. The full escribano object (registros/estadoCounts) is
  // kept on the row for the SlidePanel detail (onRowClick).
  const gridRows = useMemo(
    () =>
      filtered.map((e, idx) => {
        const row = { ...e, _id: idx };
        estadosUnicos.forEach((est, i) => {
          row[`estado_${i}`] = e.estadoCounts[est] || 0;
        });
        return row;
      }),
    [filtered, estadosUnicos]
  );

  const handleSearch = (val) => setUrl({ search: val });

  // Size the grid to the rows on the current page so short lists do not render
  // a mostly-empty box (same approach as StockTab/P4a).
  const rowsOnPage = Math.min(
    PAGE_SIZE,
    Math.max(gridRows.length - paginationModel.page * PAGE_SIZE, 1)
  );
  const gridHeight = 112 + rowsOnPage * 40;

  if (loading) return <LoadingState py={8} />;
  if (error) return <ErrorAlert message={error} sx={{ my: 2 }} />;

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
        <TextField
          size="small"
          value={urlState.search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar escribano..."
          inputProps={{ "aria-label": "Buscar escribano" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 320, maxWidth: "100%" }}
        />
      </div>

      <DataTable
        rows={gridRows}
        columns={columns}
        getRowId={row => row._id}
        height={gridHeight}
        showToolbar
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        onRowClick={params => setSelectedEscribano(params.row)}
        emptyState={{ message: "Sin resultados", hint: "Probá ajustando la búsqueda" }}
      />

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
