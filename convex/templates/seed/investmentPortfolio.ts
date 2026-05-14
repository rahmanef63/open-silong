import type { TemplateJson } from "../lib/validate";

/** Investment Portfolio — holdings + transactions, w/ allocation chart and dividend log. */
export const investmentPortfolio: TemplateJson = {
  version: 1,
  name: "Investment Portfolio",
  icon: "📈",
  category: "Finance",
  description: "Holdings, transactions, dividends. Asset-class allocation chart and yearly performance.",
  page: {
    ref: "root",
    title: "Investment Portfolio",
    icon: "📈",
    blocks: [
      { type: "h1", text: "📈 Investment Portfolio" },
      { type: "callout", text: "Track positions across brokers. Update prices weekly; the chart shows allocation drift." },
      {
        type: "columns3",
        columns: [
          [{ type: "callout", text: "**Allocation**\nTarget vs actual; rebalance quarterly." }],
          [{ type: "callout", text: "**Performance**\nXIRR yearly; ignore short-term noise." }],
          [{ type: "callout", text: "**Income**\nDividends + interest log." }],
        ],
      },
      { type: "h2", text: "📊 Holdings" },
      { type: "database", databaseRef: "holdings" },
      { type: "h2", text: "💵 Activity" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Transactions" }, { type: "database", databaseRef: "txn" }],
          [{ type: "h3", text: "Dividends" }, { type: "database", databaseRef: "dividends" }],
        ],
      },
    ],
    databases: [
      {
        ref: "holdings",
        name: "Holdings",
        icon: "📊",
        properties: [
          { id: "name", name: "Ticker", type: "text" },
          { id: "company", name: "Name", type: "text" },
          {
            id: "asset_class",
            name: "Asset class",
            type: "select",
            options: [
              { id: "stock", name: "Stock", color: "blue" },
              { id: "etf", name: "ETF", color: "green" },
              { id: "bond", name: "Bond", color: "purple" },
              { id: "crypto", name: "Crypto", color: "orange" },
              { id: "cash", name: "Cash", color: "gray" },
            ],
          },
          {
            id: "broker",
            name: "Broker",
            type: "select",
            options: [
              { id: "schwab", name: "Schwab", color: "blue" },
              { id: "fidelity", name: "Fidelity", color: "green" },
              { id: "ibkr", name: "IBKR", color: "red" },
              { id: "coinbase", name: "Coinbase", color: "yellow" },
            ],
          },
          { id: "qty", name: "Shares", type: "number", numberDecimals: 4 },
          { id: "cost_basis", name: "Cost basis", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "price", name: "Last price", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "value", name: "Market value", type: "formula", formulaExpression: "{{qty}} * {{price}}" },
          { id: "gain", name: "Gain/Loss", type: "formula", formulaExpression: "{{qty}} * {{price}} - {{cost_basis}}" },
        ],
        views: [
          { id: "v1", type: "table", name: "Holdings", isDefault: true },
          { id: "v2", type: "board", name: "By asset class", groupBy: "asset_class" },
          { id: "v3", type: "board", name: "By broker", groupBy: "broker" },
          { id: "v4", type: "chart", name: "Allocation", payload: { chartKind: "donut", chartXProp: "asset_class", chartYProp: "value", chartAggregate: "sum" } },
          { id: "v5", type: "chart", name: "Per ticker", payload: { chartKind: "bar", chartXProp: "name", chartYProp: "value", chartAggregate: "sum" } },
          { id: "v6", type: "dashboard", name: "Portfolio", payload: { dashboardKPIs: ["value", "gain"], dashboardBreakdowns: ["asset_class", "broker"], dashboardRecentLimit: 10 } },
        ],
        seedRows: [
          { props: { name: "VTI", company: "Vanguard Total Market", asset_class: "etf", broker: "schwab", qty: 120, cost_basis: 24000, price: 245.30 } },
          { props: { name: "VXUS", company: "Vanguard ex-US", asset_class: "etf", broker: "schwab", qty: 80, cost_basis: 4500, price: 62.10 } },
          { props: { name: "BND", company: "Vanguard Total Bond", asset_class: "bond", broker: "fidelity", qty: 200, cost_basis: 14800, price: 73.20 } },
          { props: { name: "AAPL", company: "Apple", asset_class: "stock", broker: "fidelity", qty: 30, cost_basis: 4200, price: 198.40 } },
          { props: { name: "BTC", company: "Bitcoin", asset_class: "crypto", broker: "coinbase", qty: 0.05, cost_basis: 2000, price: 67000 } },
        ],
      },
      {
        ref: "txn",
        name: "Transactions",
        icon: "💵",
        properties: [
          { id: "name", name: "Ref", type: "text" },
          { id: "date", name: "Date", type: "date" },
          {
            id: "side",
            name: "Side",
            type: "select",
            options: [
              { id: "buy", name: "Buy", color: "green" },
              { id: "sell", name: "Sell", color: "red" },
            ],
          },
          { id: "ticker", name: "Ticker", type: "relation", relationDatabaseRef: "holdings" },
          { id: "qty", name: "Shares", type: "number", numberDecimals: 4 },
          { id: "price", name: "Price", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "fees", name: "Fees", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "calendar", name: "Calendar", payload: { calendarDateProp: "date" } },
          { id: "v3", type: "board", name: "By side", groupBy: "side" },
        ],
        seedRows: [
          { props: { name: "TX-001", date: "2026-04-02", side: "buy", qty: 10, price: 240, fees: 0 } },
          { props: { name: "TX-002", date: "2026-05-10", side: "buy", qty: 0.01, price: 65000, fees: 12 } },
        ],
      },
      {
        ref: "dividends",
        name: "Dividends",
        icon: "💎",
        properties: [
          { id: "name", name: "Source", type: "text" },
          { id: "date", name: "Pay date", type: "date" },
          { id: "ticker", name: "Ticker", type: "relation", relationDatabaseRef: "holdings" },
          { id: "amount", name: "Amount", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "chart", name: "Yearly", payload: { chartKind: "bar", chartXProp: "date", chartYProp: "amount", chartAggregate: "sum" } },
          { id: "v3", type: "calendar", name: "Calendar", payload: { calendarDateProp: "date" } },
        ],
        seedRows: [
          { props: { name: "VTI Q1", date: "2026-03-30", amount: 84.20 } },
          { props: { name: "BND April", date: "2026-04-30", amount: 41.10 } },
        ],
      },
    ],
  },
};
