// Why not use atomWithStorage?
// Because atomWithStorage is async (*kind of), the initial value is always undefined,
// as the value is not hydrated in the first render.
// This is a synchronous version of atomWithStorage,
// so it provides the initial value as the actual value stored in localStorage.

import { atom } from "jotai";
import type { Getter, SetStateAction, Setter } from "jotai";
import { RESET, createJSONStorage } from "jotai/utils";

export default function atomWithSyncedStorage<Value>(
  key: string,
  initialValue: Value,
  storageType: "localStorage" | "sessionStorage" = "localStorage",
  overrideValue?: (get: Getter, set: Setter, update: SetStateAction<Value>) => Value,
) {
  const storage = createJSONStorage<Value>(() =>
    typeof window !== "undefined"
      ? storageType === "sessionStorage"
        ? window.sessionStorage
        : window.localStorage
      : (undefined as unknown as Storage),
  );

  const baseAtom = atom(storage.getItem(key, initialValue));

  const derivedAtom = atom(
    (get) => get(baseAtom),
    (get, set, update: SetStateAction<Value>) => {
      const nextValue =
        typeof update === "function"
          ? (update as (prev: Value) => Value | typeof RESET)(get(baseAtom))
          : update;
      if (nextValue === RESET) {
        set(baseAtom, initialValue);
        return storage.removeItem(key);
      }
      set(baseAtom, nextValue);

      // nextValue sometimes exceeds storage quota limits, it will throw error
      try {
        storage.setItem(key, nextValue);
      } catch (error) {
        const overridenValue = overrideValue?.(get, set, nextValue) || nextValue;
        storage.setItem(key, overridenValue);
      }
    },
  );

  return derivedAtom;
}
