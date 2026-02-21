import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const AED_USD_PEG = 3.6725; // AED/USD peg rate
const CSV_DIR = join(import.meta.dir, '../../historical-data');

interface CSVDataPoint {
  time: number;   // Unix timestamp (seconds)
  price: number;  // Close price in USD
  open: number;
  high: number;
  low: number;
}

// Symbol → historical data (sorted chronologically)
const csvCache = new Map<string, CSVDataPoint[]>();

// Mapping: CSV filename substring → asset symbol
const CSV_SYMBOL_MAP: Record<string, string> = {
  'First Abu Dhabi Bank': 'FAB',
  'Aldar Properties': 'ALDAR',
  'Abu Dhabi Islamic Bank': 'ADIB',
  'Alpha Dhabi Holding': 'ALPHADHABI',
  'International Holding Company': 'IHC',
  'Emirates Ins C': 'EIC',
  'Two Point Zero': 'TPZERO',
  'Union Insurance': 'UNIONINS',
  'Eshraq Investments': 'ESHRAQ',
  'Sudatel Telecom': 'SUDATEL',
};

function parseCSVDate(dateStr: string): number {
  // Format: "MM/DD/YYYY"
  const [month, day, year] = dateStr.split('/').map(Number);
  return Math.floor(new Date(year!, month! - 1, day!).getTime() / 1000);
}

function parseCSVNumber(val: string): number {
  // Remove quotes, handle "N/A" or empty
  const cleaned = val.replace(/"/g, '').trim();
  if (!cleaned || cleaned === 'N/A') return 0;
  return parseFloat(cleaned);
}

function resolveSymbol(filename: string): string | null {
  for (const [key, symbol] of Object.entries(CSV_SYMBOL_MAP)) {
    if (filename.includes(key)) return symbol;
  }
  return null;
}

export function loadAllCSVData(): void {
  let files: string[];
  try {
    files = readdirSync(CSV_DIR).filter(f => f.endsWith('.csv'));
  } catch {
    console.warn('⚠️  historical-data directory not found, skipping CSV loading');
    return;
  }

  let loaded = 0;
  for (const file of files) {
    const symbol = resolveSymbol(file);
    if (!symbol) {
      console.warn(`⚠️  CSV: No symbol mapping for "${file}", skipping`);
      continue;
    }

    try {
      const raw = readFileSync(join(CSV_DIR, file), 'utf-8');
      const lines = raw.split('\n').filter(l => l.trim());

      // Skip BOM + header row
      const dataLines = lines.slice(1);
      const points: CSVDataPoint[] = [];

      for (const line of dataLines) {
        // CSV format: "Date","Price","Open","High","Low","Vol.","Change %"
        const cols = line.match(/(?:"([^"]*)")/g)?.map(c => c.replace(/"/g, ''));
        if (!cols || cols.length < 5) continue;

        const time = parseCSVDate(cols[0]!);
        const close = parseCSVNumber(cols[1]!);
        const open = parseCSVNumber(cols[2]!);
        const high = parseCSVNumber(cols[3]!);
        const low = parseCSVNumber(cols[4]!);

        if (time && close > 0) {
          points.push({
            time,
            price: close / AED_USD_PEG,  // AED → USD
            open: open / AED_USD_PEG,
            high: high / AED_USD_PEG,
            low: low / AED_USD_PEG,
          });
        }
      }

      // CSV is reverse chronological — sort oldest first
      points.sort((a, b) => a.time - b.time);
      csvCache.set(symbol, points);
      loaded++;
      console.log(`📄 CSV loaded: ${symbol} — ${points.length} data points`);
    } catch (err) {
      console.error(`❌ CSV: Failed to parse "${file}":`, err);
    }
  }

  console.log(`📊 CSV: ${loaded} files loaded from ${CSV_DIR}`);
}

export function getCSVHistory(symbol: string): CSVDataPoint[] {
  return csvCache.get(symbol) || [];
}

export function getCSVLatestPrice(symbol: string): number | null {
  const data = csvCache.get(symbol);
  if (!data || data.length === 0) return null;
  return data[data.length - 1]!.price; // Already in USD
}

export function getCSVSymbols(): string[] {
  return Array.from(csvCache.keys());
}

// Load on import
loadAllCSVData();
