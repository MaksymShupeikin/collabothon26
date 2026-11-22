import { dict } from "../../shared/lib/i18n.core.ts";

// Real, widely known companies. Prices are mock values in EUR, not live data.
// WKN/ISIN are the real identifiers so the search behaves like comdirect's (WKN, ISIN, Name).
export type Company = {
  sym: string;
  name: string; // comdirect-style instrument name
  short: string; // short name for tight spots
  wkn: string;
  isin: string;
  type: "Aktie" | "ETF";
  sector: string;
  price: number; // price on game day 0, EUR
  vol: number; // daily volatility
  drift: number; // daily drift
};

export const ETF_SYM = "MSCIW";
export const DAX_ETF = "DAXETF";

export const COMPANIES: Company[] = [
  { sym: "DTE", name: "Deutsche Telekom AG Namens-Aktien o.N.", short: "Deutsche Telekom", wkn: "555750", isin: "DE0005557508", type: "Aktie", sector: "Telecom", price: 29.84, vol: 0.011, drift: 0.0003 },
  { sym: "SAP", name: "SAP SE Inhaber-Aktien o.N.", short: "SAP", wkn: "716460", isin: "DE0007164600", type: "Aktie", sector: "Tech", price: 228.4, vol: 0.016, drift: 0.0004 },
  { sym: "ADS", name: "adidas AG Namens-Aktien o.N.", short: "adidas", wkn: "A1EWWW", isin: "DE000A1EWWW0", type: "Aktie", sector: "Consumer", price: 166.7, vol: 0.019, drift: 0.0002 },
  { sym: "SIE", name: "Siemens AG Namens-Aktien o.N.", short: "Siemens", wkn: "723610", isin: "DE0007236101", type: "Aktie", sector: "Industry", price: 192.1, vol: 0.015, drift: 0.0003 },
  { sym: "ALV", name: "Allianz SE vink. Namens-Aktien o.N.", short: "Allianz", wkn: "840400", isin: "DE0008404005", type: "Aktie", sector: "Finance", price: 301.5, vol: 0.012, drift: 0.0003 },
  { sym: "MBG", name: "Mercedes-Benz Group AG Namens-Aktien o.N.", short: "Mercedes-Benz", wkn: "710000", isin: "DE0007100000", type: "Aktie", sector: "Auto", price: 58.92, vol: 0.017, drift: 0.0001 },
  { sym: "VOW3", name: "Volkswagen AG Vorzugsaktien o.St. o.N.", short: "Volkswagen Vz.", wkn: "766403", isin: "DE0007664039", type: "Aktie", sector: "Auto", price: 94.6, vol: 0.018, drift: 0.0001 },
  { sym: "AAPL", name: "Apple Inc. Registered Shares o.N.", short: "Apple", wkn: "865985", isin: "US0378331005", type: "Aktie", sector: "Tech", price: 208.3, vol: 0.016, drift: 0.0004 },
  { sym: "MSFT", name: "Microsoft Corp. Registered Shares DL-,00000625", short: "Microsoft", wkn: "870747", isin: "US5949181045", type: "Aktie", sector: "Tech", price: 398.2, vol: 0.015, drift: 0.0004 },
  { sym: "NVDA", name: "NVIDIA Corp. Registered Shares DL-,001", short: "NVIDIA", wkn: "918422", isin: "US67066G1040", type: "Aktie", sector: "Tech", price: 121.6, vol: 0.028, drift: 0.0006 },
  { sym: "TSLA", name: "Tesla Inc. Registered Shares DL-,001", short: "Tesla", wkn: "A1CX3T", isin: "US88160R1014", type: "Aktie", sector: "Auto", price: 221.4, vol: 0.033, drift: 0.0003 },
  { sym: ETF_SYM, name: "iShares Core MSCI World UCITS ETF", short: "MSCI World ETF", wkn: "A0RPWH", isin: "IE00B4L5Y983", type: "ETF", sector: "ETF", price: 98.45, vol: 0, drift: 0 },
];

// Companies that only appear in historical replays.
export const REPLAY_COMPANIES: Company[] = [
  { sym: "WDI", name: "Wirecard AG Inhaber-Aktien o.N.", short: "Wirecard", wkn: "747206", isin: "DE0007472060", type: "Aktie", sector: "Payments", price: 0, vol: 0.02, drift: 0 },
  { sym: "GME", name: "GameStop Corp. Registered Shares Class A DL-,001", short: "GameStop", wkn: "A0HGDX", isin: "US36467W1094", type: "Aktie", sector: "Retail", price: 0, vol: 0.03, drift: 0 },
  { sym: "LHA", name: "Deutsche Lufthansa AG vink. Namens-Aktien o.N.", short: "Lufthansa", wkn: "823212", isin: "DE0008232125", type: "Aktie", sector: "Travel", price: 0, vol: 0.02, drift: 0 },
  { sym: DAX_ETF, name: "iShares Core DAX UCITS ETF (DE)", short: "DAX ETF", wkn: "593393", isin: "DE0005933931", type: "ETF", sector: "ETF", price: 110, vol: 0.011, drift: 0.0002 },
];

export const ALL_COMPANIES = [...COMPANIES, ...REPLAY_COMPANIES];
export const companyOf = (sym: string) => ALL_COMPANIES.find((c) => c.sym === sym)!;

// Sectors stay English as filter values and in news effects ("sector:Auto"); this is what people read.
dict({
  Telecom: "Telekommunikation", Tech: "Technologie", Consumer: "Konsum", Industry: "Industrie", Finance: "Finanzen", Auto: "Automobil",
  Payments: "Zahlungsdienste", Retail: "Einzelhandel", Travel: "Reisen",
});
