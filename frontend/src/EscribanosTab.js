import React, { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.025em", color: "text.primary" }}>
            Escribanos
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: "text.secondary" }}>
            {escribanos.length} escribanos — {filtered.length} mostrados
          </Typography>
        </Box>
      </Box>

      {/* Búsqueda */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
      </Box>

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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Resumen */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
              <Box sx={{ bgcolor: "action.hover", borderRadius: 2, p: 1.5, textAlign: "center" }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, color: "text.primary" }}>{selectedEscribano.total}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary" }}>Total</Typography>
              </Box>
              {estadosUnicos.map(est => {
                const count = selectedEscribano.estadoCounts[est] || 0;
                if (!count) return null;
                return (
                  <Box key={est} sx={{ bgcolor: "action.hover", borderRadius: 2, p: 1.5, textAlign: "center" }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, color: "text.primary" }}>{count}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary" }}>{est}</Typography>
                  </Box>
                );
              })}
            </Box>

            {/* Tabla de registros */}
            <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
              {selectedEscribano.registros.length} registros
            </Typography>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 520 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Beneficiario</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>DNI</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Barrio</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedEscribano.registros.map((item, idx) => {
                    const estado = item.Estado || item.estado || item.EstadoProceso || "";
                    return (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ color: "text.secondary" }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 500, color: "text.primary" }}>{getNombre(item)}</TableCell>
                        <TableCell sx={{ fontFamily: "monospace", color: "text.primary" }}>{item.DNI || "—"}</TableCell>
                        <TableCell sx={{ color: "text.primary" }}>{item.Barrio || "—"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={estado || "—"}
                            color={ESTADO_BADGE_COLORS[estado] || "default"}
                            sx={{ fontSize: 10, fontWeight: 700, height: 20 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </SlidePanel>
    </Box>
  );
}
