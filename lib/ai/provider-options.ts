/**
 * What an adapter needs to talk to its provider.
 *
 * Split out from provider-types.ts so lib/ai/provider.ts can construct an
 * adapter without either adapter's SDK leaking into the type surface.
 */
export type AgentProviderOptions = {
  apiKey: string
  model: string
}
