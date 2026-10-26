// The Ibovespa's theoretical portfolio from B3's index service (spec/01).
// Segment "2" groups the constituents by sector ("Macro / Sub").

import { fetchJson } from "./http";

export interface Constituent {
  ticker: string;
  /** B3's `asset` field: one name per company, shared by its share classes. */
  company: string;
  sector: string;
  subsector: string;
  /** Weight in the index, in percent. */
  weight: number;
}

interface RawPortfolio {
  header: { date: string };
  results: { cod: string; asset: string; segment: string; part: string }[];
}

// B3 abbreviates the macro-sectors inconsistently across rows.
const MACRO: Record<string, string> = {
  "Bens Indls": "Bens Industriais",
  "Cons N Básico": "Consumo não Cíclico",
  "Cons N Cíclico": "Consumo não Cíclico",
  "Consumo Cíclico": "Consumo Cíclico",
  "Financ e Outros": "Financeiro",
  "Financeiro e Outros": "Financeiro",
  "Mats Básicos": "Materiais Básicos",
  "Tec.Informação": "Tecnologia da Informação",
  "Utilidade Públ": "Utilidade Pública",
};

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export function splitSegment(segment: string): { sector: string; subsector: string } {
  const [macro, ...rest] = segment.split("/");
  const key = squash(macro);
  return { sector: MACRO[key] ?? key, subsector: squash(rest.join("/")) };
}

export async function fetchIbovComposition(): Promise<{ date: string; constituents: Constituent[] }> {
  const query = { language: "pt-br", pageNumber: 1, pageSize: 120, index: "IBOV", segment: "2" };
  const token = btoa(JSON.stringify(query));
  const raw = await fetchJson<RawPortfolio>(
    `https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/${token}`,
  );
  const [d, m, y] = raw.header.date.split("/");
  return {
    date: `20${y}-${m}-${d}`,
    constituents: raw.results
      .map((r) => ({
        ticker: r.cod.trim(),
        company: squash(r.asset),
        ...splitSegment(r.segment),
        weight: Number(r.part.replace(/\./g, "").replace(",", ".")),
      }))
      .sort((a, b) => a.ticker.localeCompare(b.ticker)),
  };
}
