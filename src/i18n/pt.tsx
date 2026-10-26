// Portuguese interface strings: every key of `en.tsx`, in the course's
// language. No em dash in anything the visitor reads.
import type { Dictionary } from "./index";

export const pt: Dictionary = {
  lang: "pt-BR",
  name: "Português",
  short: "PT",

  common: {
    language: "Idioma",
    themeLight: "Mudar para o tema claro",
    themeDark: "Mudar para o tema escuro",
    source: "Código no GitHub",
    record: "Registro ao vivo",
    paper: "Dinheiro fictício. Não é recomendação de investimento.",
  },

  nav: {
    home: "Início do GenWallet",
    pages: "Páginas",
    builder: "Montar carteira",
  },

  hero: {
    eyebrow: "EEL874 · Inteligência Artificial · UFRJ 2026/2",
    brief: (companies, sessions) =>
      `Um algoritmo genético escolhe ${companies} empresas do Ibovespa e opera a carteira ao vivo durante ${sessions} pregões da B3. Cada ordem é publicada antes da abertura em que ela é executada.`,
    build: "Montar uma carteira",
    discover: "Como funciona",
    background:
      "Atrás desta tela, um algoritmo genético de verdade escala um terreno de demonstração: cada ponto é um indivíduo, a altitude é o fitness, o verde são os picos e o vermelho os vales. O terreno muda a cada pregão. Clique para soltar imigrantes.",
    counter: (session, generation) => `pregão ${session} · geração ${generation}`,
  },

  what: {
    title: "Uma carteira é um cromossomo",
    lead: "Cada indivíduo da população é uma carteira: dez genes, cada um uma empresa e o seu peso. A população inteira evolui, e a melhor carteira de cada noite vira a ordem do pregão seguinte.",
    facts: {
      companies: "empresas por carteira, um papel de cada",
      sessions: (first, last) => `pregões ao vivo, de ${first} a ${last}`,
      population: "carteiras por geração",
      generations: (daily) => `gerações na primeira noite, ${daily} em cada uma das seguintes`,
    },
    figure: (min, max, cap) =>
      `Ilustração: um cromossomo. Pesos entre ${min}% e ${max}%, no máximo ${cap} empresas por setor; a cada poucos segundos um gene sofre mutação.`,
  },

  operators: {
    title: "Seleção, cruzamento, mutação",
    lead: "A cada geração, as carteiras disputam torneios, as vencedoras se cruzam e os filhos sofrem mutações. Um filho que quebra uma regra é consertado, nunca punido.",
    selection: {
      title: "Seleção por torneio",
      body: (size) =>
        `${size} carteiras são sorteadas e a de maior fitness vira mãe. O fitness é o índice de Sharpe descontado o custo de sair da carteira atual.`,
    },
    crossover: {
      title: "Cruzamento",
      body: "As empresas que os dois pais têm em comum ficam; as vagas livres vêm de um pai ou do outro, e os pesos se misturam.",
    },
    mutation: {
      title: "Mutação",
      body: (factor) =>
        `Uma empresa é trocada por outra de fora, ou um peso cresce às custas de outro. Quando a população fica parecida demais, a mutação fica ${factor} vezes mais forte.`,
    },
    labels: { parentA: "pai A", parentB: "pai B", child: "filho", shared: "em comum", winner: "vencedora" },
  },

  session: {
    title: "Um pregão, do fechamento à abertura",
    lead: "A população não morre de um dia para o outro: ela recebe imigrantes, reavalia todo mundo no terreno novo e volta a evoluir.",
    steps: {
      close: { title: "Fechamento", body: (lookback) => `Os preços do dia entram numa janela dos últimos ${lookback} pregões.` },
      evolve: {
        title: "Evolução",
        body: (generations, immigrants) =>
          `${generations} gerações a partir da população da véspera, mais ${immigrants}% de imigrantes e a carteira atual como candidata.`,
      },
      commit: { title: "Commit", body: "A decisão vai para a branch live do repositório. O horário do commit prova que ela veio antes da abertura." },
      open: { title: "Abertura", body: "A ordem é executada no preço de abertura, com taxas e deslizamento, em ações inteiras." },
      mark: { title: "Marcação", body: "A carteira é avaliada no fechamento, ao lado do BOVA11 e do CDI." },
    },
  },

  honesty: {
    title: "Feito para ser conferido",
    items: [
      { title: "Sem olhar para o futuro", body: "Decide com o fechamento e opera na abertura seguinte. Uma decisão atrasada vira um pregão perdido no registro." },
      { title: "Reprodutível", body: "Cada noite arquiva os dados e a semente. Qualquer pessoa pode rodar de novo e chegar à mesma carteira." },
      { title: "Comparado ao acaso", body: "Dez pregões é pouco. O resultado aparece ao lado de 10.000 carteiras aleatórias e do índice." },
      { title: "Custos de verdade", body: "Emolumentos, deslizamento e ações inteiras: nenhuma ordem sai de graça." },
    ],
    cta: {
      title: "Monte a sua",
      body: "Escolha os parâmetros iniciais e uma data no passado, e veja o algoritmo operar dez pregões no seu navegador.",
    },
  },

  footer: {
    project: "Projeto",
    stack: "Stack",
    licence: "Licença MIT",
    author: "Autor",
    authorName: "Lucas Pacheco",
    github: "GitHub",
    linkedin: "LinkedIn",
    course: "Disciplina",
    courseName: "EEL874 · Inteligência Artificial",
    term: "UFRJ · 2026/2",
    copyright: "© 2026",
  },
  builder: {
    meta: "Monte uma carteira: escolha os parâmetros iniciais do algoritmo genético e opere 10 pregões passados da B3 no seu navegador.",
    eyebrow: "Montar carteira",
    title: "Opere 10 pregões do passado",
    lead: "Escolha como o algoritmo genético começa e uma noite nos dados. Ele forma uma carteira de 10 empresas e a opera pregão a pregão, com o mesmo motor, os mesmos custos e as mesmas regras da operação ao vivo, aqui no seu navegador.",
    data: (tickers, first, last) => `Dados: ${tickers} papéis do Ibovespa, de ${first} a ${last}, ajustados por proventos.`,
    loading: "Carregando os dados de mercado",
    groups: { run: "Operação", algorithm: "Algoritmo", constraints: "Restrições" },
    fields: {
      formation: {
        label: "Noite da formação",
        hint: (first, last) => `a carteira nasce neste fechamento e é operada nos 10 pregões seguintes (de ${first} a ${last})`,
      },
      capital: { label: "Capital (R$)", hint: "dinheiro fictício" },
      seed: { label: "Semente", hint: "a mesma semente dá a mesma corrida" },
      mode: {
        label: "Empresas",
        free: "Livres",
        strict: "Fixas",
        hint: "livres: o algoritmo pode trocar empresas toda noite, sempre 10, pagando o custo; fixas: ficam as 10 da formação e só os pesos mudam",
      },
      fitness: {
        label: "Fitness",
        sharpe: "Sharpe",
        sortino: "Sortino",
        cvar: "Retorno / CVaR",
        hint: "retorno ajustado ao risco acima do CDI, descontado o custo de sair da carteira atual",
      },
      population: { label: "População", hint: "carteiras por geração" },
      formationGenerations: { label: "Gerações na formação", hint: "a partir de uma população aleatória" },
      dailyGenerations: { label: "Gerações por noite", hint: "a população vem da noite anterior" },
      crossover: { label: "Taxa de crossover", hint: "fração dos filhos que nascem de dois pais" },
      swap: { label: "Mutação de troca", hint: "chance de trocar uma empresa por outra" },
      weight: { label: "Mutação de peso", hint: "chance de mexer nos pesos" },
      immigrants: { label: "Imigrantes", hint: "fração da população trocada por carteiras aleatórias a cada noite" },
      elite: { label: "Elite", hint: "melhores carteiras copiadas sem mudança para a próxima geração" },
      tournament: { label: "Torneio", hint: "candidatos por escolha de pai" },
      wMin: { label: "Peso mínimo", hint: "por empresa, %" },
      wMax: { label: "Peso máximo", hint: "por empresa, %" },
      sectorCap: { label: "Empresas por setor", hint: "no máximo, das 10" },
      lookback: { label: "Janela (pregões)", hint: "histórico por trás de cada estimativa" },
      meanShrink: { label: "Encolhimento da média", hint: "quanto o retorno médio de cada ação é puxado para a média de todas" },
    },
    invalid: {
      bounds: (k) => `Com ${k} empresas os pesos precisam permitir soma de 100%: mínimo × ${k} ≤ 100% ≤ máximo × ${k}.`,
      elite: "A elite precisa ser menor que a população.",
    },
    run: "Rodar 10 pregões",
    again: "Rodar de novo",
    cancel: "Cancelar",
    reset: "Padrões",
    progress: (session, sessions, gen, generations) => `Pregão ${session} de ${sessions} · geração ${gen} de ${generations}`,
    cancelled: "Cancelado.",
    error: (message) => `A simulação falhou: ${message}`,
    empty: "Ajuste os parâmetros e rode. Cada noite evolui a população e decide a próxima ordem; cada pregão executa a ordem na abertura e marca a carteira no fechamento.",
    results: {
      title: "Resultado",
      ga: "Carteira genética",
      bova: "BOVA11 (Ibovespa)",
      cdi: "CDI",
      finalValue: "valor final",
      fees: (fees, trades) => `${fees} em taxas em ${trades} negócios`,
      holds: (n) => (n === 1 ? "1 pregão sem negociar" : `${n} pregões sem negociar`),
      seconds: (s) => `calculado em ${s} s`,
      chart: "Valor ao longo dos pregões",
      formation: "formação",
      oneSample:
        "Dez pregões são uma amostra só: outra noite ou outra semente pode dar o resultado oposto. Compare com os benchmarks nos mesmos pregões, não com zero.",
    },
    session: {
      tabs: "Pregões",
      label: (n) => `Pregão ${n}`,
      decided: (on, fill) => `Decidido na noite de ${on}, executado na abertura de ${fill}.`,
      hold: "A carteira atual venceu a noite: nenhuma ordem foi enviada.",
      convergence: "A evolução daquela noite",
      best: "melhor",
      mean: "média",
      diversity: "diversidade",
      generation: "geração",
      portfolio: "Carteira",
      ticker: "Papel",
      company: "Empresa",
      sector: "Setor",
      weight: "Peso",
      entered: "entrou",
      left: (tickers) => `Saíram da carteira: ${tickers}.`,
      inSample: "Estimativas dentro da amostra, na janela antes da decisão: não são previsões.",
      score: "score",
      expReturn: "retorno a.a.",
      vol: "volatilidade a.a.",
      turnover: "giro",
      trades: "Negócios na abertura",
      side: { buy: "compra", sell: "venda" },
      qty: "Qtd.",
      price: "Preço",
      value: "Valor",
      noTrades: "Nenhum negócio neste pregão.",
      nav: "valor no fechamento",
    },
  },
};
