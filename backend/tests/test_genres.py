import httpx


async def test_list_genres_sorted_by_name(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/genres")

    assert response.status_code == 200
    assert response.json() == [
        {"sk_genre_id": "a" + "2".rjust(63, "0"), "nome_genero": "Drama Teste"},
        {"sk_genre_id": "a" + "1".rjust(63, "0"), "nome_genero": "Ficção Teste"},
    ]
