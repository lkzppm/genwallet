// CDI from the Central Bank's SGS (series 12, percent per day). The value of
// a day is published the next morning, so callers carry the last one forward.

import { fetchJson } from "./http";

const br = (iso: string) => iso.split("-").reverse().join("/");

export async function fetchCdi(from: string, to: string): Promise<{ date: string; rate: number }[]> {
  const url =
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json` +
    `&dataInicial=${br(from)}&dataFinal=${br(to)}`;
  const rows = await fetchJson<{ data: string; valor: string }[]>(url);
  return rows.map((r) => ({ date: r.data.split("/").reverse().join("-"), rate: Number(r.valor) / 100 }));
}
