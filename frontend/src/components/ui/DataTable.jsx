import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { DataGrid, GridToolbarColumnsButton, GridToolbarDensitySelector } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";

// Spanish locale for DataGrid (DG-3/4 built-in controls stay in Spanish).
const esESLocaleText = esES.components.MuiDataGrid.defaultProps.localeText;

// Default toolbar: column selector (replaces ColumnToggle, D4) + density.
// Export is intentionally NOT included here — CSV export stays on the page
// via useExportCSV (DG-9, INV-1) so the output format never changes.
function DefaultToolbar() {
  return (
    <Box sx={{ display: "flex", gap: 0.5, p: 0.5 }}>
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
    </Box>
  );
}

// Custom empty state (DG-8): "No hay registros" + contextual hint + optional
// clear-filters action. Content is injected via the `emptyState` prop.
function NoRowsOverlay({ message = "No hay registros", hint, actionLabel, onAction }) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={0.5}
      sx={{ height: "100%", p: 3, textAlign: "center" }}
    >
      <span role="img" aria-label="Sin resultados" style={{ fontSize: 28 }}>🔍</span>
      <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 500 }}>
        {message}
      </Typography>
      {hint ? (
        <Typography variant="caption" sx={{ color: "text.secondary", maxWidth: 320 }}>
          {hint}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button size="small" onClick={onAction} sx={{ mt: 0.5, textTransform: "none" }}>
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  );
}

/**
 * Reusable @mui/x-data-grid v6 wrapper (design D4).
 *
 * Controlled pagination / sorting / column visibility are passed through as
 * props so pages keep ownership of the state (D5). Defaults:
 *  - esES locale
 *  - compact density + auto row height
 *  - GridToolbar (columns selector + density) when `showToolbar`
 *  - custom NoRowsOverlay driven by `emptyState`
 *
 * Props: columns, rows, getRowId, loading, height, apiRef, onRowClick,
 * paginationModel, onPaginationModelChange, sortModel, onSortModelChange,
 * columnVisibilityModel, onColumnVisibilityModelChange, showToolbar,
 * emptyState, initialState, slots, slotProps.
 */
export default function DataTable({
  columns,
  rows,
  getRowId,
  loading = false,
  height = 560,
  apiRef,
  onRowClick,
  paginationModel,
  onPaginationModelChange,
  sortModel,
  onSortModelChange,
  columnVisibilityModel,
  onColumnVisibilityModelChange,
  showToolbar = false,
  emptyState = {},
  initialState = {},
  slots = {},
  slotProps = {},
}) {
  const toolbar = slots.toolbar ?? (showToolbar ? DefaultToolbar : undefined);

  return (
    <Box
      sx={{
        width: "100%",
        height,
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        loading={loading}
        apiRef={apiRef}
        onRowClick={onRowClick}
        localeText={esESLocaleText}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        pageSizeOptions={[15]}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={onColumnVisibilityModelChange}
        disableColumnFilter
        disableRowSelectionOnClick
        initialState={{ ...initialState, density: "compact" }}
        getRowHeight={() => "auto"}
        slots={{ toolbar, noRowsOverlay: NoRowsOverlay, ...slots }}
        slotProps={{ noRowsOverlay: { ...emptyState }, ...slotProps }}
        sx={{
          border: "none",
          "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700 },
          "& .MuiDataGrid-columnHeaders": { bgcolor: "action.hover" },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": { outline: "none" },
          "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
        }}
      />
    </Box>
  );
}
