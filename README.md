O fluxo “novo” de agentes (Agents SDK + FastMCP + App review)
Por que este fluxo?

Porque o Apps SDK é muito sensível a:

metadados de tool (nome/descrição/parâmetros) e anotações (readOnlyHint, openWorldHint, destructiveHint) — erro aqui é causa comum de rejeição 
OpenAI Developers
+2
OpenAI Developers
+2

segurança/privacidade (segredos, validação server-side, “least privilege”, CSP do widget) 
OpenAI Developers
+2
OpenAI Developers
+2

teste com MCP Inspector + golden prompts antes de submeter 
OpenAI Developers
+2
OpenAI Developers
+2

Então o pipeline precisa “forçar” essas etapas.

Padrão de orquestração recomendado

Use “agente central orquestrador + especialistas como ferramentas” (agents-as-tools) ao invés de handoffs livres.

Handoffs são ótimos, mas para um “construtor de app” você quer controle central, com gates e regressão.

O Agents SDK foi feito justamente pra orquestração, guardrails e tracing. 
OpenAI
+2
OpenAI Developers
+2

Pipeline em 8 etapas (com gates)
Etapa 0 — Intake e classificação (Triage/PM Agent)

Entrada: sua ideia em linguagem natural
Saída (artefato): app_spec.json (MVP) + “não‑objetivos” (o que NÃO vai fazer)

Gate obrigatório:

definir 1 intenção principal (MVP)

definir limites de dados (o que vai em structuredContent vs _meta) 
OpenAI Developers
+1

Dica de aprovação: menos escopo → menos tools → menos chance de tool errado disparar.

Etapa 1 — Tool Design (FastMCP‑style Toolsmith Agent)

Objetivo: desenhar tools no estilo “FastMCP”: 1 tool = 1 intenção, schema explícito, retorno previsível.

Saídas:

tools.contract.json contendo, para cada tool:

name (verbo + objeto / domain.action)

description começando com “Use this when…” e listando casos proibidos

inputSchema / outputSchema

annotations: readOnlyHint, openWorldHint, destructiveHint, e quando fizer sentido idempotentHint 
OpenAI Developers
+2
OpenAI Developers
+2

_meta["openai/outputTemplate"] (qual widget renderiza) 
OpenAI Developers
+1

Gate obrigatório (anti‑rejeição):

TODA tool tem as hints corretas (e justificável) 
OpenAI Developers
+1

Etapa 2 — Metadata & Discovery (Discovery Agent)

Objetivo: garantir que o modelo chama a tool certa, na hora certa.

Saídas:

golden_prompts.json (diretos / indiretos / negativos)

metadata.copy.md com descrições revisadas (“Use this when…”, “Do not use for…”) 
OpenAI Developers
+1

Gate obrigatório:

rodar golden prompts em dev mode (ou pelo menos preparar o dataset + expectativa por prompt) 
OpenAI Developers
+1

Etapa 3 — Arquitetura MCP + UI (Architect Agent)

Decide:

Quais tools precisam de widget

O que é “UI-only action” (refresh, paginar, ordenar etc)

Pontos críticos (Apps SDK):

Se o widget vai chamar tool por botão/refresh, marcar a tool com _meta["openai/widgetAccessible"]=true 
OpenAI Developers
+2
OpenAI Developers
+2

Se existir tool que o modelo não deveria ver, mas o widget pode chamar, usar _meta["openai/visibility"]="private" (isso reduz tool call “estranho” por texto) 
OpenAI Developers
+1

Etapa 4 — Implementação MCP Server (Backend Agent)

Saídas (código):

server/src/index.ts com:

registerResource do HTML text/html+skybridge (widget template) 
OpenAI Developers
+1

openai/widgetCSP com allowlist mínima (connect/resource/frame/redirect domains) — isso é importante para submissão e segurança 
OpenAI Developers
+2
OpenAI Developers
+2

registerTool com outputTemplate, schemas e annotations

Gate obrigatório (segurança):

tratar structuredContent, content, _meta e widget state como user-visible (sem chaves/tokens/segredos) 
OpenAI Developers
+3
OpenAI Developers
+3
OpenAI Developers
+3

validação server-side sempre (defense-in-depth contra prompt injection) 
OpenAI Developers
+1

Etapa 5 — Implementação Widget (Frontend Agent)

Saídas (código):

web/src/App.tsx (ou component.tsx) usando:

window.openai.toolOutput (structuredContent)

window.openai.toolResponseMetadata (_meta, só widget)

window.openai.widgetState + setWidgetState (persist UI state) 
OpenAI Developers
+1

window.openai.callTool(...) para refresh/ações diretas (quando marcado widgetAccessible) 
OpenAI Developers
+2
OpenAI Developers
+2

Gate obrigatório:

widgetState pequeno (a doc alerta que tudo que você passa é mostrado ao modelo; manter focado e abaixo de ~4k tokens) 
OpenAI Developers
+1

Etapa 6 — QA Técnico (QA Agent)

Executa:

npm run build (web) + build server

smoke test do servidor

MCP Inspector: listar tools, chamar tool, ver widget renderizar 
OpenAI Developers
+2
OpenAI Developers
+2

Saídas:

qa_report.md

screenshots do Inspector (úteis até pra launch review) 
OpenAI Developers
+1

Etapa 7 — Compliance (App Review Agent)

Checa contra:

App submission guidelines 
OpenAI Developers
+1

Security & Privacy 
OpenAI Developers
+1

Reference (campos obrigatórios, widgetAccessible, visibility, annotations etc) 
OpenAI Developers
+1

Gate obrigatório:

“tool names/signatures/descriptions” congeladas antes de submeter (porque mudanças depois exigem resubmissão) 
OpenAI Developers

Quais são as melhores “ferramentas” para dar aos agentes?

Aqui vale separar em 2 categorias: ferramentas do agente construtor (dev‑time) vs tools do seu app (runtime).

A) Ferramentas do agente construtor (dev‑time)
1) Tools nativas/estruturais do Agents SDK (vale MUITO usar)

O Agents SDK tem primitives e ferramentas para orquestrar e controlar fluxo:

Guardrails (entrada/saída): para forçar JSON válido, impedir “tool gigante”, e bloquear vazamento de segredo 
OpenAI
+1

Tracing (por padrão): para depurar onde o agente errou (qual tool chamou, qual schema gerou etc.) 
OpenAI GitHub Pages
+1

Human-in-the-loop approvals: excelente para “ações sensíveis” do construtor (ex.: publicar, mexer em secrets, rodar comandos perigosos). Você marca tool com needsApproval. 
OpenAI GitHub Pages

Structured Outputs (na plataforma): para o Spec Agent sempre produzir app_spec.json válido 
OpenAI Platform

2) Toolset mínimo que eu recomendo pro “Builder”

Você dá isso como Function Tools (funções locais) ou como MCP server local acoplado ao Agents SDK. O guia do Agents SDK lista MCP servers e function tools como categorias suportadas. 
OpenAI GitHub Pages
+1

Essenciais:

repo.readFile(path)

repo.writeFile(path, content) (quase sempre com approval ou pelo menos em modo diff)

repo.applyPatch(unifiedDiff | v4aDiff) (ideal)

repo.listTree(glob?)

cmd.run(command, args, cwd) com allowlist (npm, node, tsc, vite)

validate.jsonAgainstZod(schemaName, json) (pra contracts/spec)

Muito úteis (pra aprovação):
7. appsSdk.checkTools(contract)

verifica: annotations completas, names ok, descrição “Use this when…”, outputTemplate setado, widgetAccessible quando necessário, etc. 
OpenAI Developers
+2
OpenAI Developers
+2

security.scanNoSecrets()

grep por sk-, tokens, .env exposto, secrets em structuredContent/_meta/widgetState 
OpenAI Developers
+1

3) Melhor “tool de programação” pronta: Codex como MCP server

Se você quer um construtor realmente “ponta a ponta”, uma abordagem muito forte é:

Rodar Codex CLI como um MCP server

Orquestrar pelo Agents SDK (com handoffs/guardrails/traces)

Isso está documentado como fluxo para criar pipelines de software delivery mais determinísticos e auditáveis. 
OpenAI Developers

B) “Melhores tools” do seu app (runtime) no estilo FastMCP

Aqui é o que mais impacta aprovação e UX nativa:

1) Conjunto base (quase sempre)

list_<recurso> (readOnlyHint: true)

get_<recurso> (readOnlyHint: true)

create_<recurso> (write → openWorld/destructive conforme caso)

update_<recurso> (write)

delete_<recurso> (destructiveHint: true) 
OpenAI Developers
+1

2) Tools para widget interativo

refresh_<coisa> com _meta["openai/widgetAccessible"]=true pra botão “Atualizar” no widget 
OpenAI Developers
+2
OpenAI Developers
+2

Se for “só do widget”, deixe private pra não aparecer pro modelo:

_meta["openai/visibility"]="private" 
OpenAI Developers
+1

3) Regras que evitam rejeição e bugs

Tool idempotente quando possível (ChatGPT pode retry). Marque idempotentHint quando fizer sentido e implemente idempotência de verdade. 
OpenAI Developers
+1

structuredContent enxuto (o modelo lê isso “verbatim”), e _meta para payload grande/sensível do widget. 
OpenAI Developers
+1

Checklist rápido “aprovação‑friendly” (o que seu fluxo precisa garantir)

Annotations corretas em TODAS as tools (readOnlyHint, openWorldHint, destructiveHint) 
OpenAI Developers
+1

CSP do widget (allowlist mínima; frame_domains só se inevitável porque aumenta escrutínio) 
OpenAI Developers
+2
OpenAI Developers
+2

Sem segredos em structuredContent, _meta, content e widgetState 
OpenAI Developers
+2
OpenAI Developers
+2

Teste com MCP Inspector + evidências (screenshots) 
OpenAI Developers
+2
OpenAI Developers
+2

Golden prompt set rodado e iterado (descoberta/precisão/negativos) 
OpenAI Developers
+1

Congelar tools antes de submit (mudou assinatura/descrição? normalmente é resubmissão) 
OpenAI Developers

Em uma frase: “como fica o novo fluxo?”

Orquestrador central (Agents SDK) → Spec → Toolsmith (FastMCP style) → Implementação (server/web) → QA (Inspector + builds) → Compliance (guidelines + security/privacy) → Freeze + Submit.

Se você quiser, eu te passo um esqueleto completo do “builder/” em TypeScript usando @openai/agents com:

agentes (Spec/Toolsmith/Backend/Frontend/QA/Compliance),

function tools (repo/cmd),

approvals (needsApproval),

e um “AppsSDK linter” que valida annotations + _meta obrigatório.

Mas mesmo sem eu ver seu repositório, o desenho acima já é o padrão mais seguro e alinhado ao que o Apps SDK documenta.
