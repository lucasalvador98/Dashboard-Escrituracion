import React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";

/**
 * Cascading filter bar (UI-3). Rebuilt on MUI TextField(select): same props
 * contract ({ data, filters, setFilters, resetFilters }), same option lists and
 * values, same cascading reset semantics (Departamento resets Localidad+Barrio,
 * Localidad resets Barrio), same URL-state wiring through setFilters, and the
 * same "Limpiar filtros" reset button (disabled when no filter is active).
 *
 * Labels stay identical (INV-3) and every color comes from theme tokens, so the
 * controls stay legible in dark mode.
 */

// Uppercase micro-label shared by every control (matches the previous CSS).
const labelSx = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export default function SelectFilters({ data = [], filters = {}, setFilters, resetFilters }) {
  const normalize = v => (v == null || v === "" ? "Todos" : v);

  const unique = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();

  const getEscribano = i => i["Escribano Designado"] ?? i.Escribano ?? i.escribano ?? "";

  const hasActive = Object.keys(filters).some(k => {
    const v = filters[k];
    return v != null && v !== "" && normalize(v) !== "Todos";
  });

  const departamentos = ["Todos", ...unique(data.map(i => i.Departamento))];
  const localidadesAll = unique(data.map(i => i.Localidad));
  const barriosAll = unique(data.map(i => i.Barrio));
  const estados = ["Todos", ...unique(data.map(i => i.Estado))];
  const escribanosList = unique(data.map(i => getEscribano(i)));

  // Conteo de demoras por escribano (Acep→Firma > 20d)
  const demoraCount = {};
  data.forEach(i => {
    const val = i.diferencia_aceptacion_firma;
    if (val === "N/A" || val == null) return;
    if (Number(val) > 20) {
      const nombre = getEscribano(i);
      if (nombre) demoraCount[nombre] = (demoraCount[nombre] || 0) + 1;
    }
  });

  // Filtrado dependiente
  const localidades = filters.departamento && filters.departamento !== "Todos"
    ? ["Todos", ...unique(data.filter(x => x.Departamento === filters.departamento).map(x => x.Localidad))]
    : ["Todos", ...localidadesAll];

  const barrios = (filters.departamento && filters.departamento !== "Todos")
    ? (filters.localidad && filters.localidad !== "Todos"
      ? ["Todos", ...unique(data.filter(x => x.Departamento === filters.departamento && x.Localidad === filters.localidad).map(x => x.Barrio))]
      : ["Todos", ...unique(data.filter(x => x.Departamento === filters.departamento).map(x => x.Barrio))])
    : ["Todos", ...barriosAll];

  const escribanoValue = filters.escribano || "Todos";

  const selectProps = {
    select: true,
    size: "small",
    fullWidth: true,
    InputLabelProps: { sx: labelSx },
  };

  return (
    <Paper
      component="section"
      aria-label="Filtros"
      elevation={1}
      sx={{ p: 1.5, mb: 3, border: 1, borderColor: "divider" }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(6, 1fr)" },
          gap: 2,
          alignItems: "end",
        }}
      >
        <TextField
          {...selectProps}
          label="Departamento"
          value={normalize(filters.departamento)}
          onChange={e => setFilters({ departamento: e.target.value, localidad: "Todos", barrio: "Todos" })}
        >
          {departamentos.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>

        <TextField
          {...selectProps}
          label="Localidad"
          value={normalize(filters.localidad)}
          onChange={e => setFilters({ localidad: e.target.value, barrio: "Todos" })}
        >
          {localidades.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
        </TextField>

        <TextField
          {...selectProps}
          label="Barrio"
          value={normalize(filters.barrio)}
          onChange={e => setFilters({ barrio: e.target.value })}
        >
          {barrios.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
        </TextField>

        <TextField
          {...selectProps}
          label="Estado"
          value={normalize(filters.estado)}
          onChange={e => setFilters({ estado: e.target.value })}
        >
          {estados.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>

        <TextField
          {...selectProps}
          label="Escribano"
          value={escribanoValue}
          onChange={e => setFilters({ escribano: e.target.value === "Todos" ? "" : e.target.value })}
        >
          {["Todos", ...escribanosList].map(s => {
            const count = s === "Todos" ? 0 : (demoraCount[s] || 0);
            return (
              <MenuItem key={s} value={s}>
                {count > 0 ? `${s} (${count} demora)` : s}
              </MenuItem>
            );
          })}
        </TextField>

        <TextField
          label="DNI"
          type="text"
          size="small"
          fullWidth
          value={filters.dni || ""}
          onChange={e => setFilters({ dni: e.target.value })}
          placeholder="Buscar por DNI..."
          InputLabelProps={{ shrink: true, sx: labelSx }}
        />

        {resetFilters && (
          <Button
            variant="outlined"
            onClick={() => resetFilters()}
            disabled={!hasActive}
            title="Restablecer todos los filtros"
            sx={{
              height: 40,
              fontSize: 12,
              fontWeight: 600,
              color: "text.secondary",
              borderColor: "divider",
              "&:hover:not(:disabled)": {
                borderColor: "error.main",
                color: "error.main",
                bgcolor: "action.hover",
              },
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </Box>
    </Paper>
  );
}