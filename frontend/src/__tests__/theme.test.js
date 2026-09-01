import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import IconButton from "@mui/material/IconButton";
import { ThemeModeProvider, useThemeMode } from "../theme/ThemeContext";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Consumer that holds its own local state + reads/toggles the theme mode.
// If the provider remounts the tree on toggle (TH-7 violation), counter resets.
function Probe() {
  const { mode, toggle } = useThemeMode();
  const [counter, setCounter] = useState(0);
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="counter">{counter}</span>
      <IconButton
        data-testid="toggle"
        onClick={() => {
          toggle();
          setCounter((c) => c + 1);
        }}
      />
    </div>
  );
}

let root;
let container;

function renderProvider() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <ThemeModeProvider>
        <Probe />
      </ThemeModeProvider>
    );
  });
}

function getMode() {
  return container.querySelector('[data-testid="mode"]').textContent;
}

function getCounter() {
  return container.querySelector('[data-testid="counter"]').textContent;
}

function clickToggle() {
  act(() => {
    container.querySelector('[data-testid="toggle"]').dispatchEvent(
      new MouseEvent("click", { bubbles: true })
    );
  });
}

afterEach(() => {
  window.localStorage.removeItem("app-theme-mode");
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
});

describe("ThemeModeProvider", () => {
  it("defaults to light when no stored preference exists", () => {
    renderProvider();
    expect(getMode()).toBe("light");
  });

  it("toggles to dark and persists the value to localStorage", () => {
    renderProvider();
    clickToggle();
    expect(getMode()).toBe("dark");
    expect(window.localStorage.getItem("app-theme-mode")).toBe("dark");
  });

  it("restores dark on load and persists toggle back to light", () => {
    window.localStorage.setItem("app-theme-mode", "dark");
    renderProvider();
    expect(getMode()).toBe("dark");
    clickToggle();
    expect(getMode()).toBe("light");
    expect(window.localStorage.getItem("app-theme-mode")).toBe("light");
  });

  it("treats an invalid stored value as light", () => {
    window.localStorage.setItem("app-theme-mode", "neon");
    renderProvider();
    expect(getMode()).toBe("light");
  });

  it("does not remount consumer state across a mode toggle (TH-7)", () => {
    renderProvider();
    expect(getCounter()).toBe("0");
    // Toggle both mode and the consumer's own state. If the provider remounted
    // the tree on mode change, the counter would reset to 0.
    clickToggle();
    clickToggle();
    expect(getMode()).toBe("light");
    expect(getCounter()).toBe("2");
  });
});
