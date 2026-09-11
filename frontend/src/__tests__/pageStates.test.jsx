import React, { act } from "react";
import { createRoot } from "react-dom/client";
import LoadingState from "../components/ui/LoadingState";
import ErrorAlert from "../components/ui/ErrorAlert";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;

function render(node) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(node);
  });
}

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
});

describe("LoadingState / ErrorAlert (P7b-migrate)", () => {
  it("renders a themed CircularProgress without a message by default", () => {
    render(<LoadingState py={4} />);
    expect(container.querySelector(".MuiCircularProgress-root")).not.toBeNull();
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(container.textContent).toBe("");
  });

  it("renders the optional loading message", () => {
    render(<LoadingState py={12} message="Cargando datos..." />);
    expect(container.querySelector(".MuiCircularProgress-root")).not.toBeNull();
    expect(container.textContent).toContain("Cargando datos...");
  });

  it("renders an error Alert with the message and role=alert", () => {
    render(<ErrorAlert message="boom" sx={{ my: 2 }} />);
    expect(container.querySelector(".MuiAlert-standardError")).not.toBeNull();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).toContain("boom");
  });
});
