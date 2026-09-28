/** Status do filme como vêm do TMDB (em inglês) e sua tradução. */
const STATUS_PT_BR: Record<string, string> = {
  Released: 'Lançado',
  'Post Production': 'Em pós-produção',
  'In Production': 'Em produção',
  Planned: 'Planejado',
  Rumored: 'Rumor',
  Canceled: 'Cancelado',
};

/** Traduz o status do filme; valores desconhecidos são exibidos como vieram. */
export function translateStatus(status: string): string {
  return STATUS_PT_BR[status] ?? status;
}
