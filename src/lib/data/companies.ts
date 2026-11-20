// Mock market: real, widely known companies. Prices are mock values in EUR, not live data.
export type Company = {
  sym: string;
  name: string;
  wkn: string;
  sector: string;
  price: number; // start price, EUR
  vol: number; // daily volatility
  drift: number; // daily drift
};

export const ETF_SYM = "MSCIW";

export const COMPANIES: Company[] = [
  { sym: "AAPL", name: "Apple", wkn: "865985", sector: "Tech", price: 210, vol: 0.016, drift: 0.0004 },
  { sym: "MSFT", name: "Microsoft", wkn: "870747", sector: "Tech", price: 400, vol: 0.015, drift: 0.0004 },
  { sym: "NVDA", name: "NVIDIA", wkn: "918422", sector: "Tech", price: 120, vol: 0.03, drift: 0.0007 },
  { sym: "AMZN", name: "Amazon", wkn: "906866", sector: "Tech", price: 180, vol: 0.02, drift: 0.0004 },
  { sym: "GOOGL", name: "Alphabet", wkn: "A14Y6F", sector: "Tech", price: 160, vol: 0.018, drift: 0.0004 },
  { sym: "SAP", name: "SAP", wkn: "716460", sector: "Tech", price: 230, vol: 0.016, drift: 0.0004 },
  { sym: "TSLA", name: "Tesla", wkn: "A1CX3T", sector: "Auto", price: 220, vol: 0.035, drift: 0.0003 },
  { sym: "MBG", name: "Mercedes-Benz Group", wkn: "710000", sector: "Auto", price: 60, vol: 0.017, drift: 0.0001 },
  { sym: "VOW3", name: "Volkswagen Vz.", wkn: "766403", sector: "Auto", price: 95, vol: 0.018, drift: 0.0001 },
  { sym: "SIE", name: "Siemens", wkn: "723610", sector: "Industry", price: 190, vol: 0.015, drift: 0.0003 },
  { sym: "ALV", name: "Allianz", wkn: "840400", sector: "Finance", price: 300, vol: 0.012, drift: 0.0003 },
  { sym: "DTE", name: "Deutsche Telekom", wkn: "555750", sector: "Telecom", price: 30, vol: 0.011, drift: 0.0002 },
  { sym: "ADS", name: "adidas", wkn: "A1EWWW", sector: "Consumer", price: 220, vol: 0.019, drift: 0.0002 },
  { sym: ETF_SYM, name: "iShares Core MSCI World ETF", wkn: "A0RPWH", sector: "ETF", price: 100, vol: 0, drift: 0 },
];
