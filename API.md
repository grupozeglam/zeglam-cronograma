# API de Links — Zeglam Cronograma

Guia para integrar sistemas externos (ex.: a plataforma de WhatsApp) com o site público de cronograma de links.

- **Base URL (produção):** `https://www.zeglammelhorcompra.com.br`
- **Base URL (dev local):** `http://localhost:3000`
- **Formato:** JSON (`Content-Type: application/json`)

---

## 1. Visão geral

Este site é o **destino/vitrine**. Sistemas externos criam e atualizam links aqui via a **API pública v1** (`/api/v1/links`), protegida por **API key**.

Há **duas camadas de chave**:

| Chave | Para quê | Header |
|---|---|---|
| **API key** (`zglm_live_...`) | Usar a API v1 (CRUD de links) | `X-API-Key` ou `Authorization: Bearer` |
| **Master key** (`ADMIN_MASTER_KEY`) | Criar/listar/revogar API keys | `X-Admin-Key` ou `Authorization: Bearer` |

> ⚠️ Os headers são diferentes: a API v1 usa **`X-API-Key`**; o gerenciamento de keys usa **`X-Admin-Key`**.

---

## 2. Setup inicial (uma vez)

### 2.1 Definir a master key no servidor
No ambiente de produção (Railway → Variables), defina:

```
ADMIN_MASTER_KEY=<32 bytes aleatórios em hex>
```

Gere com: `openssl rand -hex 32` (mínimo 16 caracteres). Reinicie o serviço após definir.

### 2.2 Gerar uma API key com permissão de escrita
```bash
curl -X POST https://www.zeglammelhorcompra.com.br/api/admin/api-keys \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: SUA_MASTER_KEY" \
  -d '{ "name": "cron-whatsapp", "scopes": "read,write" }'
```

Resposta `201`:
```json
{
  "key": "zglm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "prefix": "zglm_live_xxxx",
  "message": "Guarde essa chave em local seguro — ela não poderá ser exibida novamente."
}
```

> A chave em texto puro só aparece **uma vez**. Guarde-a. O servidor armazena apenas o hash SHA-256.

**Scopes:** `read` (só GET), `write` (libera POST/PATCH/DELETE), ou `*` (tudo). Para o cron de sincronização use `read,write`.

---

## 3. Endpoints da API v1 (`/api/v1/links`)

Todas as requisições exigem o header de API key:
```
X-API-Key: zglm_live_...
```
(ou `Authorization: Bearer zglm_live_...`)

### 3.1 Listar links — `GET /api/v1/links` (scope `read`)
Query params (todos opcionais):

| Param | Descrição |
|---|---|
| `status` | Filtra por status exato (ex.: `Link Aberto`) |
| `departamento` | Filtra por departamento exato |
| `limit` | Máx. de itens (default 100, teto 500) |
| `offset` | Paginação (default 0) |

```bash
curl "https://www.zeglammelhorcompra.com.br/api/v1/links?status=Link%20Aberto&limit=200" \
  -H "X-API-Key: SUA_API_KEY"
```

Resposta `200`:
```json
{
  "data": [ { "id": 1, "numero": 2, "nome": "...", "status": "Link Aberto", "...": "..." } ],
  "meta": { "total": 6, "limit": 200, "offset": 0 }
}
```

### 3.2 Buscar um link — `GET /api/v1/links/:id` (scope `read`)
`:id` é o **id interno** do banco (não o `numero`).
```bash
curl https://www.zeglammelhorcompra.com.br/api/v1/links/1 -H "X-API-Key: SUA_API_KEY"
```
`200` → `{ "data": { ... } }` · `404` → `{ "error": "not_found" }`

### 3.3 Criar link — `POST /api/v1/links` (scope `write`)
**Obrigatórios:** `numero`, `nome`. (Aceita `numero: 0`.)
```bash
curl -X POST https://www.zeglammelhorcompra.com.br/api/v1/links \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{
    "numero": 2,
    "nome": "RD Brutos 20% de Desconto - Link 002 Limeira",
    "status": "Link Aberto",
    "departamento": "Grupo Zeglam",
    "encerramentoLink": "2026-05-29"
  }'
```
Resposta `201`: `{ "data": { ... } }`

### 3.4 Atualizar link (parcial) — `PATCH /api/v1/links/:id` (scope `write`)
Envie **apenas** os campos a alterar. `:id` = id interno.
```bash
curl -X PATCH https://www.zeglammelhorcompra.com.br/api/v1/links/1 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{ "status": "Fechado", "observacoes": "Encerrado" }'
```
`200` → `{ "data": { ...atualizado } }` · `404` → `{ "error": "not_found" }`

### 3.5 Excluir link — `DELETE /api/v1/links/:id` (scope `write`)
Exclusão permanente. `:id` = id interno.
```bash
curl -X DELETE https://www.zeglammelhorcompra.com.br/api/v1/links/1 -H "X-API-Key: SUA_API_KEY"
```
`200` → `{ "success": true }`

---

## 4. Campos do link

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `numero` | int | ✅ (no POST) | Número/ID do link. **Recomendado:** use o número/ID da origem para casar no sync. |
| `nome` | string (≤500) | ✅ (no POST) | Nome completo. Ex.: `"TÍTULO - Link NNN CIDADE"`. |
| `status` | string (≤100) | — | Default `"Link Aberto"`. Veja mapeamento na seção 5. |
| `departamento` | string (≤200) | — | Ex.: `"Grupo Zeglam"`. |
| `observacoes` | string \| null | — | Texto livre. |
| `encerramentoLink` | string \| null | — | Data `"YYYY-MM-DD"` (= "Encerramento" da origem). |
| `encerramentoHorario` | string \| null | — | `"HH:MM"`, default `"00:00"`. |
| `conferenciaEstoque` | string \| null | — | Data `"YYYY-MM-DD"`. |
| `romaneiosClientes` | string \| null | — | Data `"YYYY-MM-DD"`. |
| `postadoFornecedor` | string \| null | — | Data `"YYYY-MM-DD"`. |
| `dataInicioSeparacao` | string \| null | — | Data `"YYYY-MM-DD"`. |
| `prazoMaxFinalizar` | string \| null | — | Data `"YYYY-MM-DD"`. |
| `liberadoEnvio` | string \| null | — | Data `"YYYY-MM-DD"`. |

> Datas são strings `"YYYY-MM-DD"` (não ISO com horário).

---

## 5. Mapeamento origem → este site

O sistema de joias (origem) usa o status **"Pronto e Aberto"**. Aqui o status equivalente é **"Link Aberto"** (é o que a página pública filtra por padrão).

| Origem (joias) | Este site |
|---|---|
| `Pronto e Aberto` | `Link Aberto` |
| Nome do link | `nome` |
| Encerramento | `encerramentoLink` (`YYYY-MM-DD`) |
| Número/ID do link | `numero` |

Adapte os demais status conforme o catálogo em `GET /api/statuses/list`.

---

## 6. Lógica de sincronização (recomendada para o cron)

⚠️ **Não há upsert automático.** `POST` sempre cria um novo registro, mesmo com `nome`/`numero` repetidos. `PATCH`/`DELETE` operam pelo **id interno**, que a origem não conhece.

Fluxo sugerido do cron:

1. `GET /api/v1/links?limit=500` → baixa todos os links atuais.
2. Para cada link "Pronto e Aberto" da origem:
   - Procura match na lista por `numero` (preferível) ou `nome`.
   - **Não achou** → `POST /api/v1/links` (cria).
   - **Achou e mudou** → `PATCH /api/v1/links/{id}` com os campos alterados.
3. Para links que saíram de "Pronto e Aberto" na origem → `PATCH` para o status novo (ex.: `Fechado`) ou `DELETE`.

> Para sync robusto por `numero`, sempre grave o número/ID da origem no campo `numero` ao criar.

---

## 7. Respostas de erro

| HTTP | `error` | Quando |
|---|---|---|
| 400 | `validation_error` | Faltou `numero` ou `nome` no POST |
| 400 | `invalid_id` | `:id` não numérico |
| 401 | `missing_api_key` | Sem header de API key |
| 401 | `invalid_api_key` | Chave inválida ou revogada |
| 403 | `insufficient_scope` | Chave sem scope `write` em operação de escrita |
| 404 | `not_found` | Link inexistente (GET id / PATCH) |
| 500 | `database_unavailable` | Banco fora do ar |
| 500 | `internal_error` | Erro inesperado |

---

## 8. Documentação interativa

- **OpenAPI JSON:** `GET https://www.zeglammelhorcompra.com.br/api/v1/openapi.json`
- **Swagger UI:** `https://www.zeglammelhorcompra.com.br/api/v1/docs`

---

## 9. Gerenciamento de API keys (master key)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/admin/api-keys` | Lista as keys (sem expor o segredo) |
| `POST` | `/api/admin/api-keys` | Cria key — retorna o segredo **uma vez** |
| `DELETE` | `/api/admin/api-keys/:id` | Revoga (desativa) a key |

Todas exigem `X-Admin-Key: SUA_MASTER_KEY` (ou login de admin via cookie).
