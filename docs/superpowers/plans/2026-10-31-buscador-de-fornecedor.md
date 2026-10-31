# Buscador de Fornecedor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um app interno em que o time de orçamento da Agência Surtô busca fornecedores por serviço e região, vê contatos verificados e envia pedidos de orçamento por Gmail e WhatsApp, sem nenhuma cobrança.

**Architecture:** Site estático em React que chama Edge Functions do Supabase. As funções protegem as chaves, contam a cota e falam com Google Places, sites de fornecedores e Gmail. Regras puras ficam em `supabase/functions/_shared/` e são usadas pelas funções e pela tela. Cada função separa `handler.ts`, testável com dependências injetadas, de `index.ts`, que só faz `Deno.serve`.

**Tech Stack:** Node 22 LTS, Vite, React, TypeScript, Vitest, Testing Library, `@supabase/supabase-js`, Supabase CLI (Postgres, RLS, Edge Functions em Deno, pgTAP via Docker), Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-10-31-buscador-de-fornecedor-design.md`

## Global Constraints

- Nenhuma cobrança: Text Search e Place Details têm limite de 32 por dia configurado no Google. A implementação não começa sem isso (Task 1).
- Bloqueio no app: 950 por mês em Text Search e 950 por mês somando Place Details Pro e Enterprise. Aviso a partir de 80% (760).
- Dia e mês de cota seguem a meia-noite do Pacífico (`America/Los_Angeles`).
- Nunca persistir nome, endereço, telefone, nota ou site vindos do Google. Persistir só `place_id`.
- Campos de modelo: `{fornecedor}`, `{servico}`, `{evento}`, `{data}`, `{local}`, `{prazo}`.
- O histórico guarda o modelo com `{fornecedor}` sem preencher.
- Login e toda função: só `@agenciasurto.com`, conferido no servidor.
- Gmail: apenas o escopo `gmail.send`. Até 100 e-mails por pessoa por dia, um destinatário por mensagem.
- WhatsApp: só abre o link. O app nunca envia sozinho.
- Sites: até 3 páginas por site, 8 segundos por página, 1 MB por página, só HTTP ou HTTPS públicos.
- Resultados: 20 por página, máximo de 60, logo do Google e link do Maps visíveis. Sem mapa.
- Textos da interface em português do Brasil.
- Fora do escopo: portfólio, mapa, envio automático pelo WhatsApp, leitura de respostas, comparação de preços e exportação.

## Review Focus

- Telefones reais em formatos variados (`+55 (19) 99999-8888`, `0800`, fixo, DDD inválido) devem ser classificados sem criar botão de WhatsApp errado. Teste na Task 3.
- Sites brasileiros em ISO-8859-1, com `mailto:` codificado, redirecionamento para IP interno, PDF ou página gigante devem gerar resultado parcial, sem erro nem acesso interno. Testes nas Tasks 3 e 4.
- Duas pessoas buscando ao mesmo tempo com uma consulta restante: só uma passa, sem ultrapassar o limite. Teste na Task 5.
- Assunto e corpo com acentos e emoji, nome de fornecedor com quebra de linha e campo do modelo sem valor: e-mail legível, sem injeção de cabeçalho e envio bloqueado até preencher. Testes nas Tasks 2 e 8.
- Autorização do Gmail revogada no meio de um envio em lote: os enviados continuam registrados, os demais pedem nova autorização, sem perder o texto nem a seleção. Teste na Task 11.

---

### Task 1: Pré-requisitos e confirmação do limite diário

Tarefa operacional, feita com o responsável da agência. **Nenhum código é escrito antes de ela terminar.**

**Files:**
- Create: `docs/operacao/google.md`

**Interfaces:**
- Produces: `GOOGLE_PLACES_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `SUPABASE_URL`, chaves do Supabase. Valores secretos nunca vão para o git nem para o documento.

- [ ] **Step 1: Criar o projeto no Google Cloud** dentro da organização `agenciasurto.com`, vincular o faturamento e ativar Places API (New) e Gmail API.

- [ ] **Step 2: Configurar os limites** em Google Maps Platform > Quotas: Text Search = 32 por dia e Place Details = 32 por dia.

Passa se o painel mostrar os dois limites por dia com valor 32. **Se não houver limite por dia, pare e devolva a decisão ao usuário: a garantia de nenhuma cobrança não existe.**

- [ ] **Step 3: Criar o alerta de orçamento** para o responsável, com aviso à primeira despesa.

- [ ] **Step 4: Configurar o OAuth** com tela de consentimento **interna**, escopo `gmail.send` e cliente Web. O administrador aprova o app se o Workspace exigir.

- [ ] **Step 5: Criar o projeto no Supabase** (nome `buscador-fornecedor`, região São Paulo) e conferir os limites em supabase.com/pricing.

- [ ] **Step 6: Instalar as ferramentas** Node 22 LTS e confirmar com `node -v` e `docker version`.

- [ ] **Step 7: Registrar em `docs/operacao/google.md`** o que foi configurado, com a data e sem segredos, e fazer o commit.

### Task 2: Estrutura do projeto, modelos de mensagem e link do WhatsApp

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`, `src/main.tsx`
- Create: `supabase/functions/_shared/mensagem.ts`
- Test: `tests/shared/mensagem.test.ts`

**Interfaces:**
- Produces: alias `@shared` para `supabase/functions/_shared`. `CamposModelo = { fornecedor; servico; evento; data; local; prazo }`, todos `string`. `preencherModelo(texto: string, campos: CamposModelo): string`. `camposFaltando(texto: string, campos: CamposModelo): string[]`. `linkWhatsApp(numero: string, texto: string): string`.

- [ ] **Step 1: Criar o projeto** com Vite, React e TypeScript, Vitest e o alias `@shared`. `.gitignore` inclui `node_modules`, `dist`, `.env*` (menos `.env.example`) e `supabase/.temp`. Código em `_shared` não importa nada de Node nem de npm.

- [ ] **Step 2: Provar que o Supabase roda neste caminho**

Run: `npx supabase init` e `npx supabase start`
Expected: serviços no ar. O caminho tem espaços, acento e OneDrive. Se o Docker falhar por isso, pare e informe o usuário, sem mover a pasta por conta própria. Oriente a marcar `node_modules` como "liberar espaço" no OneDrive se a sincronização atrapalhar.

- [ ] **Step 3: Escrever os testes que falham**

```ts
const campos = { fornecedor: 'Som & Luz', servico: 'som', evento: 'Evento X', data: '10/12/2026', local: 'Campinas', prazo: '05/12/2026' };
test('preenche todos os campos', () => expect(preencherModelo('Olá {fornecedor}, {servico} em {local}', campos)).toBe('Olá Som & Luz, som em Campinas'));
test('aponta campo vazio', () => expect(camposFaltando('{data} {prazo}', { ...campos, prazo: ' ' })).toEqual(['prazo']));
test('mantém chave desconhecida', () => expect(preencherModelo('{outro}', campos)).toBe('{outro}'));
test('valor com chave não é preenchido de novo', () => expect(preencherModelo('{fornecedor}', { ...campos, fornecedor: '{data}' })).toBe('{data}'));
test('link com acento e emoji', () => expect(linkWhatsApp('5519999998888', 'Olá 🎉')).toBe('https://wa.me/5519999998888?text=Ol%C3%A1%20%F0%9F%8E%89'));
test('link recusa número não normalizado', () => expect(() => linkWhatsApp('+55 19', 'x')).toThrow());
```

- [ ] **Step 4: Confirmar a falha**

Run: `npx vitest run tests/shared/mensagem.test.ts`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 5: Implementar as três funções em `mensagem.ts`**, substituindo em uma única passada com regex.

- [ ] **Step 6: Confirmar que passa**

Run: `npx vitest run tests/shared/mensagem.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit** `feat: cria projeto e regras de mensagem`.

### Task 3: Telefones e extração de contatos do HTML

**Files:**
- Create: `supabase/functions/_shared/telefone.ts`, `supabase/functions/_shared/extrair.ts`
- Test: `tests/shared/telefone.test.ts`, `tests/shared/extrair.test.ts`

**Interfaces:**
- Produces: `classificarTelefone(bruto: string): { tipo: 'celular' | 'fixo' | 'outro'; numero: string | null }`, em que `numero` tem o formato `55DDDNNNNNNNNN`. `extrairDoHtml(html: string): { emails: string[]; whatsapps: string[]; nome: string | null; linksContato: string[] }`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test.each([
  ['+55 (19) 99999-8888', 'celular', '5519999998888'],
  ['(19) 99999-8888', 'celular', '5519999998888'],
  ['19 3333-4444', 'fixo', '551933334444'],
  ['0800 123 4567', 'outro', null],
  ['(00) 99999-8888', 'outro', null],
  ['+1 415 555 0100', 'outro', null],
])('%s', (bruto, tipo, numero) => expect(classificarTelefone(bruto)).toEqual({ tipo, numero }));

test('mailto codificado e sem duplicar', () => expect(extrairDoHtml('<a href="mailto:contato%40somluz.com.br?subject=x">a</a> contato@somluz.com.br').emails).toEqual(['contato@somluz.com.br']));
test('descarta noreply e imagem', () => expect(extrairDoHtml('noreply@x.com logo@2x.png a@sentry.io').emails).toEqual([]));
test('entende as duas formas de WhatsApp', () => expect(extrairDoHtml('<a href="https://wa.me/5519999998888"></a><a href="https://api.whatsapp.com/send?phone=5519988887777"></a>').whatsapps).toEqual(['5519999998888', '5519988887777']));
test('usa og:site_name antes de title', () => expect(extrairDoHtml('<meta property="og:site_name" content="Som &amp; Luz"><title>Início</title>').nome).toBe('Som & Luz'));
test('encontra até duas páginas de contato', () => expect(extrairDoHtml('<a href="/contato">c</a><a href="/fale-conosco">f</a><a href="/orcamento">o</a><a href="/blog">b</a>').linksContato).toEqual(['/contato', '/fale-conosco']));
```

- [ ] **Step 2: Confirmar a falha**

Run: `npx vitest run tests/shared/telefone.test.ts tests/shared/extrair.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar com regex, sem executar nada do HTML.** Celular é DDD 11 a 99, sem zero, mais `9` e 8 dígitos. Fixo é DDD mais dígito inicial de 2 a 5 e 7 dígitos. Descartar `noreply`, `no-reply`, `sentry`, `wixpress`, `example` e extensões de imagem. `linksContato` reconhece `contato`, `contact`, `fale-conosco`, `orcamento`, `sobre`.

- [ ] **Step 4: Confirmar que passa** com o mesmo comando. Expected: PASS.

- [ ] **Step 5: Commit** `feat: classifica telefones e extrai contatos`.

### Task 4: Visita segura aos sites e verificação de MX

**Files:**
- Create: `supabase/functions/_shared/url-segura.ts`, `supabase/functions/_shared/visitar.ts`, `supabase/functions/_shared/mx.ts`
- Test: `tests/shared/url-segura.test.ts`, `tests/shared/visitar.test.ts`, `tests/shared/mx.test.ts`

**Interfaces:**
- Consumes: `extrairDoHtml` (Task 3).
- Produces: `urlPublica(url: string, resolver: (host: string) => Promise<string[]>): Promise<boolean>`. `visitarSite(site: string, deps: { fetch: typeof fetch; resolver }): Promise<{ noAr: boolean; dominio: string | null; nome: string | null; emails: string[]; whatsapps: string[] }>`. `dominioRecebeEmail(dominio: string, fetch: typeof fetch): Promise<boolean>`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test.each(['http://localhost', 'http://127.0.0.1', 'http://10.0.0.1', 'http://192.168.0.1', 'http://169.254.169.254', 'http://[::1]', 'ftp://x.com', 'file:///etc/passwd'])('recusa %s', async (u) => expect(await urlPublica(u, publico)).toBe(false));
test('recusa host que resolve para IP interno', async () => expect(await urlPublica('https://x.com', async () => ['10.0.0.5'])).toBe(false));
test('recusa redirecionamento para IP interno', async () => { /* fetch mock: 302 para http://10.0.0.1 */ expect((await visitarSite('https://x.com', deps)).noAr).toBe(false); expect(chamadas).not.toContain('http://10.0.0.1/'); });
test('lê no máximo 3 páginas', async () => { /* home com 3 links de contato */ await visitarSite('https://x.com', deps); expect(chamadas).toHaveLength(3); });
test('site lento dá noAr falso sem lançar', async () => expect((await visitarSite('https://lento.com', depsTimeout)).noAr).toBe(false));
test('decodifica ISO-8859-1', async () => expect((await visitarSite('https://x.com', depsLatin1)).nome).toBe('Locação São João'));
test('ignora PDF e corta acima de 1 MB', async () => expect((await visitarSite('https://x.com', depsPdf)).emails).toEqual([]));
test('MX presente', async () => expect(await dominioRecebeEmail('x.com', fetchMx(['mx.x.com']))).toBe(true));
test('MX ausente ou erro no DNS', async () => expect(await dominioRecebeEmail('x.com', fetchFalha)).toBe(false));
```

- [ ] **Step 2: Confirmar a falha**

Run: `npx vitest run tests/shared/url-segura.test.ts tests/shared/visitar.test.ts tests/shared/mx.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar.** `visitarSite` usa `redirect: 'manual'`, revalida cada destino com `urlPublica`, aceita até 3 redirecionamentos, aplica `AbortSignal.timeout(8000)`, para de ler em 1 MB, só aceita `text/html` e decodifica com `TextDecoder` pelo charset informado. O `dominio` vem do endereço que respondeu, sem `www.`. `dominioRecebeEmail` usa DNS sobre HTTPS em `https://dns.google/resolve?name=<dominio>&type=MX`.

- [ ] **Step 4: Confirmar que passa** com o mesmo comando. Expected: PASS.

- [ ] **Step 5: Commit** `feat: visita sites com segurança e confere MX`.

### Task 5: Banco de dados, regras de acesso e reserva atômica de cota

**Files:**
- Create: `supabase/migrations/20261031000000_inicial.sql`
- Test: `supabase/tests/acesso.test.sql`, `supabase/tests/cota.test.sql`, `tests/shared/cota.test.ts`
- Create: `supabase/functions/_shared/cota.ts`

**Interfaces:**
- Produces, tabelas:
  - `pedidos(id, nome, servico, regiao, evento_data, local, prazo, autor_email, criado_em)`
  - `pedido_fornecedores(id, pedido_id, place_id, situacao, unique(pedido_id, place_id))`, em que `situacao` é `selecionado | enviado | falhou`
  - `fornecedor_contatos(place_id pk, nome, dominio, email, whatsapp, site_no_ar, verificado_em, email_invalido, nao_contatar, nao_contatar_motivo)`
  - `modelos(id, titulo, assunto, corpo, autor_email)`
  - `envios(id, pedido_fornecedor_id, canal, autor_email, criado_em, situacao, assunto_modelo, corpo_modelo, motivo_falha, chave_idempotencia unique)`, em que `canal` é `email | whatsapp` e `situacao` é `enviando | enviado | falhou | whatsapp_aberto`
  - `cota_uso(dia date, faixa text, usadas int, primary key(dia, faixa))`, em que `faixa` é `text_search | details_pro | details_enterprise`
  - `credenciais_gmail(autor_email pk, refresh_token_cifrado, atualizado_em)`
- Produces, funções SQL: `eh_agencia() returns boolean`. `reservar_consulta(p_faixa text) returns boolean`, só para `service_role`. `esgotar_dia(p_faixa text) returns void`, só para `service_role`. `status_cota() returns table(faixa, usadas_dia, usadas_mes)`.
- Produces, TS: `diaDoGoogle(agora: Date): string`, `calcularStatus(usadasDia: number, usadasMes: number): { restantes: number; base: 'dia' | 'mes'; alerta: boolean }`.

- [ ] **Step 1: Escrever os testes pgTAP que falham**

Em `acesso.test.sql`: anônimo não lê nenhuma tabela. E-mail `a@outro.com` não lê nem escreve. `a@agenciasurto.com` lê e cria pedidos. Ninguém além de `service_role` lê `credenciais_gmail`. O cliente não altera `cota_uso`. Uma consulta a `information_schema.columns` garante que nenhuma coluna se chame `endereco`, `telefone`, `nota` ou `site`.

Em `cota.test.sql`: após 32 reservas de `text_search` no dia, a seguinte retorna `false`. Com 950 no mês, a reserva retorna `false` mesmo com o dia zerado. `details_pro` e `details_enterprise` somam no mesmo limite de 32 por dia e 950 por mês. `esgotar_dia` faz a próxima reserva falhar.

Em `tests/shared/cota.test.ts`:

```ts
test('23h30 em Brasília ainda é o mesmo dia do Google', () => expect(diaDoGoogle(new Date('2026-11-01T02:30:00Z'))).toBe('2026-10-31'));
test('vira depois da meia-noite do Pacífico', () => expect(diaDoGoogle(new Date('2026-11-02T08:30:00Z'))).toBe('2026-11-02'));
test('mostra o dia', () => expect(calcularStatus(14, 100)).toEqual({ restantes: 18, base: 'dia', alerta: false }));
test('mostra o mês quando resta menos', () => expect(calcularStatus(0, 940)).toEqual({ restantes: 10, base: 'mes', alerta: true }));
test('alerta aos 760', () => expect(calcularStatus(0, 760).alerta).toBe(true));
test('nunca negativo', () => expect(calcularStatus(40, 960).restantes).toBe(0));
```

- [ ] **Step 2: Confirmar a falha**

Run: `npx supabase test db` e `npx vitest run tests/shared/cota.test.ts`
Expected: FAIL.

- [ ] **Step 3: Escrever a migration.** RLS ativo em todas as tabelas. `eh_agencia()` lê o e-mail do JWT e compara o final, sem diferenciar maiúsculas, com `@agenciasurto.com`. `reservar_consulta` usa `pg_advisory_xact_lock` por grupo de limite, para que requisições simultâneas não passem do limite, e calcula dia e mês em `America/Los_Angeles`.

- [ ] **Step 4: Implementar `cota.ts`** com `Intl.DateTimeFormat` no fuso `America/Los_Angeles`.

- [ ] **Step 5: Adicionar teste de simultaneidade**

Em `cota.test.sql`, com a cota em 31, duas chamadas em conexões separadas via `dblink` resultam em exatamente uma `true`.

- [ ] **Step 6: Confirmar que passa**

Run: `npx supabase test db` e `npx vitest run tests/shared/cota.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit** `feat: cria banco, regras de acesso e cota`.

### Task 6: Autenticação e funções do Google Places

**Files:**
- Create: `supabase/functions/_shared/auth.ts`, `supabase/functions/_shared/places.ts`
- Create: `supabase/functions/buscar/handler.ts`, `supabase/functions/buscar/index.ts`
- Create: `supabase/functions/detalhes/handler.ts`, `supabase/functions/detalhes/index.ts`
- Test: `tests/functions/buscar.test.ts`, `tests/functions/detalhes.test.ts`

**Interfaces:**
- Consumes: `reservar_consulta`, `esgotar_dia` (Task 5).
- Produces:
  - `exigirAgencia(req: Request, getUser): Promise<{ email: string } | Response>`
  - `POST /buscar { servico: string; regiao: string; pageToken?: string }` → `{ fornecedores: FornecedorGoogle[]; pageToken: string | null }`
  - `POST /detalhes { placeId: string; tipo: 'dados' | 'telefone' }` → `Partial<FornecedorGoogle>`
  - `FornecedorGoogle = { placeId; nome; endereco; nota: number | null; mapsUrl; site: string | null; telefone: string | null }`
  - Erros: `{ erro: 'nao_autorizado' | 'limite_diario' | 'limite_mensal' | 'entrada_invalida' | 'nao_encontrado' | 'google_indisponivel' }`, com status 401, 429, 429, 400, 404 e 502.

- [ ] **Step 1: Escrever os testes que falham**, com dependências simuladas

```ts
test('recusa outro domínio sem reservar cota', async () => { const r = await buscar(req({ email: 'a@outro.com' }), deps); expect(r.status).toBe(401); expect(deps.reservar).not.toHaveBeenCalled(); });
test('reserva antes de chamar o Google', ...);
test('sem reserva não chama o Google', async () => { deps.reservar.mockResolvedValue(false); expect((await buscar(reqOk, deps)).status).toBe(429); expect(deps.google).not.toHaveBeenCalled(); });
test('envia máscara, idioma e tamanho', async () => { await buscar(reqOk, deps); expect(deps.google.mock.calls[0][1].headers['X-Goog-FieldMask']).toContain('places.websiteUri'); expect(body.pageSize).toBe(20); expect(body.languageCode).toBe('pt-BR'); expect(body.regionCode).toBe('BR'); expect(body.textQuery).toBe('locação de som em Campinas'); });
test('429 do Google esgota o dia', async () => { deps.google.mockResolvedValue(new Response('', { status: 429 })); await buscar(reqOk, deps); expect(deps.esgotarDia).toHaveBeenCalledWith('text_search'); });
test('recusa entrada vazia ou acima de 120 caracteres sem gastar cota', ...);
test('não grava nada no banco', () => expect(deps.db.insert).not.toHaveBeenCalled());
test('dados usa faixa Pro e não pede telefone', async () => { await detalhes(req({ placeId: 'p', tipo: 'dados' }), deps); expect(deps.reservar).toHaveBeenCalledWith('details_pro'); expect(mascara()).not.toContain('PhoneNumber'); });
test('telefone usa faixa Enterprise e só pede telefone', ...);
test('404 do Google vira nao_encontrado', ...);
```

- [ ] **Step 2: Confirmar a falha**

Run: `npx vitest run tests/functions/buscar.test.ts tests/functions/detalhes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar.** Text Search em `https://places.googleapis.com/v1/places:searchText`. Máscara: `places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.rating,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,nextPageToken`. Place Details em `https://places.googleapis.com/v1/places/{id}`. Dados: `id,displayName,formattedAddress,googleMapsUri`. Telefone: `nationalPhoneNumber,internationalPhoneNumber`. Chave em `X-Goog-Api-Key`, lida de `GOOGLE_PLACES_API_KEY`. `index.ts` trata CORS só para a origem em `APP_ORIGIN`.

- [ ] **Step 4: Confirmar que passa** com o mesmo comando. Expected: PASS.

- [ ] **Step 5: Commit** `feat: adiciona busca e detalhes do Google Places`.

### Task 7: Função de verificação de contatos

**Files:**
- Create: `supabase/functions/verificar/handler.ts`, `supabase/functions/verificar/index.ts`
- Test: `tests/functions/verificar.test.ts`

**Interfaces:**
- Consumes: `exigirAgencia` (Task 6), `visitarSite`, `dominioRecebeEmail` (Task 4).
- Produces: `POST /verificar { placeId: string; site: string | null }` → `ContatoVerificado = { placeId; nome: string | null; dominio: string | null; email: string | null; emailVerificado: boolean; whatsapp: string | null; siteNoAr: boolean | null; naoContatar: boolean; emailInvalido: boolean }`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('usa contato verificado há menos de 30 dias sem visitar o site', ...);
test('revisita após 30 dias e mantém nao_contatar e email_invalido', ...);
test('só salva e-mail se o domínio tiver MX', ...);
test('prefere e-mail do mesmo domínio do site', ...);
test('site null não visita e retorna siteNoAr null', ...);
test('site fora do ar salva noAr falso e não lança', ...);
test('grava só place_id, nome, dominio, email, whatsapp e datas: nunca a URL recebida', ...);
```

- [ ] **Step 2: Confirmar a falha**

Run: `npx vitest run tests/functions/verificar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar** com upsert em `fornecedor_contatos` via `service_role`.

- [ ] **Step 4: Confirmar que passa** com o mesmo comando. Expected: PASS.

- [ ] **Step 5: Commit** `feat: verifica contatos do site do fornecedor`.

### Task 8: Credencial do Gmail e envio de e-mail

**Files:**
- Create: `supabase/functions/_shared/cripto.ts`, `supabase/functions/_shared/mime.ts`
- Create: `supabase/functions/salvar-credencial/handler.ts`, `supabase/functions/salvar-credencial/index.ts`
- Create: `supabase/functions/enviar-email/handler.ts`, `supabase/functions/enviar-email/index.ts`
- Test: `tests/shared/cripto.test.ts`, `tests/shared/mime.test.ts`, `tests/functions/enviar-email.test.ts`

**Interfaces:**
- Consumes: `exigirAgencia` (Task 6), `preencherModelo`, `camposFaltando` (Task 2), tabelas da Task 5.
- Produces:
  - `POST /salvar-credencial { refreshToken: string }` → `{ ok: true }`
  - `POST /enviar-email { pedidoFornecedorId: string; nomeFornecedor: string; assuntoModelo: string; corpoModelo: string; chaveIdempotencia: string }` → `{ situacao: 'enviado' | 'falhou'; motivo?: string; jaEnviado?: boolean }`
  - Erros: `{ erro: 'reautorizar' }` (401), `'nao_contatar'` (409), `'email_indisponivel'` (409), `'campos_faltando'` (400), `'limite_diario_email'` (429)

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('cifra e decifra, com saída diferente a cada vez', ...);
test('assunto com acento usa RFC 2047', () => expect(montarMime(m)).toContain('Subject: =?UTF-8?B?'));
test('quebra de linha no nome não cria cabeçalho', () => expect(montarMime({ ...m, assunto: 'a\r\nBcc: x@y.com' })).not.toMatch(/^Bcc:/m));
test('corpo com emoji sobrevive ida e volta em base64url', ...);
test('destinatário vem do banco, não do pedido', ...);
test('bloqueia nao_contatar e email_invalido sem chamar o Gmail', ...);
test('bloqueia campo sem valor', ...);
test('bloqueia o 101º e-mail do dia da mesma pessoa', ...);
test('mesma chave de idempotência envia uma vez só', ...);
test('invalid_grant apaga a credencial e pede reautorizar', ...);
test('erro do Gmail registra falhou com motivo e permite nova tentativa com outra chave', ...);
test('envios guarda o modelo com {fornecedor} sem preencher', () => expect(envio.corpo_modelo).toContain('{fornecedor}'));
```

- [ ] **Step 2: Confirmar a falha**

Run: `npx vitest run tests/shared/cripto.test.ts tests/shared/mime.test.ts tests/functions/enviar-email.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar.** Cifra AES-GCM com WebCrypto e chave `CREDENCIAL_KEY`. Troca do refresh token em `https://oauth2.googleapis.com/token`. Envio em `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`. Inserir `envios` com `situacao='enviando'` antes de enviar: conflito em `chave_idempotencia` retorna `jaEnviado: true` sem novo envio. Os campos do pedido vêm do banco. A assinatura usa o e-mail de quem envia e o nome `Agência Surtô`.

- [ ] **Step 4: Confirmar que passa** com o mesmo comando. Expected: PASS.

- [ ] **Step 5: Commit** `feat: envia e-mail pela conta de cada pessoa`.

### Task 9: Login, layout e status da cota

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/api.ts`, `src/App.tsx`, `src/components/Login.tsx`, `src/components/StatusCota.tsx`, `src/hooks/useStatusCota.ts`, `src/styles.css`
- Test: `tests/ui/StatusCota.test.tsx`, `tests/ui/App.test.tsx`

**Interfaces:**
- Consumes: `calcularStatus`, `status_cota()` (Task 5), `/salvar-credencial` (Task 8).
- Produces: `chamarFuncao<T>(nome: string, corpo: unknown): Promise<T>`, que lança `ErroApi { codigo: string }`. `useStatusCota(): { restantes; base; alerta; atualizar(): Promise<void> }`.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
test('mostra o dia', () => { render(<StatusCota restantes={18} base="dia" alerta={false} />); expect(screen.getByText('Buscas restantes hoje: 18 de 32')).toBeVisible(); });
test('mostra o mês', () => { render(<StatusCota restantes={10} base="mes" alerta />); expect(screen.getByText('Buscas restantes no mês: 10 de 950')).toBeVisible(); });
test('zerado informa o horário de renovação', () => { render(<StatusCota restantes={0} base="dia" alerta={false} />); expect(screen.getByText(/entre 4h e 5h de Brasília/)).toBeVisible(); });
test('avisa quando alerta é verdadeiro', () => { render(<StatusCota restantes={10} base="mes" alerta />); expect(screen.getByRole('status')).toHaveTextContent(/cota do mês/); });
test('conta de outro domínio é desconectada com aviso', ...);
test('status aparece em todas as telas logadas', ...);
```

- [ ] **Step 2: Confirmar a falha**

Run: `npx vitest run tests/ui/StatusCota.test.tsx tests/ui/App.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** Login com `signInWithOAuth`, provedor `google`, escopos `https://www.googleapis.com/auth/gmail.send`, `queryParams: { access_type: 'offline', prompt: 'consent', hd: 'agenciasurto.com' }`. No retorno, enviar `provider_refresh_token` para `/salvar-credencial`. Atualizar o status a cada 60 segundos e depois de cada consulta.

- [ ] **Step 4: Confirmar que passa** com o mesmo comando. Expected: PASS.

- [ ] **Step 5: Commit** `feat: adiciona login e status de buscas restantes`.

### Task 10: Novo pedido, resultados e indicadores

**Files:**
- Create: `src/lib/indicadores.ts`, `src/hooks/useVerificacao.ts`, `src/pages/NovoPedido.tsx`, `src/components/ListaResultados.tsx`, `src/components/CartaoFornecedor.tsx`
- Test: `tests/ui/indicadores.test.ts`, `tests/ui/NovoPedido.test.tsx`

**Interfaces:**
- Consumes: `/buscar`, `/verificar`, `classificarTelefone`, `useStatusCota`.
- Produces: `indicadores(f: FornecedorGoogle | null, c: ContatoVerificado | null): Indicador[]`, em que `Indicador` é `'email_verificado' | 'whatsapp_site' | 'whatsapp_provavel' | 'so_fixo' | 'site_fora'`. `grupoOrdenacao(ind: Indicador[]): 0 | 1 | 2`. `whatsappDoFornecedor(f, c): string | null`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test('link do site vence o telefone do Google', ...);
test('celular sem link é provável', ...);
test('fixo não gera botão de WhatsApp', () => expect(whatsappDoFornecedor(fixo, null)).toBeNull());
test('e-mail inválido deixa de contar', ...);
test('ordena os dois canais, depois um, depois nenhum', ...);
```
```tsx
test('lista aparece antes de terminar a verificação', ...);
test('site lento não trava os demais cartões', ...);
test('carregar mais some sem pageToken ou aos 60 resultados', ...);
test('mostra logo do Google e link do Maps', ...);
test('avisa contato anterior pelo place_id', ...);
test('limite_diario mostra aviso e mantém o formulário', ...);
test('não há busca automática ao digitar', ...);
```

- [ ] **Step 2: Confirmar a falha**

Run: `npx vitest run tests/ui/indicadores.test.ts tests/ui/NovoPedido.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** `useVerificacao` chama `/verificar` por fornecedor, com até 4 chamadas simultâneas, e atualiza cada cartão ao responder. Dados do Google ficam só em memória, nunca em `localStorage`. Marcar um fornecedor grava `pedido_fornecedores`. Baixar o logo oficial segundo as regras de marca do Google em `public/` e registrar a fonte em um comentário.

- [ ] **Step 4: Confirmar que passa** com o mesmo comando. Expected: PASS.

- [ ] **Step 5: Commit** `feat: adiciona busca e lista de fornecedores`.

### Task 11: Mensagem, modelos e envio

**Files:**
- Create: `src/pages/Envio.tsx`, `src/components/EditorMensagem.tsx`, `src/components/ListaEnvio.tsx`, `src/lib/modelos.ts`
- Test: `tests/ui/Envio.test.tsx`

**Interfaces:**
- Consumes: `preencherModelo`, `camposFaltando`, `linkWhatsApp`, `/enviar-email`, `/detalhes`, `whatsappDoFornecedor`.
- Produces: rota `/pedidos/:id/envio`. Tabela `modelos` com criar, editar e excluir.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
test('prévia mostra o texto preenchido do fornecedor', ...);
test('botão bloqueado com campo faltando, nomeando o campo', ...);
test('confirmação informa a quantidade: "Enviar 6 e-mails?"', ...);
test('falha em um não interrompe os demais e permite tentar de novo', ...);
test('reautorizar interrompe o lote, mantém os enviados, o texto e a seleção', ...);
test('clique duplo usa a mesma chave de idempotência', ...);
test('avisa antes de reenviar a quem já recebeu naquele pedido', ...);
test('WhatsApp abre wa.me com o texto em nova aba e registra whatsapp_aberto', ...);
test('botão "Enviei" muda a situação para enviado', ...);
test('WhatsApp sem número na memória consulta /detalhes tipo telefone uma vez', ...);
test('limite_diario desativa o botão de WhatsApp que depende de consulta e informa o horário', ...);
test('nao_contatar desativa os dois canais e mostra o motivo', ...);
```

- [ ] **Step 2: Confirmar a falha**

Run: `npx vitest run tests/ui/Envio.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** E-mails são enviados um por vez, cada um em sua chamada. O texto em edição fica em `sessionStorage` com o modelo sem preencher, para sobreviver à reautorização.

- [ ] **Step 4: Confirmar que passa** com o mesmo comando. Expected: PASS.

- [ ] **Step 5: Commit** `feat: adiciona mensagem e envio por e-mail e WhatsApp`.

### Task 12: Pedidos salvos e acompanhamento

**Files:**
- Create: `src/pages/Pedidos.tsx`, `src/pages/Pedido.tsx`
- Test: `tests/ui/Pedido.test.tsx`

**Interfaces:**
- Consumes: tabelas da Task 5, `/detalhes`, componentes da Task 11.
- Produces: rotas `/pedidos` e `/pedidos/:id`.

- [ ] **Step 1: Escrever os testes que falham**

```tsx
test('reabrir pedido não chama nenhuma função do Google', () => expect(chamarFuncao).not.toHaveBeenCalled());
test('mostra nome do site, domínio, contatos e situação', ...);
test('fornecedor sem site mostra "ver dados", que consulta uma vez ao clicar', ...);
test('nao_encontrado informa que os dados não estão mais disponíveis e mantém o registro', ...);
test('todo o time vê os pedidos de todos', ...);
test('marcar "não contatar" exige motivo', ...);
test('marcar e-mail inválido atualiza o indicador', ...);
```

- [ ] **Step 2: Confirmar a falha**

Run: `npx vitest run tests/ui/Pedido.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**, lendo só do banco ao abrir a página.

- [ ] **Step 4: Confirmar que passa** com o mesmo comando. Expected: PASS.

- [ ] **Step 5: Rodar tudo**

Run: `npx vitest run`, `npx supabase test db` e `npx tsc --noEmit`
Expected: tudo sem falhas.

- [ ] **Step 6: Commit** `feat: adiciona pedidos salvos e acompanhamento`.

### Task 13: Publicação e validação real

Publicar e enviar dados são ações externas. Peça confirmação antes de cada uma.

**Files:**
- Create: `docs/operacao/publicacao.md`, `docs/operacao/supabase-pausado.md`, `docs/operacao/validacao.md`

**Interfaces:**
- Consumes: tudo acima e as credenciais da Task 1.

- [ ] **Step 1: Criar o repositório privado** no GitHub e enviar o código, com confirmação do usuário.

- [ ] **Step 2: Publicar o banco e as funções**

Run: `npx supabase db push` e `npx supabase functions deploy`
Expected: sem erros. Definir `GOOGLE_PLACES_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `CREDENCIAL_KEY` e `APP_ORIGIN` com `supabase secrets set`.

- [ ] **Step 3: Publicar a tela** no Cloudflare Pages e ativar o login Google no Supabase, com a URL de retorno correta.

- [ ] **Step 4: Reconferir os limites de 32 por dia** no painel do Google. Expected: os mesmos valores da Task 1.

- [ ] **Step 5: Fazer o teste real controlado**, com poucas buscas e envios só para endereços `@agenciasurto.com`. Abrir o link do WhatsApp em celular e computador, sem enviar a fornecedores. Conferir: chegada do e-mail com acentos, pasta de enviados, recusa de conta de fora do domínio e consulta ao banco sem dados do Google.

- [ ] **Step 6: Fazer a validação com o time**, com cerca de 20 buscas reais. Registrar em `validacao.md` a taxa de fornecedores com canal utilizável e o tempo para pedir orçamento a 10 fornecedores.

- [ ] **Step 7: Conferir o faturamento do Google.** Expected: nenhuma cobrança.

- [ ] **Step 8: Documentar a operação**, incluindo como reativar o projeto do Supabase pausado, e fazer o commit `docs: adiciona guias de operação e resultado da validação`.
