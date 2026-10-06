"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type SelectedAssetValue = {
  assetId: string;
  setAssetId: (assetId: string) => void;
};

const SelectedAssetContext = createContext<SelectedAssetValue | null>(null);

export function SelectedAssetProvider({ children }: { children: ReactNode }) {
  const [assetId, setAssetId] = useState("bitcoin");
  return (
    <SelectedAssetContext.Provider value={{ assetId, setAssetId }}>
      {children}
    </SelectedAssetContext.Provider>
  );
}

export function useSelectedAsset(): SelectedAssetValue | null {
  return useContext(SelectedAssetContext);
}
