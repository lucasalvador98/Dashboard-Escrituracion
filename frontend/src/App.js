import React, { useEffect, useState } from "react";

function Escrituracion() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`http://5.161.118.67:8507/escrituracion`)
      .then((response) => response.json())
      .then((data) => setData(data.data))
      .catch((error) => console.error("Error:", error));
  }, []);

  return (
    <div>
      <h1>Escrituración</h1>
      <table>
        <thead>
          <tr>
            <th>Fecha Ingreso Colegio</th>
            <th>Fecha Sorteo</th>
            <th>Días Ingreso-Sorteo</th>
            <th>Semáforo</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item["Fecha Ingreso Colegio de Escribanos"]}</td>
              <td>{item["Fecha de Sorteo"]}</td>
              <td>{item["diferencia_ingreso_sorteo"]}</td>
              <td>
                {item["diferencia_ingreso_sorteo"] <= 3
                  ? "🟢"
                  : item["diferencia_ingreso_sorteo"] <= 7
                  ? "🟡"
                  : "🔴"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Escrituracion;
