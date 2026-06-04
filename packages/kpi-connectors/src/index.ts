// KPI data source adapters — implement per source system (e.g. Salesforce, Greenhouse, etc.)
export type KpiAdapter = {
  fetchThroughput(placementId: string, from: Date, to: Date): Promise<number>
}
