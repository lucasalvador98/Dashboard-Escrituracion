import React, { useState, useEffect, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import { useTheme, alpha } from "@mui/material/styles";
import useDataLoader from "./hooks/useDataLoader";
import useUrlState from "./hooks/useUrlState";
import DataTable from "./components/ui/DataTable";
import LoadingState from "./components/ui/LoadingState";
import ErrorAlert from "./components/ui/ErrorAlert";
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
    </Box>
  );
}

export default function StockTab() {
  const theme = useTheme();
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

  if (loading) return <LoadingState py={4} />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography component="h2" sx={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.025em", color: "text.primary" }}>
        Stock
      </Typography>

      {/* Filtros: Departamento / Localidad / Barrio (mismos valores y resets en cascada) */}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography component="label" htmlFor="stock-filter-departamento" sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Departamento
          </Typography>
          <TextField
            id="stock-filter-departamento"
            select
            size="small"
            value={filters.departamento}
            onChange={e => setFilters({ departamento: e.target.value, localidad: "Todos", barrio: "Todos" })}
            SelectProps={{ native: true, inputProps: { "aria-label": "Departamento" } }}
            sx={{ minWidth: 160 }}
          >
            {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
          </TextField>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography component="label" htmlFor="stock-filter-localidad" sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Localidad
          </Typography>
          <TextField
            id="stock-filter-localidad"
            select
            size="small"
            value={filters.localidad}
            onChange={e => setFilters({ localidad: e.target.value, barrio: "Todos" })}
            SelectProps={{ native: true, inputProps: { "aria-label": "Localidad" } }}
            sx={{ minWidth: 160 }}
          >
            {localidades.map(l => <option key={l} value={l}>{l}</option>)}
          </TextField>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography component="label" htmlFor="stock-filter-barrio" sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Barrio
          </Typography>
          <TextField
            id="stock-filter-barrio"
            select
            size="small"
            value={filters.barrio}
            onChange={e => setFilters({ barrio: e.target.value })}
            SelectProps={{ native: true, inputProps: { "aria-label": "Barrio" } }}
            sx={{ minWidth: 160 }}
          >
            {barrios.map(b => <option key={b} value={b}>{b}</option>)}
          </TextField>
        </Box>
        <Box sx={{ display: "flex", alignItems: "flex-end" }}>
          <Button
            variant="outlined"
            size="small"
            onClick={resetFilters}
            disabled={filters.departamento === "Todos" && filters.localidad === "Todos" && filters.barrio === "Todos"}
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: "text.secondary",
              borderColor: "divider",
              "&:hover:not(:disabled)": {
                color: "error.main",
                borderColor: "error.light",
                bgcolor: alpha(theme.palette.error.main, 0.04),
              },
            }}
          >
            Limpiar filtros
          </Button>
        </Box>
      </Box>

      {/* Acordeones por estado */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {allEstados.length === 0 && (
          <Box sx={{ textAlign: "center", py: 4, color: "text.secondary", fontSize: 14 }}>
            Sin datos para los filtros seleccionados
          </Box>
        )}
        {allEstados.map(estado => {
          const items = estadoGroups[estado];
          const isOpen = !!expanded[estado];
          const formato = ESTADO_FORMATO[estado];

          return (
            <Accordion
              key={estado}
              expanded={isOpen}
              onChange={() => toggleAccordion(estado)}
              disableGutters
              sx={{
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                boxShadow: "none",
                overflow: "hidden",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<span style={{ fontSize: 12 }}>{isOpen ? "▼" : "▶"}</span>}
                sx={{
                  bgcolor: "action.hover",
                  "&:hover": { bgcolor: "action.selected" },
                  minHeight: 0,
                  "&.Mui-expanded": { minHeight: 0 },
                  "& .MuiAccordionSummary-content": { margin: 0, py: 1.25, alignItems: "center", gap: 1.5 },
                  "& .MuiAccordionSummary-expandIconWrapper": { transform: "none" },
                }}
              >
                <Typography component="span" sx={{ fontWeight: 700, fontSize: 14, color: "text.primary" }}>{estado}</Typography>
                <Box component="span" sx={{ px: 1, py: 0.25, fontSize: 11, fontWeight: 600, bgcolor: "action.selected", color: "text.secondary", borderRadius: "999px" }}>
                  {items.length}
                </Box>
                {formato && (
                  <Button
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      downloadExcel(buildExportUrl(formato, filters), `Stock_${formato}.xlsx`);
                    }}
                    sx={{
                      ml: "auto",
                      fontSize: 13,
                      fontWeight: 500,
                      minWidth: 0,
                      px: 1.5,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: "primary.main",
                      "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.16) },
                    }}
                  >
                    ↓ Planilla
                  </Button>
                )}
              </AccordionSummary>
              {isOpen && (
                <AccordionDetails sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                  <AccordionTable items={items} />
                </AccordionDetails>
              )}
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
}
