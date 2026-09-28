/** Nomes dos gêneros em pt-BR; a API continua devolvendo os nomes originais. */
const GENRE_TRANSLATIONS: Readonly<Record<string, string>> = {
  Action: 'Ação',
  Adventure: 'Aventura',
  Animation: 'Animação',
  Comedy: 'Comédia',
  Crime: 'Crime',
  Documentary: 'Documentário',
  Drama: 'Drama',
  Family: 'Família',
  Fantasy: 'Fantasia',
  History: 'História',
  Horror: 'Terror',
  Music: 'Música',
  Mystery: 'Mistério',
  Romance: 'Romance',
  'Science Fiction': 'Ficção científica',
  Thriller: 'Suspense',
  'Tv Movie': 'Filme para TV',
  War: 'Guerra',
  Western: 'Faroeste',
};

/** Traduz o nome de um gênero só para exibição; sem tradução conhecida, mantém o original. */
export function translateGenre(name: string): string {
  return Object.hasOwn(GENRE_TRANSLATIONS, name) ? GENRE_TRANSLATIONS[name] : name;
}
