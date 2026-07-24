import React, { useMemo } from "react";
import useDataLoader from "./hooks/useDataLoader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function DashboardTab() {
  const { data, loading, error } = useDataLoader("escrituracion");

  const kpis = useMemo(() => {
    if (!Array.isArray(data)) return null;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const total = data.length;
    const enProceso = data.filter(item => item.Estado === "En Trámite").length;
    const finalizadasEsteMes = data.filter(item => {
      if (!item["Fecha de Firma"] || item["Fecha de Firma"] === "N/A") return false;
      const fechaFirma = new Date(item["Fecha de Firma"]);
      return fechaFirma.getMonth() === currentMonth && fechaFirma.getFullYear() === currentYear;
    }).length;

    const proximasDiezFirmas = data
      .filter(item => item["Fecha de Firma"] && item["Fecha de Firma"] !== "N/A")
      .sort((a, b) => new Date(a["Fecha de Firma"]) - new Date(b["Fecha de Firma"]))
      .slice(0, 10)
      .map(item => ({
        beneficiario: item.Beneficiarios ?? item.Beneficiario,
        dni: item.DNI,
        fechaFirma: item["Fecha de Firma"]
      }));

    // Monthly chart data (group by Fecha Ingreso Colegio)
    const monthlyData = {};
    data.forEach(item => {
      if (item["Fecha Ingreso Colegio de Escribanos"] && item["Fecha Ingreso Colegio de Escribanos"] !== "N/A") {
        const fecha = new Date(item["Fecha Ingreso Colegio de Escribanos"]);
        const monthKey = fecha.toLocaleString('es-ES', { month: 'short' });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      }
    });

    const chartData = Object.entries(monthlyData)
      .map(([month, count]) => ({ month, escrituraciones: count }))
      .sort((a, b) => {
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return months.indexOf(a.month.toLowerCase()) - months.indexOf(b.month.toLowerCase());
      });

    return {
      total,
      enProceso,
      finalizadasEsteMes,
      proximasDiezFirmas,
      chartData,
      loading,
      error
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error my-4">
        <p>{error}</p>
      </div>
    );
  }

  if (!kpis) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="kpi-card">
          <div className="label">Total Escrituraciones</div>
          <div className="value">{kpis.total.toLocaleString()}</div>
          <div className="meta">En total</div>
        </div>

        <div className="kpi-card">
          <div className="label">En Proceso</div>
          <div className="value">{kpis.enProceso.toLocaleString()}</div>
          <div className="meta">Actualmente en trámite</div>
        </div>

        <div className="kpi-card">
          <div className="label">Finalizadas este Mes</div>
          <div className="value">{kpis.finalizadasEsteMes.toLocaleString()}</div>
          <div className="meta">Firmadas en {new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</div>
        </div>

        <div className="kpi-card">
          <div className="label">Próximas 10 Firmas</div>
          <div className="value">{kpis.proximasDiezFirmas.length}</div>
          <div className="meta">Programadas próximamente</div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="chart-container">
        <h3 className="chart-title">Escrituraciones por Mes (Ingreso Colegio)</h3>
        {kpis.chartData && kpis.chartData.length > 0 ? (
          <BarChart width={0} height={300} data={kpis.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="escrituraciones" fill="#3b82f6" />
          </BarChart>
        ) : (
          <div className="text-center py-12 text-slate-400">
            No hay datos disponibles para mostrar el gráfico
          </div>
        )}
      </div>

      {/* Próximas 10 firmas */}
      {kpis.proximasDiezFirmas.length > 0 && (
        <div className="chart-container">
          <h3 className="chart-title">Próximas 10 Firmas Programadas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Beneficiario</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">DNI</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fecha de Firma</th>
                </tr>
              </thead>
              <tbody>
                {kpis.proximasDiezFirmas.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.beneficiario}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.dni}</td>
                    <td className="px-4 py-3">{item.fechaFirma}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
