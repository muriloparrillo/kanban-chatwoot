# Kanban Chatwoot — Gestão Visual de Leads

Aplicativo Kanban de gestão de leads integrado ao Chatwoot via **Dashboard App** (iframe embutido). Cada conta Chatwoot configura seus próprios funis, etapas, tags e responsáveis, e o Kanban sincroniza automaticamente com as conversas.

## Funcionalidades do MVP

- Múltiplos funis por conta Chatwoot (cada conta cria, duplica e exclui funis)
- Etapas configuráveis por funil (nome, cor, tipo — aberta/ganho/perdido, SLA)
- Board drag-and-drop entre etapas com atualização otimista
- Criação manual de leads **ou** sincronização automática com conversas do Chatwoot (webhook + backfill)
- Cards com contato, responsável (agente do Chatwoot), valor, prioridade, tags
- Modal do lead com **notas**, **anexos** e **histórico** completo de movimentações
- Filtros (busca, responsável, tag, prioridade)
- Autenticação por `account_token` por conta (mapeado via API Key do Chatwoot)

## Arquitetura

```
Chatwoot (iframe Dashboard App)
      │
      ▼
┌──────────────┐     REST     ┌─────────────────┐     API/Webhook    ┌─────────────┐
│  Frontend    │◄────────────►│ Backend Rails   │◄──────────────────►│  Chatwoot   │
│  Vue 3 + Vite│              │  API + Sidekiq  │                    │  (API Key)  │
└──────────────┘              └────────┬────────┘                    └─────────────┘
                                       │
                                       ▼
                          PostgreSQL + Redis + Storage (S3/Local)
```

- **Backend:** Ruby on Rails 7.1 (API only), PostgreSQL, Sidekiq/Redis, Faraday para o cliente Chatwoot
- **Frontend:** Vue 3 + Pinia + Vue Router + TailwindCSS + vuedraggable
- **Integração:** Webhooks Chatwoot + cliente HTTP para sync reverso

## Instalação rápida (Docker Compose)

```bash
cp .env.example .env
# edite SECRET_KEY_BASE e ALLOWED_ORIGINS
docker compose up -d --build
# Frontend: http://localhost:8080
# Backend:  http://localhost:3000/health
```

## Como instalar no Chatwoot (passo a passo)

### 1. Gerar o API Access Token no Chatwoot
1. Em sua instância Chatwoot, entre como **Administrador** da conta.
2. Vá em **Perfil** (canto superior direito) → **Perfil** → role até **"Access Token"**.
3. Copie o token. Esse token tem escopo de agente/administrador daquela conta.

### 2. Conectar a conta Chatwoot ao Kanban
1. Abra `https://<seu-kanban>/#/setup`
2. Preencha:
   - **ID da conta Chatwoot** (o número que aparece na URL da sua conta Chatwoot, p. ex. `/app/accounts/1/...` → `1`)
   - **URL base** da instância (ex.: `https://app.chatwoot.com` ou a URL self-hosted)
   - **API Access Token** copiado no passo anterior
3. Clique em **Conectar**. O sistema cria automaticamente um funil "Funil Principal" com 6 etapas padrão e retorna um **`account_token`** (token público do Kanban).

### 3. Registrar o Kanban como Dashboard App no Chatwoot
O Chatwoot permite embutir um iframe externo no **menu lateral esquerdo** da conta via o recurso "Dashboard Apps":

1. Em Chatwoot: **Configurações → Integrações → Dashboard Apps** (ou `Apps` em versões antigas).
2. Clique em **Novo Dashboard App**.
3. Preencha:
   - **Nome:** `Kanban de Leads`
   - **URL:** `https://<seu-kanban>/?account_token=<ACCOUNT_TOKEN_DO_PASSO_2>`
4. Salve. O app aparecerá no **menu lateral esquerdo** de cada conversa e/ou no menu de apps da conta (dependendo da versão do Chatwoot). Os agentes clicam e o Kanban abre dentro do Chatwoot.

> 💡 Dica: para ter o ícone persistente na barra lateral esquerda como um item fixo (estilo "CRM"), você pode combinar Dashboard App com um item de atalho. Em versões do Chatwoot ≥ 3.0 o Dashboard App fica listado no submenu "Apps" da barra lateral.

### 4. Configurar o webhook para sincronização automática de conversas
1. Em Chatwoot: **Configurações → Integrações → Webhooks → Adicionar novo**.
2. URL do webhook: copie a URL exibida na tela **Conta** do Kanban (`https://<seu-kanban>/webhooks/chatwoot/<account_token>`).
3. Selecione os eventos:
   - `conversation_created`
   - `conversation_updated`
   - `conversation_status_changed`
   - `contact_updated`
   - `message_created`
4. Salve. A partir daqui, toda nova conversa vira um **lead** no funil padrão.
5. Para importar conversas existentes, abra **Conta** no Kanban e clique em **Sincronizar conversas recentes** (usa a API do Chatwoot).

### 5. Pronto — agentes já podem usar
No Chatwoot, basta abrir o app "Kanban de Leads" pelo menu lateral:

- Arrastar leads entre etapas
- Criar novos funis em **Configurar Funis** (cada conta tem os seus)
- Adicionar/editar etapas em cada funil (renomear, mudar cor, definir SLA, marcar como "Ganho"/"Perdido")
- Adicionar notas, anexos, tags e ver histórico completo em cada lead

## Modelo de dados

| Tabela              | Finalidade                                                                 |
|---------------------|----------------------------------------------------------------------------|
| `accounts`          | Vincula uma conta Chatwoot (`chatwoot_account_id` + API token)             |
| `funnels`           | Funis de uma conta (nome, cor, padrão, posição)                            |
| `stages`            | Etapas de um funil (nome, cor, tipo, SLA, posição)                         |
| `leads`             | Cards do Kanban (contato, valor, responsável, stage, funnel)               |
| `lead_notes`        | Notas em um lead                                                           |
| `lead_attachments`  | Anexos em um lead (local ou S3)                                            |
| `lead_histories`    | Auditoria: criação, movimentação, notas, atribuição, arquivamento          |
| `tags` + join       | Tags reutilizáveis por conta                                               |

## Endpoints principais

| Método | Caminho                                              | Descrição                                      |
|--------|------------------------------------------------------|------------------------------------------------|
| POST   | `/api/v1/accounts`                                   | Registrar conta Chatwoot (bootstrap)           |
| GET    | `/api/v1/accounts/current`                           | Conta autenticada                              |
| POST   | `/api/v1/accounts/sync_conversations`                | Backfill das conversas                         |
| GET    | `/api/v1/funnels`                                    | Listar funis                                   |
| POST   | `/api/v1/funnels`                                    | Criar funil                                    |
| PATCH  | `/api/v1/funnels/:id/reorder_stages`                 | Reordenar etapas                               |
| GET    | `/api/v1/boards/:funnel_id`                          | Payload completo do board                      |
| PATCH  | `/api/v1/leads/:id/move`                             | Mover lead (drag & drop)                       |
| POST   | `/api/v1/leads/:id/notes` / `attachments` / `tags`   | Gestão do card                                 |
| POST   | `/webhooks/chatwoot/:account_token`                  | Webhook público (recebe eventos do Chatwoot)   |

Cabeçalho obrigatório (exceto bootstrap e webhook): `X-Account-Token: <account_token>`.

## Desenvolvimento local

```bash
# Backend
cd backend
bundle install
cp ../.env.example .env
bundle exec rails db:prepare
bundle exec rails s

# Frontend
cd frontend
npm install
npm run dev
```

## Segurança

- Cada conta possui um `account_token` opaco de 48 chars que autentica as chamadas do iframe.
- O `chatwoot_api_access_token` é armazenado no backend e **nunca** é exposto ao frontend.
- O `webhook_secret` acompanha a URL do webhook para permitir verificação por HMAC (recomendado adicionar verificação antes de produção).
- CORS restrito via `ALLOWED_ORIGINS`.
- O header `Content-Security-Policy: frame-ancestors` no Nginx do frontend restringe os domínios que podem embutir o app — aponte para sua URL do Chatwoot.

## Roadmap curto

- [ ] Verificação HMAC do webhook Chatwoot
- [ ] Relatórios por funil (conversão, tempo por etapa, previsão)
- [ ] Campo "motivo de perda" automático no tipo `lost`
- [ ] Sincronização bidirecional (mover no Kanban → comentar na conversa)
- [ ] SSO via token efêmero passado pelo Chatwoot (eliminando `account_token` estático)
- [ ] Importação CSV de leads legados
