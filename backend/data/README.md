# Dados de seed

Os CSVs desta pasta alimentam o banco via seed e **não são versionados** (`data/*.csv` no
`.gitignore`). Eles são fornecidos separadamente junto com a atividade: coloque aqui os
10 arquivos listados abaixo, com os nomes exatos.

## Formato

- UTF-8 sem BOM, separador `,`, aspas `"` (RFC 4180), cabeçalho na primeira linha, sem
  campos multilinha.
- Fim de linha LF, exceto `movies_reviews.csv`, que usa CRLF.
- Nulo = campo vazio (não há literais como `NULL` ou `NaN`).
- Datas no formato `YYYY-MM-DD`. Decimais com ponto (`24.584`).
- As colunas inteiras da fact vêm como float (`2375.0`).
- As chaves `sk_*` são hex SHA-256 com 64 caracteres.

## Arquivos

| Arquivo | Tabela | Registros | Colunas |
|---|---|---:|---|
| `dim_genres.csv` | `dim_genres` | 19 | nome_genero, sk_genre_id |
| `dim_companies.csv` | `dim_companies` | 45.941 | nome_produtora, sk_company_id |
| `dim_people.csv` | `dim_people` | 424.656 | nome_pessoa, tipo_pessoa, sk_person_id |
| `dim_movies.csv` | `dim_movies` | 95.645 | sk_movie_id, id_filme, titulo, data_lancamento, ano_lancamento, duracao_minutos, status_filme, sinopse, url_poster, url_backdrop |
| `fact_movies_performance.csv` | `fact_movies_performance` | 95.645 | sk_movie_id, orcamento_usd, receita_usd, lucro_usd, orcamento_brl, receita_brl, lucro_brl, popularidade, nota_tmdb, qtd_tmdb, nota_imdb, qtd_imdb |
| `dim_reviews.csv` | `dim_reviews` (não importado) | 26.604 | sk_review_id, sk_movie_id, qtd_avaliacoes_usuarios, nota_media_usuarios |
| `movies_reviews.csv` | **`movie_reviews`** | 43.666 | sk_movie_review_id, sk_movie_id, nome, nota, comentario |
| `bridge_movie_genre.csv` | `bridge_movie_genre` | 121.521 | sk_movie_id, sk_genre_id |
| `bridge_movie_company.csv` | `bridge_movie_company` | 116.326 | sk_movie_id, sk_company_id |
| `bridge_movie_person.csv` | `bridge_movie_person` | 745.450 | sk_movie_id, sk_person_id |

As contagens não incluem o cabeçalho. Integridade verificada: nenhuma FK órfã, nenhum par
duplicado nas bridges, e cada filme tem exatamente uma linha na fact.

## Divergências com os modelos

- `movies_reviews.csv` alimenta a tabela `movie_reviews` (os nomes diferem).
- `movie_reviews.created_at` não existe no CSV, então recebe o horário do seed
  (`server_default`).
- `qtd_tmdb` e `qtd_imdb` vêm como float (`2375.0`) para colunas `Integer`: converter com
  `int(float(v))`. Os valores monetários (`Numeric(18, 2)`) devem ser convertidos com
  `Decimal(v)` a partir do texto.
- `dim_reviews.csv` não bate com `movies_reviews.csv`: 4.503 quantidades divergentes,
  898 resumos sem nenhuma avaliação e 14.561 filmes com avaliação mas sem resumo. Além
  disso, `sk_review_id` é igual a `sk_movie_id` em todas as linhas.
- 9.380 filmes têm mais de um diretor.
- Os tamanhos e domínios cabem nos modelos: `tipo_pessoa` ∈ {Ator, Diretor, Roteirista},
  `nota` ∈ [0, 10], textos abaixo dos limites de `String`.

## Como carregar

Com os CSVs nesta pasta, rode a partir de `backend/` (Windows: binários em `.venv\Scripts\`):

```powershell
.venv\Scripts\alembic upgrade head      # cria o schema
.venv\Scripts\python -m app.cli.seed    # carrega os CSVs
```

- A carga lê os arquivos em streaming, insere em lotes de 5.000 linhas numa única
  transação e loga a contagem por tabela e o tempo total (alguns minutos).
- Se o banco já tiver dados, o seed avisa e sai sem alterar nada. Para apagar tudo e
  recarregar: `python -m app.cli.seed --reset`.
- `--data-dir CAMINHO` usa CSVs de outra pasta (padrão: `backend/data/`).
- `dim_reviews` é gerado no fim a partir de `movie_reviews` (40.267 resumos).

## Decisões

1. **`dim_reviews.csv` não é importado.** Ao final do seed, `dim_reviews` (quantidade e
   média) é recalculado a partir de `movie_reviews`.
2. **Diretores são uma lista na API**, tanto na leitura quanto no cadastro.
3. **O seed carrega os dados como estão**, sem limpeza nem normalização.

**Limitações conhecidas dos dados:** sinopses com aspas literais ou truncadas,
`duracao_minutos` igual a 0 ou implausível, `lucro_*` calculado tratando nulo como 0,
textos com espaço nas bordas e nomes cortados em 50 caracteres.
