import React, { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import useDataLoader from "./hooks/useDataLoader";
import useUrlState from "./hooks/useUrlState";
import useExportCSV from "./hooks/useExportCSV";
import useEscrituracion, { INTERVALS, DATE_COLS, diffClass } from "./hooks/useEscrituracion";
import { parseDate } from "./lib/deadlines";
import SelectFilters from "./components/SelectFilters";
import SlidePanel from "./components/SlidePanel";
import { useGridApiRef } from "@mui/x-data-grid";
import DataTable from "./components/ui/DataTable";
import LoadingState from "./components/ui/LoadingState";
import ErrorAlert from "./components/ui/ErrorAlert";
import StatusCards from "./components/StatusCards";
import DateDetailPanel from "./components/DateDetailPanel";
import { semaphoreCell, pillCell, clickableCell, useSemaphorePalette } from "./components/ui/renderCells";
import FileDownload from "@mui/icons-material/FileDownload";

const PAGE_SIZE = 15;

// Semaphore legend entries (P7b-migrate): the dot color comes from the theme
// semaphore palette (palette[cls].text) so it stays distinguishable in both
// light and dark mode (INV-2). Labels are unchanged (INV-3).
const LEGEND_ITEMS = [
  { cls: "green", label: "Dentro del plazo" },
  { cls: "yellow", label: "Alerta (> plazo)" },
  { cls: "red", label: "Demora (> +30%)" },
  { cls: "gray", label: "Sin datos" },
];

// useDataLoader returns `data ?? []` — a NEW empty array on every render while
// the query is loading. A per-render `[]` would invalidate the whole
// useEscrituracion memo chain each frame and re-trigger the export effect
// below (setExportRows → re-render → loop). A module-level constant keeps the
// identity stable so the memos settle.
const EMPTY_ROWS = [];

// Column widths per known key; extras fall back to a sensible default.
const COLUMN_WIDTHS = {
  Departamento: 140,
  Localidad: 150,
  Barrio: 150,
  "Mza. Plano": 84,
  "Lote Plano": 84,
  Beneficiarios: 240,
  DNI: 130,
  "Escribano Designado": 190,
  Estado: 210,
};

// ————————————————————————————————————————————————————————————————
// Sort comparators — replicate useEscrituracion sorting semantics so the
// DataGrid orders rows exactly like the previous table did (DG-3):
// "N/A"/empty values sink to the bottom, dates parse via lib parseDate,
// text compares with numeric collation.
// ————————————————————————————————————————————————————————————————
function diffValue(v) {
  if (v === "N/A" || v == null || v === "") return Infinity;
  const n = Number(v);
  return Number.isNaN(n) ? Infinity : n;
}

function diffComparator(v1, v2) {
  const a = diffValue(v1);
  const b = diffValue(v2);
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function dateComparator(v1, v2) {
  const d1 = parseDate(v1);
  const d2 = parseDate(v2);
  if (!d1 && !d2) return 0;
  if (!d1) return 1;
  if (!d2) return -1;
  return d1.getTime() - d2.getTime();
}

function stringComparator(v1, v2) {
  const a = v1 == null || v1 === "" ? null : String(v1);
  const b = v2 == null || v2 === "" ? null : String(v2);
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b, undefined, { numeric: true });
}

// Adapter: hook column descriptors { key, label, ... } → DataGrid column defs
// { field, headerName, width, sortComparator, renderCell }. Semaphore columns
// keep the interval header (label + esperado threshold) and cell behavior.
function buildGridColumns({ allColumns, filterByField, setIntervalDetail, page }) {
  const clickable = key =>
    ["Departamento", "Localidad", "Barrio", "Escribano Designado", "Estado"].includes(key);

  const cols = [
    {
      field: "_rowNum",
      headerName: "N°",
      width: 60,
      minWidth: 60,
      sortable: false,
      filterable: false,
      hideable: false,
      disableColumnMenu: true,
      align: "center",
      headerAlign: "center",
      renderCell: params =>
        params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 + page * PAGE_SIZE,
    },
  ];

  for (const col of allColumns) {
    const key = col.key;

    if (key.startsWith("diferencia_")) {
      const iv = INTERVALS.find(i => i.key === key);
      if (!iv) continue;
      cols.push({
        field: key,
        // headerName stays a plain string (a11y label / sorting title);
        // the two-line "label + esperado threshold" header renders via
        // renderHeader so DataGrid's string propType check stays satisfied.
        headerName: iv.label,
        renderHeader: () => (
          <Box
            component="span"
            title={iv.fullLabel}
            sx={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1.15 }}
          >
            <span>{iv.label}</span>
            <Box component="span" sx={{ fontSize: 10, fontWeight: 600, color: "text.secondary" }}>{iv.esperado}d</Box>
          </Box>
        ),
        width: 108,
        sortComparator: diffComparator,
        renderCell: semaphoreCell(diffClass, {
          esperado: iv.esperado,
          fullLabel: iv.fullLabel,
          fecha1: iv.fecha1,
          fecha2: iv.fecha2,
          onSelect: row => setIntervalDetail({ item: row, interval: iv }),
        }),
      });
      continue;
    }

    if (key === "Estado") {
      cols.push({
        field: key,
        headerName: col.label,
        width: COLUMN_WIDTHS[key] || 180,
        sortComparator: stringComparator,
        renderCell: pillCell(undefined, {
          onClick: (row, field) => filterByField("Estado", row[field]),
        }),
      });
      continue;
    }

    cols.push({
      field: key,
      headerName: col.label,
      width: COLUMN_WIDTHS[key] || 150,
      sortComparator: DATE_COLS.has(key) ? dateComparator : stringComparator,
      ...(clickable(key)
        ? { renderCell: clickableCell((row, field) => filterByField(key, row[field])) }
        : {}),
    });
  }

  return cols;
}

export default function Escrituracion() {
  const semaphore = useSemaphorePalette();
  const { data, loading, error } = useDataLoader("escrituracion");
  const { state: filters, set: setFilters, reset: resetFilters } = useUrlState({
    scope: "escrituracion",
    defaults: { departamento: "Todos", localidad: "Todos", barrio: "Todos", estado: "Todos", escribano: "", dni: "" },
    sharedKeys: ["escribano", "estado"],
    replaceKeys: ["dni"],
  });

  // Stable identity for the empty-array case: `[]` recreated on every render
  // would invalidate the whole useEscrituracion memo chain each frame and loop
  // the export effect below (data is falsy while loading / in jsdom tests).
  const rawData = useMemo(
    () => (Array.isArray(data) && data.length > 0 ? data : EMPTY_ROWS),
    [data]
  );
  const hook = useEscrituracion(rawData, filters, setFilters);

  const ipvCount = rawData.filter(item => /DIRECC[IÓO]N DE VIVIENDAS/i.test(item.Observaciones || "")).length;

  // ———— Grid-controlled state (D5: the page owns pagination/visibility) ————
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: PAGE_SIZE });
  const [sortModel, setSortModel] = useState([]);
  const [visibilityTouched, setVisibilityTouched] = useState(false);
  const [localVisibilityModel, setLocalVisibilityModel] = useState(null);
  const apiRef = useGridApiRef();

  // DG-4: reset to the first page whenever filters change.
  useEffect(() => {
    setPaginationModel(p => ({ ...p, page: 0 }));
  }, [filters]);

  // Grid rows: DataGrid needs unique ids and the hook rows may lack `id`.
  // Inject a stable per-dataset `_gridId` (row.id ?? DNI-based) and normalize
  // display fields with the same fallbacks MatrixTable used, so rendered
  // values are unchanged (INV-3). The hook itself is never touched (INV-1).
  const gridRows = useMemo(() => {
    const seen = new Map();
    return hook.sortedData.map(item => {
      const row = { ...item };
      if (row.id == null) {
        const dni = String(row.DNI ?? row.dni ?? "noDNI");
        const n = seen.get(dni) ?? 0;
        seen.set(dni, n + 1);
        row._gridId = n === 0 ? dni : `${dni}-${n}`;
      }
      if (row["Escribano Designado"] == null) row["Escribano Designado"] = row.Escribano ?? row.escribano ?? "";
      if (row.Estado == null) row.Estado = row.estado ?? row.EstadoProceso ?? "";
      if (row.Beneficiarios == null) row.Beneficiarios = row.Beneficiario ?? row["APELLIDO Y NOMBRE"] ?? row.ApellidoYNombre ?? "—";
      return row;
    });
  }, [hook.sortedData]);

  const gridColumns = useMemo(
    () => buildGridColumns({
      allColumns: hook.allColumns,
      filterByField: hook.filterByField,
      setIntervalDetail: hook.setIntervalDetail,
      page: paginationModel.page,
    }),
    [hook.allColumns, hook.filterByField, hook.setIntervalDetail, paginationModel.page]
  );

  // D6: columnVisibilityModel is seeded from hook.visibleCols — same
  // localStorage key `escrituracion_visibleCols`, same JSON array format —
  // and keeps syncing from the hook until the user toggles a column. User
  // toggles write localStorage directly (toggleColumn semantics preserved).
  const derivedVisibilityModel = useMemo(() => {
    const model = { _rowNum: true };
    for (const col of gridColumns) {
      if (col.field === "_rowNum") continue;
      model[col.field] = hook.visibleCols.includes(col.field);
    }
    return model;
  }, [gridColumns, hook.visibleCols]);

  const visibilityModel = visibilityTouched && localVisibilityModel ? localVisibilityModel : derivedVisibilityModel;

  const handleColumnVisibilityModelChange = newModel => {
    setVisibilityTouched(true);
    setLocalVisibilityModel(newModel);
    // `_rowNum` is an internal grid column — never persisted (D6: the stored
    // array matches the hook's column-key format exactly).
    const visible = Object.keys(newModel).filter(f => f !== "_rowNum" && newModel[f]);
    try {
      localStorage.setItem("escrituracion_visibleCols", JSON.stringify(visible));
    } catch {
      // storage unavailable — non-fatal
    }
  };

  // ———— CSV export (DG-9, INV-1) ————
  // D5: export the currently sorted/filtered rows from the grid via
  // apiRef.getSortedRows(); fall back to hook.sortedData while the grid is
  // not mounted. useExportCSV itself is untouched.
  const exportColumns = hook.allColumns
    .filter(c => hook.visibleCols.includes(c.key))
    .map(c => ({ key: c.key, label: c.label }));

  const [exportRows, setExportRows] = useState([]);
  useEffect(() => {
    // apiRef.current is a stub ({}) until the grid mounts; only call
    // getSortedRows once the real api is attached (D5).
    const rows =
      apiRef.current && typeof apiRef.current.getSortedRows === "function"
        ? apiRef.current.getSortedRows()
        : hook.sortedData;
    setExportRows(rows);
  }, [hook.sortedData, sortModel]);

  const { exportCSV } = useExportCSV({
    data: exportRows,
    filename: `Escrituracion_${new Date().toISOString().slice(0, 10)}`,
    columns: exportColumns,
  });

  // DG-8: empty state mirrors the previous table ("No hay registros" +
  // contextual hint + clear-filters action when filters are active).
  const hasActiveFilters = ["departamento", "localidad", "barrio", "estado", "escribano", "dni"].some(k => {
    const v = filters[k];
    return v != null && v !== "" && v !== "Todos";
  });
  const emptyState = {
    message: "No hay registros",
    hint: hasActiveFilters
      ? "Probá sacando algunos filtros o limpiando la búsqueda"
      : "No hay datos para mostrar en esta sección",
    actionLabel: hasActiveFilters ? "Limpiar todos los filtros" : undefined,
    onAction: hasActiveFilters ? () => resetFilters() : undefined,
  };

  return (
    <>
      {/* Toolbar */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5, mb: 1.5 }}>
        <Button
          onClick={exportCSV}
          title="Exportar CSV"
          size="small"
          variant="outlined"
          startIcon={<FileDownload sx={{ fontSize: 16 }} />}
          sx={{
            fontSize: 12,
            fontWeight: 600,
            color: "text.secondary",
            borderColor: "divider",
            "&:hover": { color: "text.primary", borderColor: "text.disabled", bgcolor: "action.hover" },
          }}
        >
          Exportar
        </Button>
      </Box>

      <SelectFilters data={hook.processedData} filters={filters} setFilters={setFilters} resetFilters={resetFilters} />

      <StatusCards
        counts={hook.counts}
        totalCount={hook.processedData.length}
        selectedEstado={hook.selectedEstado}
        setSelectedEstado={hook.setSelectedEstado}
        setFilters={setFilters}
        setPage={() => setPaginationModel(p => ({ ...p, page: 0 }))}
        ipvCount={ipvCount}
      />

      {loading && <LoadingState py={8} />}
      {error && <ErrorAlert message={error} sx={{ my: 2 }} />}

      {!loading && !error && (
        <div>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              p: 1.5,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              mb: 2,
              fontSize: 12,
              fontWeight: 500,
              color: "text.secondary",
            }}
          >
            {LEGEND_ITEMS.map(({ cls, label }) => (
              <Box key={cls} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: (semaphore[cls] ?? semaphore.gray).text,
                  }}
                />
                <Box component="span">{label}</Box>
              </Box>
            ))}
            <Box component="span" sx={{ ml: "auto", fontSize: 10, color: "text.secondary" }}>
              {hook.sortedData.length} registros
            </Box>
          </Box>

          <DataTable
            rows={gridRows}
            columns={gridColumns}
            getRowId={row => row.id ?? row._gridId}
            apiRef={apiRef}
            height={560}
            showToolbar
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            columnVisibilityModel={visibilityModel}
            onColumnVisibilityModelChange={handleColumnVisibilityModelChange}
            emptyState={emptyState}
          />
        </div>
      )}

      <SlidePanel
        isOpen={!!hook.intervalDetail}
        onClose={() => hook.setIntervalDetail(null)}
        title={hook.intervalDetail ? hook.intervalDetail.interval.fullLabel : "Detalle"}
      >
        <DateDetailPanel intervalDetail={hook.intervalDetail} />
      </SlidePanel>
    </>
  );
}