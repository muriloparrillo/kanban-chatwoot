# kanban-chatwoot — Memória do Projeto

## URLs e Tokens de Produção

| Chave | Valor |
|-------|-------|
| `KANBAN_URL` (frontend/backend) | `https://vai-novofoco-kanban-chatwoot-frontend.dutk9f.easypanel.host` |
| `ACCOUNT_TOKEN` (hardcoded no inject.js) | `0fb0a7572850a512f7127633a15e844673bd3e6cf839fa75` |
| Chatwoot base URL | `https://vai.agencianovofoco.com.br/` |
| Chatwoot API token | `XgikDew7eKWwuG2Bx9kBqef6` |

## Arquitetura

- **Monorepo**: `backend/` (Rails API) + `frontend/` (Vue 3 + Vite)
- **Deploy**: EasyPanel (Docker) — push no `main` aciona redeploy automático
- **DB**: PostgreSQL, multi-tenant por `chatwoot_account_id`
- **Inject**: `frontend/public/kanban-inject.js` — injetado como app no Chatwoot

## Multi-tenant / Isolamento

- `account_token` no inject.js = token da **instalação** (não da conta individual)
- Header `X-Chatwoot-Account-Id` identifica qual conta Chatwoot está acessando
- `BaseController#authenticate_account!` auto-provisiona Account isolado por cw_id na 1ª requisição
- Cada Account tem: funnels, leads, tags, products, scheduled_messages próprios

## Headers de API (inject.js)

```js
{
  'X-Account-Token': '0fb0a7572850a512f7127633a15e844673bd3e6cf839fa75',
  'X-Chatwoot-Account-Id': <id da conta Chatwoot do usuário logado>
}
```

## Chatwoot Client (`backend/app/services/chatwoot/client.rb`)

- Auth via header `api_access_token`
- `message_templates` busca `/api/v1/accounts/:id/message_templates` sem filtro de tipo
- Loga status e body bruto via `Rails.logger.info "[CRM] message_templates raw ..."`

## Endpoints relevantes

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/v1/funnels` | Lista funis |
| GET | `/api/v1/boards/:id` | Board kanban com leads |
| GET | `/api/v1/accounts/message_templates` | Templates WhatsApp |
| GET | `/api/v1/accounts/message_templates?debug=1` | Debug: retorna body bruto do Chatwoot |
| POST | `/api/v1/scheduled_messages` | Agendar mensagem |

## WhatsApp Message Templates

- Inbox WhatsApp: ID `11`, nome "Murilo Parrillo WhatsApp", tel `+5511945577827`
- Templates ficam no campo `message_templates` do próprio inbox (GET `/api/v1/accounts/1/inboxes`)
- Endpoint `/message_templates` e `/inboxes/11/message_templates` **não existem** nesta versão do Chatwoot (retornam HTML)
- Auth Chatwoot via `api_access_token` retorna 401 via curl do Mac local (possível restrição Cloudflare/IP)
- Auth via devise token headers funciona: `access-token`, `token-type`, `client`, `uid`
- Backend busca templates via `GET /inboxes` e extrai de inboxes com `channel_type = Channel::Whatsapp`

## Pendências conhecidas

- [ ] Verificar se backend (EasyPanel) consegue autenticar na API Chatwoot com `api_access_token: XgikDew7eKWwuG2Bx9kBqef6` — pode ser bloqueio de IP do Mac local no Cloudflare

## Regras do usuário (Murilo)

- NUNCA usar placeholders em comandos — usar sempre os valores reais
- Salvar infos do projeto neste CLAUDE.md
