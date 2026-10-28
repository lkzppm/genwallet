# 01 — Research (2026-10-26)

Web searches and endpoint probes made on 2026-10-26. Endpoints marked "probed" answered with `curl` that day.

## Literature

- **Cardinality-constrained portfolio optimisation** is the standard name of the problem. Most GA papers use a hybrid chromosome (a set of K assets + continuous weights) and a **repair** step rather than penalties (Streichert, Ulmer, Zell 2004, which compares crossovers and repairs by keeping the K largest weights; a 2026 arXiv survey notes that the large majority of reports repair). Chang et al. (2000) introduced the benchmark and the "drop the smallest weight" repair.
- **Multi-objective** variants use NSGA-II for return × risk; it works well with two objectives (a 2022 study on NSGA-II vs NSGA-III). A Pareto mode is a stretch goal for the lab.
- **Brazilian precedents**: a UEPG master's thesis (Jazynski 2022) compares momentum, Markowitz and a GA on B3 stocks with Sharpe and the Ledoit-Wolf (2008) significance test; an SBSI paper builds GA portfolios on 2010 Bovespa data and tests in 2011; a UFSC TCC (2025) adds sector-concentration penalties; a UNICAMP undergraduate project compares NSGA-II and SPEA-II on the Ibovespa. None operates live; none treats the sessions as a dynamic environment.
- **Dynamic evolutionary optimisation** (random immigrants, memory, hypermutation when diversity collapses) is the theory behind carrying the population across sessions.

### What the literature says the strategy is good at (2026-10-28, web search, abstracts only)

- **Genetic algorithms earn their place on the constraints, not on the forecast.** The canonical work is heuristic search of the cardinality-constrained efficient frontier (Chang, Meade, Beasley and Sharaiha, 2000: GA, tabu search and simulated annealing, up to 225 assets); recent papers (IBEX 35, 2025; a US learning-to-rank hybrid, 2026) report risk-adjusted gains over naive benchmarks in some tests and a negative out-of-sample Sharpe in others. The Brazilian work (a USP monograph, 2010 to 2019, GA against the Ibovespa, the CDI and the equal-weighted portfolio; a UFMG dissertation with neural-network forecasts) is in-sample or short. Nothing shows a GA beating the Ibovespa out of sample on its own.
- **Estimation error beats optimisation** (DeMiguel, Garlappi and Uppal, RFS 2009): none of 14 optimised models beat 1/N out of sample on Sharpe, certainty equivalent or turnover; mean-variance needs about 3,000 months of history for 25 assets. Shrinkage toward the average and toward constant correlation, which the engine has, is the standard answer; minimum variance, which needs no means, is the robust one.
- **Technical rules evolved by genetic programming** show no excess return after costs out of sample (Allen and Karjalainen, JFE 1999, S&P 500; Neely and Weller, 2003, foreign exchange). Not a road to take.
- **Momentum and reversal in Brazil are inconclusive**: persistence at daily and weekly horizons in older samples, weaker recently (RBE random-walk tests); reversal from 3 months to 3 years (Bonomo and Dall'Agnol, 2003; Piccoli et al., 2009 on the 55 most liquid names); 12-1 momentum present from 1995 to 2011 (RAM). Nothing at the 10-session horizon worth a bet.
- **Low beta in Brazil**: low-beta portfolios beat high-beta ones in about 80% of the sorts from 1995 to 2012 and 2001 to 2013, rarely significantly, and the effect reverses in crises (1999, 2003, 2007).
- **After large one-day declines** the stock-level rebound is mostly bid-ask bounce (Cox and Peterson, JF 1994) and the losers go on to underperform; a South African sample found a three-day reversal; index-level rebounds over 12 months after the worst days are large on average but the samples are a handful of crises.
- **Contests reward variance** (Krishna, Kim and Ryvkin on strategic risk taking; Browne, 1999, on reaching a goal by a deadline): under a rank prize, a contestant who does not expect to reach the winning score should take more risk. For the class challenge this is the one lever the literature backs: a fitness that targets a return rather than a ratio (`02-genetic-algorithm.md`, `goal`).
- **The run's regime**: the formation ran on 2026-10-26, the day the Ibovespa fell 13.7% (176,906) after Lula beat Flávio Bolsonaro in the runoff; the real went from about 4.99 to 5.60 per dollar, Banco do Brasil fell 27%, Petrobras 7 to 8%, Vale rose 4.5%. The index fell another 0.5% on 2026-10-27. The 240-session lookback holds that day for the whole run.

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
