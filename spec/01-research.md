# 01 — Research (2026-10-26)

Web searches and endpoint probes made on 2026-10-26. Endpoints marked "probed" answered with `curl` that day.

## Literature

- **Cardinality-constrained portfolio optimisation** is the standard name of the problem. Most GA papers use a hybrid chromosome (a set of K assets + continuous weights) and a **repair** step rather than penalties (Streichert, Ulmer, Zell 2004, which compares crossovers and repairs by keeping the K largest weights; a 2026 arXiv survey notes that the large majority of reports repair). Chang et al. (2000) introduced the benchmark and the "drop the smallest weight" repair.
- **Multi-objective** variants use NSGA-II for return × risk; it works well with two objectives (a 2022 study on NSGA-II vs NSGA-III). A Pareto mode is a stretch goal for the lab.
- **Brazilian precedents**: a UEPG master's thesis (Jazynski 2022) compares momentum, Markowitz and a GA on B3 stocks with Sharpe and the Ledoit-Wolf (2008) significance test; an SBSI paper builds GA portfolios on 2010 Bovespa data and tests in 2011; a UFSC TCC (2025) adds sector-concentration penalties; a UNICAMP undergraduate project compares NSGA-II and SPEA-II on the Ibovespa. None operates live; none treats the sessions as a dynamic environment.
- **Dynamic evolutionary optimisation** (random immigrants, memory, hypermutation when diversity collapses) is the theory behind carrying the population across sessions.

## Data sources

| Source | State | Use |
|---|---|---|
| Yahoo chart API `query1.finance.yahoo.com/v8/finance/chart/PETR4.SA?range=2y&interval=1d&events=div,split` | probed: 496 daily bars for 2y, `quote` + `adjclose`, dividends and splits; `^BVSP` 1,248 bars for 5y; `meta.currentTradingPeriod.regular` gives the session's open and close (10:00–17:00 BRT on 2026-10-26) | **Primary**: adjusted closes for fitness, raw open/close for fills, dividends for cash. Unofficial: no guarantees |
| B3 `sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/<base64 {"language":"pt-br","pageNumber":1,"pageSize":120,"index":"IBOV","segment":"2"}>` | probed: 76 tickers with company (`asset`), sector (`segment`, "Macro / Sub"), weight (`part`) | Universe, companies and sectors, frozen at formation |
| B3 COTAHIST daily `bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_DddMMyyyy.ZIP` | probed: 200, 508 KB for 2026-10-23; 245-byte fixed-width records (layout PDF on b3.com.br) | **Fallback** for raw open/close if Yahoo fails. Not adjusted for corporate actions |
| BCB SGS series 12 `api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=dd/MM/yyyy&dataFinal=dd/MM/yyyy` | probed: `{"data":"23/10/2026","valor":"0.050788"}` (percent per day). On Monday 2026-10-26 the latest value was Friday's: the day's CDI arrives the next day | Risk-free rate; interest on idle cash (carry the last value forward) |
| brapi.dev | free plan: 15,000 requests/month, 1 ticker per request, **3 months** of history, ~30 min delay (pricing page of 2026-08-21) | Not used: too little history |

Renamed tickers (AXIA3, EMBJ3) and units (BPAC11) all have 496 bars on Yahoo, so the renames carry their history.

## Costs (Unverified figures)

Brokerage is zero at most retail brokers. B3 fees (emolumentos = trading + settlement) for individuals are quoted between 0.0035% and 0.039% by different, undated sources; around 0.03% is the common figure. We model **0.03% fees + 0.05% slippage per side** as parameters and say so on screen. Income tax (15% on swing-trade gains when monthly sales exceed R$ 20,000) is out of scope for the first version; a note on screen is enough.

## Hosting limits

- **Vercel cron on Hobby**: once a day at most, ±59 minutes of precision (docs updated 2026-01-28). Fine for a daily job, but Yahoo may rate-limit Vercel's shared IPs, and a cron that writes needs a store.
- **GitHub Actions schedule**: free, can be delayed under load, and can commit to the repository, which gives the timestamped proof for free. **Chosen for the nightly job** (`03-live-run.md`).

## Sources

- Streichert, Ulmer, Zell (2004), Evaluating a hybrid encoding and three crossover operators on the constrained portfolio selection problem: https://www.ra.cs.uni-tuebingen.de/publikationen/2004/streichert04evaluating.pdf
- Large-scale cardinality-constrained portfolio optimisation with multi-objective EAs (2026): https://arxiv.org/pdf/2607.09566
- Covariance-aware simplex projection repair (2025): https://arxiv.org/abs/2512.19986v1
- Jazynski (2022), UEPG: https://ri.uepg.br/handle/123456789/3583
- SBSI paper on GA portfolios with Bovespa data: https://sol.sbc.org.br/index.php/sbsi/article/download/5720/5617
- UFSC TCC on sector-constrained GA portfolios: https://repositorio.ufsc.br/handle/123456789/271430
- UNICAMP NSGA-II vs SPEA-II on the Ibovespa: https://www.prp.unicamp.br/inscricao-congresso/resumos/2023P21312A38269O568.pdf
- On NSGA-II and NSGA-III in portfolio management: https://pure.kfupm.edu.sa/en/publications/on-nsga-ii-and-nsga-iii-in-portfolio-management/
- brapi pricing: https://brapi.dev/pricing.md
- B3 historical quotes and layout: https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/mercado-a-vista/cotacoes-historicas/ · https://www.b3.com.br/data/files/33/67/B9/50/D84057102C784E47AC094EA8/SeriesHistoricas_Layout.pdf
- Vercel cron limits: https://vercel.com/docs/cron-jobs/usage-and-pricing
- yahoo-finance2 (unofficial-API caveats): https://github.com/gadicc/node-yahoo-finance2
