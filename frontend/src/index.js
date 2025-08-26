import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import './styles.css';

const container = document.getElementById("root");
const root = createRoot(container); // Usar createRoot en lugar de ReactDOM.render

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);