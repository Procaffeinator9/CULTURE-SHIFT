import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_WEIGHTS, type Draft, type Investigation, type Weights } from "./types.ts";

type LabState = {
  investigations: Investigation[];
  weights: Weights;
  draft: Draft | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setDraft: (draft: Draft | null) => void;
  setWeights: (weights: Weights) => void;
  upsert: (investigation: Investigation) => void;
  remove: (id: string) => void;
  clearAll: () => void;
};

export const useLab = create<LabState>()(
  persist(
    (set) => ({
      investigations: [],
      weights: DEFAULT_WEIGHTS,
      draft: null,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setDraft: (draft) => set({ draft }),
      setWeights: (weights) => set({ weights }),
      upsert: (investigation) =>
        set((state) => {
          const exists = state.investigations.some((item) => item.id === investigation.id);
          const investigations = exists
            ? state.investigations.map((item) => (item.id === investigation.id ? investigation : item))
            : [investigation, ...state.investigations];
          return { investigations };
        }),
      remove: (id) => set((state) => ({ investigations: state.investigations.filter((item) => item.id !== id) })),
      clearAll: () => set({ investigations: [], weights: DEFAULT_WEIGHTS, draft: null }),
    }),
    {
      name: "culture-shift-lab",
      skipHydration: true,
      partialize: (state) => ({ investigations: state.investigations, weights: state.weights }),
    },
  ),
);

export function newId(prefix: string): string {
  const cryptoId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${cryptoId}`;
}
