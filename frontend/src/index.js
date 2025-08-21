import React from "react";
import { createRoot } from "react-dom/client";
import Escrituracion from "./Escrituracion";

const container = document.getElementById("root");
const root = createRoot(container); // Usar createRoot en lugar de ReactDOM.render

root.render(
  <React.StrictMode>
    <Escrituracion />
  </React.StrictMode>
);