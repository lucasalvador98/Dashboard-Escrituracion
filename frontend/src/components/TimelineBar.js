import React from "react";
import { INTERVALS, diffClass } from "../lib/deadlines";

// Stages configuration - derived from the shared INTERVALS
const STAGES = [
  { label: "Ingreso Colegio", field: INTERVALS[0].fecha1 },
  { label: "Sorteo", field: INTERVALS[0].fecha2 },
  { label: "Aceptación", field: INTERVALS[1].fecha2 },
  { label: "Firma", field: INTERVALS[2].fecha2 },
  { label: "Ingreso Registro", field: INTERVALS[3].fecha2 },
  { label: "Testimonio", field: INTERVALS[4].fecha2 },
];

export default function TimelineBar({ stages = STAGES, intervals = [], item, highlightedInterval }) {
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
          
          let bgColor = "bg-slate-200";
          if (status === "filled") {
            if (interval) {
              const val = item[interval.key];
              bgColor = diffClass(val, interval.esperado);
            }
          } else if (status === "filled-future") {
            bgColor = "bg-primary-400";
          }

          const relevantInterval = idx > 0 && intervals[idx - 1] ? intervals[idx - 1] : null;
          const isHighlighted = relevantInterval && highlightedInterval && highlightedInterval === relevantInterval.key;

          return (
            <div key={idx} className="flex flex-col items-center">
              <div 
                className={`tl-segment ${bgColor} ${status === "empty" ? "opacity-30" : "opacity-100"} ${isHighlighted ? "ring-2 ring-primary-500 shadow-md transform scale-110" : ""}`}
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
