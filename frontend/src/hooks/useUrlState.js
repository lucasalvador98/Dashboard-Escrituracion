import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * useUrlState — single URL-synced view-state mechanism (design D3/D4/D5).
 *
 * Replaces DashboardTab's replaceState filters and the state-only useFilters
 * hook: the URL query string is the single source of truth for per-tab view
 * state, surviving refresh and back/forward navigation.
 *
 * Param naming (D4):
 *  - shared root keys (escribano, estado) map to their bare name so they sync
 *    across tabs;
 *  - scoped keys map to `<scope>_<key>` so tabs do not leak state;
 *  - paramMap overrides naming for legacy params (dashboard depto/desde/hasta/tab).
 *
 * Writes (D5): set() merges into the existing query string — never a blind
 * replace — and pushes a history entry. Keys listed in `replaceKeys` (free-text,
 * keystroke-scale inputs such as dni) replace in place so typing does not spam
 * history (D11 rationale). Both object partials and functional updaters are
 * accepted (functional form mirrors the removed useFilters API).
 *
 * Defaults are omitted from the URL (D4): "Todos", "", and any value equal to
 * the key's default serialize to nothing.
 *
 * Config is expected to be static per mount (callers pass literals).
 */
export default function useUrlState({
  scope,
  defaults = {},
  sharedKeys = ["escribano", "estado"],
  paramMap = {},
  scopedKeys = [],
  replaceKeys = [],
  coerce = {},
}) {
  const cfg = useRef({ scope, defaults, sharedKeys, paramMap, scopedKeys, replaceKeys, coerce }).current;
  const [searchParams, setSearchParams] = useSearchParams();
  const { defaults: D, paramMap: PM, scopedKeys: SK, coerce: C, replaceKeys: RK } = cfg;

  const paramName = useCallback(
    (key) => {
      if (PM[key]) return PM[key];
      if (SK.includes(key)) return `${scope}_${key}`;
      return key; // shared root key
    },
    [PM, SK, scope]
  );

  const state = useMemo(() => {
    const out = { ...D };
    Object.keys(D).forEach(key => {
      const raw = searchParams.get(paramName(key));
      if (raw == null) return;
      const c = C[key];
      out[key] = c ? c(raw, D[key]) : raw;
    });
    return out;
  }, [searchParams, D, C, paramName]);

  // Refs let set()/reset() chain correctly when several writes happen in the
  // same tick (e.g. filterByField sets escribano then page): each write merges
  // onto the pending params instead of the last rendered ones.
  const stateRef = useRef(state);
  const searchParamsRef = useRef(searchParams);
  const pendingRef = useRef(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { searchParamsRef.current = searchParams; }, [searchParams]);
  useEffect(() => { pendingRef.current = null; }, [searchParams]);

  const serialize = useCallback(
    (nextState, base) => {
      const next = new URLSearchParams(base);
      Object.keys(D).forEach(key => {
        const name = paramName(key);
        const val = nextState[key];
        if (val == null || val === "" || val === "Todos" || String(val) === String(D[key])) {
          next.delete(name);
        } else {
          next.set(name, String(val));
        }
      });
      return next;
    },
    [D, paramName]
  );

  const set = useCallback(
    (updater) => {
      const partial = typeof updater === "function" ? updater(stateRef.current) : updater;
      const base = pendingRef.current ?? searchParamsRef.current;
      const nextState = { ...stateRef.current, ...partial };
      stateRef.current = nextState;
      const next = serialize(nextState, base);
      pendingRef.current = next;
      const onlyReplaceKeys = Object.keys(partial).every(k => RK.includes(k));
      setSearchParams(next, { replace: onlyReplaceKeys });
    },
    [serialize, RK, setSearchParams]
  );

  const reset = useCallback(() => {
    const base = pendingRef.current ?? searchParamsRef.current;
    const next = new URLSearchParams(base);
    Object.keys(D).forEach(key => next.delete(paramName(key)));
    stateRef.current = { ...D };
    pendingRef.current = next;
    setSearchParams(next, { replace: false });
  }, [D, paramName, setSearchParams]);

  return { state, set, reset };
}