import React, { useRef } from "react";
import useDataLoader from "./hooks/useDataLoader";
import useFilters from "./hooks/useFilters";
import useExportCSV from "./hooks/useExportCSV";
import useEscrituracion, { TABLE_COLUMNS, INTERVALS } from "./hooks/useEscrituracion";
import SelectFilters from "./components/SelectFilters";
import SlidePanel from "./components/SlidePanel";
import MatrixTable from "./components/MatrixTable";
import StatusCards from "./components/StatusCards";
import DateDetailPanel from "./components/DateDetailPanel";
import FileDownload from '@mui/icons-material/FileDownload';

const itemsPerPage = 15;

export default function Escrituracion() {
  const { data, loading, error } = useDataLoader("escrituracion");
  const { filters, setFilters, resetFilters } = useFilters({
    departamento: "Todos", localidad: "Todos", barrio: "Todos",
    estado: "Todos", escribano: "", dni: ""
  });

  const rawData = Array.isArray(data) ? data : [];
  const hook = useEscrituracion(rawData, filters, setFilters);

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
      </div>

      <SelectFilters data={hook.processedData} filters={filters} setFilters={setFilters} resetFilters={resetFilters} />

      <StatusCards
        counts={hook.counts}
        totalCount={hook.processedData.length}
        selectedEstado={hook.selectedEstado}
        setSelectedEstado={hook.setSelectedEstado}
        setFilters={setFilters}
        setPage={hook.setPage}
      />

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
            allGroups={hook.allGroups}
            toggleColumn={hook.toggleColumn}
            showColToggle={hook.showColToggle}
            setShowColToggle={hook.setShowColToggle}
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
