import React, { useRef, useMemo } from "react";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import useExportCSV from "./hooks/useExportCSV";
import useEscrituracion, { TABLE_COLUMNS, INTERVALS } from "./hooks/useEscrituracion";
import SelectFilters from "./components/SelectFilters";
import SlidePanel from "./components/SlidePanel";
import ColumnToggle from "./components/ColumnToggle";
import MatrixTable from "./components/MatrixTable";
import StatusCards from "./components/StatusCards";
import DateDetailPanel from "./components/DateDetailPanel";
import FileDownload from '@mui/icons-material/FileDownload';
import ViewColumn from '@mui/icons-material/ViewColumn';

const itemsPerPage = 15;

export default function Escrituracion() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { filters, setFilters } = useFilters({
    departamento: "Todos", localidad: "Todos", barrio: "Todos",
    estado: "Todos", escribano: "", dni: ""
  });

  const rawData = Array.isArray(data) ? data : [];
  const hook = useEscrituracion(rawData, filters, setFilters);

  // ── Demora por escribano (Acep→Firma > 20d hábiles) ──
  const ESCROW_ESPERADO = 20;
  const demoraPorEscribano = useMemo(() => {
    if (!hook.processedData.length) return [];
    const byEscribano = {};

    hook.processedData.forEach(item => {
      const val = item.diferencia_aceptacion_firma;
      if (val === "N/A" || val == null) return;
      const n = Number(val);
      if (isNaN(n) || n <= ESCROW_ESPERADO) return;

      const nombre = item["Escribano Designado"] ?? item.Escribano ?? item.escribano ?? "";
      if (!nombre) return;

      if (!byEscribano[nombre]) byEscribano[nombre] = { count: 0, items: [] };
      byEscribano[nombre].count++;
      byEscribano[nombre].items.push({
        beneficiario: item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? "—",
        dni: item.DNI || "—",
        depto: item.Departamento || "—",
        barrio: item.Barrio || "—",
        dias: n,
        demora: n - ESCROW_ESPERADO,
      });
    });

    return Object.values(byEscribano)
      .map(e => ({ ...e, avgDemora: Math.round(e.items.reduce((s, i) => s + i.demora, 0) / e.items.length) }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [hook.processedData]);

  const demoraTotal = demoraPorEscribano.reduce((s, e) => s + e.items.length, 0);

  const exportDemoraCSV = () => {
    if (!demoraPorEscribano.length) return;
    const rows = [];
    demoraPorEscribano.forEach(esc => {
      esc.items.forEach(item => {
        rows.push({
          Escribano: esc.nombre,
          Beneficiario: item.beneficiario,
          DNI: item.dni,
          Departamento: item.depto,
          Barrio: item.barrio,
          "Días Acep→Firma": item.dias,
          "Días de Demora": item.demora,
        });
      });
    });
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${r[h]}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Demora_Escribanos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportColumns = hook.allColumns
    .filter(c => hook.visibleCols.includes(c.key))
    .map(c => ({ key: c.key, label: c.label }));

  const { exportCSV } = useExportCSV({
    data: hook.sortedData,
    filename: `Escrituracion_${new Date().toISOString().slice(0, 10)}`,
    columns: exportColumns,
  });

  const tableRef = useRef(null);

  function renderPagination() {
    if (hook.totalPages <= 1) return null;
    const pages = [];
    pages.push(
      <button key={1} className={hook.safePage === 1 ? "active" : ""} onClick={() => hook.setPage(1)}>1</button>
    );
    if (hook.totalPages > 6) {
      let start = Math.max(2, hook.safePage - 2);
      let end = Math.min(hook.totalPages - 1, hook.safePage + 2);
      if (start > 2) pages.push(<span key="start-ellipsis" className="ellipsis">...</span>);
      for (let i = start; i <= end; i++) {
        pages.push(
          <button key={i} className={hook.safePage === i ? "active" : ""} onClick={() => hook.setPage(i)}>{i}</button>
        );
      }
      if (end < hook.totalPages - 1) pages.push(<span key="end-ellipsis" className="ellipsis">...</span>);
      pages.push(
        <button key={hook.totalPages} className={hook.safePage === hook.totalPages ? "active" : ""} onClick={() => hook.setPage(hook.totalPages)}>{hook.totalPages}</button>
      );
    } else {
      for (let i = 2; i <= hook.totalPages; i++) {
        pages.push(
          <button key={i} className={hook.safePage === i ? "active" : ""} onClick={() => hook.setPage(i)}>{i}</button>
        );
      }
    }
    return (
      <div className="pagination">
        <button onClick={() => hook.setPage(Math.max(1, hook.safePage - 1))} disabled={hook.safePage === 1}>&lt;</button>
        {pages}
        <button onClick={() => hook.setPage(Math.min(hook.totalPages, hook.safePage + 1))} disabled={hook.safePage === hook.totalPages}>&gt;</button>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar-row">
        <button className="toolbar-btn" onClick={exportCSV} title="Exportar CSV">
          <FileDownload sx={{ fontSize: 16 }} />
          Exportar
        </button>
        <div className="toolbar-group-right">
          <button
            className={`toolbar-btn ${hook.showColToggle ? "active" : ""}`}
            onClick={() => hook.setShowColToggle(prev => !prev)}
            title="Mostrar/ocultar columnas"
          >
            <ViewColumn sx={{ fontSize: 16 }} />
            Columnas
          </button>
          {hook.showColToggle && (
            <ColumnToggle
              columns={hook.allColumns}
              groups={hook.allGroups}
              visibleCols={hook.visibleCols}
              onToggle={hook.toggleColumn}
              onClose={() => hook.setShowColToggle(false)}
            />
          )}
        </div>
      </div>

      <SelectFilters data={hook.processedData} filters={filters} setFilters={setFilters} />

      <StatusCards
        counts={hook.counts}
        totalCount={hook.processedData.length}
        selectedEstado={hook.selectedEstado}
        setSelectedEstado={hook.setSelectedEstado}
        setFilters={setFilters}
        setPage={hook.setPage}
      />

      {/* ── Demora por Escribano (Acep→Firma) ── */}
      {demoraTotal > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Demora por Escribano</h3>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Acep→Firma &gt; {ESCROW_ESPERADO}d
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-slate-400">{demoraTotal} casos</span>
              <button
                onClick={exportDemoraCSV}
                className="toolbar-btn text-[11px]"
                title="Exportar listado de demora"
              >
                <FileDownload sx={{ fontSize: 14 }} />
                Descargar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {demoraPorEscribano.map(esc => (
              <div key={esc.nombre} className="border border-slate-100 rounded-xl p-3 hover:border-slate-200 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800 truncate">{esc.nombre}</span>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    {esc.items.length} {esc.items.length === 1 ? "caso" : "casos"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  Promedio: +{esc.avgDemora}d de demora
                </div>
                <div className="space-y-1">
                  {esc.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 truncate">{item.beneficiario}</span>
                      <span className="font-bold text-red-600 ml-2 flex-shrink-0">+{item.demora}d</span>
                    </div>
                  ))}
                  {esc.items.length > 3 && (
                    <div className="text-[10px] text-slate-300 text-center">
                      +{esc.items.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="spinner"></div>
        </div>
      )}
      {error && <div className="alert alert-error my-4"><p>{error}</p></div>}

      {!loading && !error && (
        <div ref={tableRef}>
          <div className="semaforo-legend">
            <div className="legend-item">
              <span className="legend-color bg-green-500"></span>
              <span>Dentro del plazo</span>
            </div>
            <div className="legend-item">
              <span className="legend-color bg-yellow-500"></span>
              <span>Alerta (&gt; plazo)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color bg-red-500"></span>
              <span>Demora (&gt; +30%)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color bg-gray-400"></span>
              <span>Sin datos</span>
            </div>
            <div className="legend-item text-slate-400 ml-auto text-[10px]">
              {hook.sortedData.length} registros
            </div>
          </div>

          <MatrixTable
            allColumns={hook.allColumns}
            visibleCols={hook.visibleCols}
            sortCol={hook.sortCol}
            sortOrder={hook.sortOrder}
            handleSort={hook.handleSort}
            paginatedData={hook.paginatedData}
            safePage={hook.safePage}
            itemsPerPage={itemsPerPage}
            filterByField={hook.filterByField}
            setIntervalDetail={hook.setIntervalDetail}
            filters={filters}
          />

          {renderPagination()}
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
