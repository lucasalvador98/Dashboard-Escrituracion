import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useChartPalette } from "../theme/charts";
import { ThemeModeProvider } from "../theme/ThemeContext";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// D7/TH-6 smoke: the recharts palette must derive from the MUI theme so charts
// stay legible in both modes. Probing the hook directly is deterministic —
// recharts SVG internals do not render reliably in jsdom.
function PaletteProbe() {
  const p = useChartPalette();
  return <div data-testid="palette" data-palette={JSON.stringify(p)} />;
}

let root;
let container;

function renderProbe() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <ThemeModeProvider>
        <PaletteProbe />
      </ThemeModeProvider>
    );
  });
}

function palette() {
  return JSON.parse(container.querySelector('[data-testid="palette"]').dataset.palette);
}

afterEach(() => {
  localStorage.clear();
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  jest.restoreAllMocks();
});

describe("useChartPalette (D7)", () => {
  it("maps recharts tokens from the light theme", () => {
    renderProbe();
    const p = palette();
    expect(p.bar).toBe("#7c3aed"); // primary.main
    expect(p.line).toBe("#ef4444"); // error.main
    expect(p.grid).toBe("#e2e8f0"); // divider
    expect(p.axis).toBe("#64748b"); // text.secondary
    expect(p.tooltip.background).toBe("#ffffff"); // background.paper
    expect(p.tooltip.border).toBe("1px solid #e2e8f0");
  });

  it("keeps charts legible in dark mode (paper surface + tinted cursor)", () => {
    localStorage.setItem("app-theme-mode", "dark");
    renderProbe();
    const p = palette();
    expect(p.bar).toBe("#7c3aed"); // primary.main unchanged
    expect(p.line).toBe("#ef4444"); // error.main unchanged
    expect(p.grid).toBe("rgba(148, 163, 184, 0.2)"); // dark divider
    expect(p.axis).toBe("#94a3b8"); // dark text.secondary
    expect(p.tooltip.background).toBe("#171422"); // dark paper
    expect(p.tooltip.border).toBe("1px solid rgba(148, 163, 184, 0.2)");
    expect(p.cursor).toMatch(/^rgba\(124, 58, 237, /); // violet-tinted hover band
  });
});