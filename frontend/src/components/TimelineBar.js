import React from "react";

// Stages configuration - derived from INTERVALS logic
const STAGES = [
  { label: "Ingreso Colegio", field: "Fecha Ingreso Colegio de Escribanos" },
  { label: "Sorteo", field: "Fecha de Sorteo" },
  { label: "Aceptación", field: "Fecha de Aceptacion" },
  { label: "Firma", field: "Fecha de Firma" },
  { label: "Ingreso Registro", field: "Fecha de Ingreso al Registro" },
  { label: "Testimonio", field: "Fecha de envío PT digital" },
];

function diffClass(val, esperado) {
  if (val === "N/A" || val === "" || val == null) return "gray";
  const n = Number(val);
  if (isNaN(n)) return "gray";
  if (n <= esperado) return "green";
  if (n <= Math.ceil(esperado * 1.3)) return "yellow";
  return "red";
}

export default function TimelineBar({ stages = STAGES, intervals = [], item }) {
  if (!item) return null;

  const getSegmentStatus = (stage, interval) => {
    if (!interval) return "empty";
    const val = item[interval.key];
    if (val === "N/A" || val === "" || val == null) return "filled-future";
    return "filled";
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-2">
        {stages.map((stage, idx) => {
          const interval = intervals[idx];
          const status = interval ? getSegmentStatus(stage, interval) : "empty";
          
          let bgColor = "bg-gray-200";
          if (status === "filled") {
            if (interval) {
              const val = item[interval.key];
              bgColor = diffClass(val, interval.esperado);
            }
          } else if (status === "filled-future") {
            bgColor = "bg-blue-400";
          }

          return (
            <div key={idx} className="flex flex-col items-center">
              <div 
                className={`tl-segment ${bgColor} ${status === "empty" ? "opacity-30" : "opacity-100"}`}
                title={`${stage.label}: ${interval ? item[stage.field] || "—" : "—"}`}
              />
              <div className="text-xs text-slate-600 mt-1 text-center truncate max-w-[60px]">
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
