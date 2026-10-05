"use client";

import { useState } from "react";
import { AssetChartPanel } from "./asset-chart-panel";

export function DashboardChart() {
  const [assetId, setAssetId] = useState("bitcoin");

  return (
    <AssetChartPanel assetId={assetId} onAssetChange={setAssetId} title="Selected asset chart" />
  );
}
