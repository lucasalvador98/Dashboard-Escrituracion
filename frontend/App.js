import React, { useEffect, useState } from "react";
import API_CONFIG from "./config-api";

const API_URL = API_CONFIG.BASE_URL_BACKEND;

function Escrituracion() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/escrituracion`)
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
            <th>ID</th>
            <th>Nombre</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.id}</td>
              <td>{item.nombre}</td>
              <td>{item.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Escrituracion;
