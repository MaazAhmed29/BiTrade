export type SupportedAsset = {
  id: string;
  symbol: string;
  name: string;
  pair: string | null;
  color: string;
  displayDecimals: number;
  stableReference: boolean;
};

export const SUPPORTED_ASSETS: readonly SupportedAsset[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    pair: "BTCUSDT",
    color: "#F7931A",
    displayDecimals: 2,
    stableReference: false,
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    pair: "ETHUSDT",
    color: "#627EEA",
    displayDecimals: 2,
    stableReference: false,
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether",
    pair: null,
    color: "#26A17B",
    displayDecimals: 2,
    stableReference: true,
  },
  {
    id: "bnb",
    symbol: "BNB",
    name: "BNB",
    pair: "BNBUSDT",
    color: "#F3BA2F",
    displayDecimals: 2,
    stableReference: false,
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    pair: "SOLUSDT",
    color: "#9945FF",
    displayDecimals: 2,
    stableReference: false,
  },
  {
    id: "xrp",
    symbol: "XRP",
    name: "XRP",
    pair: "XRPUSDT",
    color: "#5B636E",
    displayDecimals: 4,
    stableReference: false,
  },
  {
    id: "usd-coin",
    symbol: "USDC",
    name: "USD Coin",
    pair: "USDCUSDT",
    color: "#2775CA",
    displayDecimals: 2,
    stableReference: false,
  },
  {
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    pair: "DOGEUSDT",
    color: "#C2A633",
    displayDecimals: 5,
    stableReference: false,
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    pair: "ADAUSDT",
    color: "#0033AD",
    displayDecimals: 4,
    stableReference: false,
  },
  {
    id: "avalanche",
    symbol: "AVAX",
    name: "Avalanche",
    pair: "AVAXUSDT",
    color: "#E84142",
    displayDecimals: 2,
    stableReference: false,
  },
  {
    id: "tron",
    symbol: "TRX",
    name: "TRON",
    pair: "TRXUSDT",
    color: "#EF0027",
    displayDecimals: 4,
    stableReference: false,
  },
  {
    id: "chainlink",
    symbol: "LINK",
    name: "Chainlink",
    pair: "LINKUSDT",
    color: "#2A5ADA",
    displayDecimals: 2,
    stableReference: false,
  },
  {
    id: "toncoin",
    symbol: "TON",
    name: "Toncoin",
    pair: "TONUSDT",
    color: "#0098EA",
    displayDecimals: 2,
    stableReference: false,
  },
  {
    id: "shiba-inu",
    symbol: "SHIB",
    name: "Shiba Inu",
    pair: "SHIBUSDT",
    color: "#FFA409",
    displayDecimals: 8,
    stableReference: false,
  },
  {
    id: "polkadot",
    symbol: "DOT",
    name: "Polkadot",
    pair: "DOTUSDT",
    color: "#E6007A",
    displayDecimals: 2,
    stableReference: false,
  },
] as const;

export const SUPPORTED_ASSET_IDS: readonly string[] = SUPPORTED_ASSETS.map((asset) => asset.id);

export const ASSETS_BY_ID: ReadonlyMap<string, SupportedAsset> = new Map(
  SUPPORTED_ASSETS.map((asset) => [asset.id, asset]),
);

export const ASSETS_BY_SYMBOL: ReadonlyMap<string, SupportedAsset> = new Map(
  SUPPORTED_ASSETS.map((asset) => [asset.symbol, asset]),
);

export function getAssetById(assetId: string): SupportedAsset | undefined {
  return ASSETS_BY_ID.get(assetId);
}

export function isSupportedAssetId(assetId: string): boolean {
  return ASSETS_BY_ID.has(assetId);
}

export function getTradablePairs(): string[] {
  return SUPPORTED_ASSETS.flatMap((asset) => (asset.pair ? [asset.pair] : []));
}
