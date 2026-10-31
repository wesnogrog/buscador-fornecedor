# Buscador de Fornecedor: especificação de design

31/10/2026 · Wesley Rodrigues

Cópia local do documento: https://claude.ai/artifact/QLZWGQLtEpCpqHmBXg5THr

## Objetivo

O Buscador de Fornecedor permite que o time de orçamento da Agência Surtô encontre fornecedores por serviço e região, escolha quem contatar e envie pedidos de orçamento em poucos cliques, sem custo mensal.

A primeira versão terá sucesso se:

- uma busca trouxer fornecedores com contato em segundos;
- cada contato mostrar o que foi verificado e o que é apenas provável;
- pedir orçamento a 10 fornecedores levar poucos minutos;
- o time souber quem já foi contatado em cada pedido;
- a agência não receber nenhuma cobrança.

Cerca de 100 a 500 buscas por mês são esperadas no mês movimentado, por um time pequeno que já usa Google Workspace com o domínio @agenciasurto.com.

## Decisões

A primeira versão usa um scraper local para extrair fornecedores, Supabase para armazenar dados, e envio feito pelo próprio orçamentista.

| Tema | Decisão | Motivo |
| --- | --- | --- |
| Custo | Nenhuma cobrança | Exigência da agência; sem orçamento para validação do Google Cloud (R$120+) |
| Busca | Scraper local (Python/Node) rodando no PC do usuário | Zero custo garantido; execução on-demand; dados salvos em Supabase |
| Contato válido | Tem e-mail ou WhatsApp, extraído do site do fornecedor durante scraping | Validação automática via MX para e-mail; link wa.me para WhatsApp |
| Portfólio | Não entra | Dispensado pela agência |
| E-mail | Enviado pela conta Google Workspace de quem usa o app | Sem custo extra, e as respostas chegam na caixa da pessoa |
| WhatsApp | O app abre a conversa com o texto pronto e a pessoa clica em enviar | Mantém o custo zero e protege o número da agência |
| Pedidos | Compartilhados com todo o time | Evita contato duplicado sem que o time saiba |

**Fora da primeira versão:** portfólio, mapa, envio automático pelo WhatsApp, leitura de respostas, comparação de preços e exportação de dados.

## Arquitetura

O app é um site estático apoiado no Supabase que consome dados já extraídos. Um script local roda on-demand no PC do usuário para extrair fornecedores de Google Maps e salvar no Supabase. Tudo passa pelo Supabase, exceto a abertura do WhatsApp.

- **Script local (Python/Node):** roda no PC do usuário quando precisa buscar fornecedores
    - **Scraping:** extrai fornecedores de Google Maps por serviço e região
    - **Extração:** busca e-mail e WhatsApp no site do fornecedor
    - **Validação:** confere MX do e-mail
    - **Armazenamento:** salva fornecedores no Supabase
- **Tela do app:** site em React, em hospedagem gratuita (Cloudflare Pages), mostra fornecedores salvos, permite seleção, composição de mensagem e acompanhamento. Chama o Supabase e abre o link do WhatsApp diretamente.
- **Supabase, no plano gratuito:**
    - **Login:** só contas do domínio da agência.
    - **Banco de dados:** fornecedores (extraídos pelo script), pedidos, e envios.
    - **Envio de e-mail:** usa a credencial criptografada, envia pela Gmail API e registra o envio.
- **WhatsApp:** link `wa.me`, sem servidor. A pessoa clica em enviar.

O script local é executado conforme necessário. O app web não realiza extrações, apenas consome e filtra dados já salvos.

## Fluxo de uso

O orçamentista vai do filtro ao envio em cinco passos, na mesma tela de pedido. Os fornecedores já foram extraídos pelo script local.

1. **Novo pedido:** informa nome do orçamento, serviço e região. Exemplo: "Evento X", "locação de som", "Campinas".
2. **Resultados:** vê fornecedores já salvos no banco que combinam com serviço e região. Cada um mostra nome, domínio, endereço extraído, nota (se disponível), link para o site, canais encontrados (e-mail, WhatsApp) e aviso de contato anterior.
3. **Mensagem:** marca fornecedores, escolhe um modelo e confere a prévia. Os campos são `{fornecedor}`, `{servico}`, `{evento}`, `{data}`, `{local}` e `{prazo}`.
4. **Envio:** confirma os e-mails, enviados individualmente. No WhatsApp, cada fornecedor tem um botão que abre a conversa com o texto pronto.
5. **Acompanhamento:** vê a situação de cada fornecedor. Depois de abrir o WhatsApp, marca "enviei", porque o app não sabe se a mensagem saiu. As respostas chegam no Gmail e no WhatsApp.

A lista ordena primeiro quem tem e-mail e WhatsApp, depois quem tem um dos dois. Quem não tem nenhum fica em uma seção separada no fim.

### Indicadores de contato

| Indicador | Regra | O que não garante |
| --- | --- | --- |
| E-mail verificado | Veio do site do fornecedor, tem formato válido e o domínio tem registro MX | Que a caixa exista ou seja lida |
| WhatsApp no site | O site tem link `wa.me` ou `api.whatsapp.com` | Que o número continue ativo |
| WhatsApp provável | O telefone do Google é celular brasileiro, com DDD e nono dígito | Que o número tenha WhatsApp |
| Só telefone fixo | O número parece fixo e não há link de WhatsApp. Não há botão de WhatsApp, só o número para ligar | Que o fornecedor atenda |
| Site fora do ar | O site não respondeu, então nada pôde ser verificado | Que o fornecedor tenha encerrado as atividades |

O app descarta endereços como `noreply@` e textos com formato de e-mail em códigos ou nomes de imagens. Em cada site, ele lê no máximo três páginas: a inicial e até duas de contato.


## Dados

O banco guarda dados extraídos pelo script local (nomes, domínios, contatos do site) e dados próprios da agência (pedidos, envios, modelos). 

| Tabela | Conteúdo |
| --- | --- |
| `fornecedores` | Nome, domínio, endereço, serviço(s), região, e-mail e WhatsApp extraídos, data da extração |
| `pedidos` | Nome do orçamento, serviço, região, data, local, prazo e autor |
| `pedido_fornecedores` | Fornecedor selecionado e situação em cada pedido |
| `modelos` | Textos reutilizáveis, com os campos ainda sem preencher |
| `envios` | Canal, autor, data, situação e modelo usado, com `{fornecedor}` sem preencher |
| `credenciais_gmail` | Credencial criptografada de cada pessoa |

**Extração:** o script local visita Google Maps, busca fornecedores e tenta extrair contatos do site deles. Guarda só o que encontrou: nome, domínio, e-mail validado via MX, WhatsApp (link ou número). Não armazena fotos, avaliações ou dados do Google.

**Consulta no app:** ao criar um pedido, o app filtra fornecedores já salvos por serviço e região. Nenhuma consulta nova ao Google. Ao reabrir um pedido, mostra o que foi extraído e a situação do envio.

**E-mails enviados:** a mensagem final, com o nome do fornecedor, fica só na pasta de enviados do Gmail de quem enviou, como qualquer e-mail escrito pela pessoa.

## Cota e custos

O scraper roda on-demand no PC do usuário, com zero custo de hospedagem ou API. Não há limite de cotas a monitorar, mas existe risco de bloqueio de IP pelo Google se o scraper for muito agressivo (requisições rápidas demais).

**Proteção contra bloqueio:**
- O script inclui delays entre requisições (2-5 segundos por fornecedor)
- Não usa proxies (mantém simplicidade)
- Roda manualmente, não em loop contínuo
- Se o Google bloquear o IP, o usuário aguarda algumas horas e retenta

**Limites do app web:**
- Cada pessoa envia até 100 e-mails por dia pelo app (limite Gmail)
- O plano gratuito do Supabase pausa projetos após cerca de uma semana sem uso, segundo [fonte de terceiros](https://automationatlas.io/answers/supabase-free-tier-limits-2026/), o que não deve ocorrer com o volume previsto (100-500 buscas/mês, que gera 100-500 de dados salvos no Supabase)

## Tratamento de erros

No script local, uma falha em um fornecedor nunca interrompe os demais. No app, nenhum erro apaga o texto ou a seleção.

| Situação | O que o script/app faz |
| --- | --- |
| IP bloqueado pelo Google | O script avisa que não conseguiu raspar e recomenda aguardar algumas horas. Dados antigos continuam disponíveis no app |
| Site lento ou fora do ar | Script desiste depois de 10 segundos por site e salva o que conseguiu extrair (nome, endereço). Contatos ficam vazios |
| E-mail não encontrado ou inválido | Script descarta e salva vazio no banco. O app mostra só WhatsApp ou telefone, se houver |
| Falha ao enviar um e-mail | App marca o envio como "falhou", mostra o motivo e permite tentar de novo |
| E-mail devolvido | A devolução chega no Gmail da pessoa, que marca o contato como inválido no app |
| Autorização do Gmail expirada | App pede nova autorização e mantém o texto e a seleção |
| Envio repetido | App avisa se o fornecedor já recebeu mensagem naquele pedido. Um clique duplo não gera dois e-mails |
| Fornecedor marcado como "não contatar" | App bloqueia e-mail e WhatsApp, mostrando o motivo |
| Contato com dados incompletos | App mostra apenas os canais encontrados (só e-mail, ou só WhatsApp, ou só telefone) |
| Projeto do Supabase pausado | O responsável reativa no painel, com o passo a passo documentado |

## Segurança e privacidade

Só contas do domínio da agência acessam o app, e todas as chaves ficam no servidor.

- **Acesso:** o servidor confere o domínio @agenciasurto.com em cada função, e as regras do banco (RLS) só respondem a usuários logados desse domínio.
- **Chave do Google:** fica nos segredos das Edge Functions e nunca chega ao navegador.
- **Gmail:** o app pede só o escopo `gmail.send`, que [o Google classifica como sensível](https://developers.google.com/workspace/gmail/api/auth/scopes) e que permite enviar, mas não ler e-mails. O app é configurado como [interno da organização](https://support.google.com/cloud/answer/13464323), o que dispensa a verificação do Google. Um administrador pode precisar aprová-lo.
- **Credenciais:** a credencial do Gmail fica criptografada, e só a função de envio consegue usá-la.
- **Sites visitados:** o conteúdo é tratado como texto não confiável. O app nunca o executa, só extrai e-mails e links de WhatsApp, aceita apenas endereços públicos HTTP ou HTTPS e limita o tamanho de cada página.
- **Mensagens:** cada e-mail vai para um único fornecedor e sai da conta de uma pessoa identificada, com a agência informada na assinatura.
- **LGPD:** a marca "não contatar" atende pedidos de remoção. O app coleta contatos publicados pelos próprios fornecedores, mas alguns podem ser de pessoas físicas. Recomendo uma revisão jurídica rápida antes do uso amplo.
- **WhatsApp:** a [política da plataforma](https://whatsappbusiness.com/pt-br/policy/) exige consentimento prévio para mensagens por ela, o que confirma a escolha de não usar a API oficial neste caso. No envio assistido, cada mensagem é aberta e enviada por uma pessoa.

## Testes e validação

A entrega depende de testes automáticos do script e app, e de uma validação real com o time.

- **Automáticos (script):** extração de e-mails e WhatsApp, classificação de telefones, validação de MX, parsing de HTML, tratamento de sites lentos/fora do ar.
- **Automáticos (app):** preenchimento de modelos, filtro por serviço/região, bloqueio de envio repetido, bloqueio de "não contatar", reabertura de pedido sem nenhuma chamada ao banco.
- **Integração:** Gmail simulado no app, para não enviar e-mails reais durante testes.
- **Banco:** as regras de acesso recusam quem não está logado ou é de outro domínio. Uma verificação confirma que nenhuma tabela tem foto, avaliação ou dados brutos do Google (só o extraído do site).
- **Teste real controlado:** roda o script em 2-3 buscas (5-10 fornecedores por busca), valida que extrai contatos corretamente, testa envio de e-mail para endereço da própria agência e abre link do WhatsApp em celular e computador.
- **Validação com o time:** circa 20 buscas reais (5-10 fornecedores cada) medem quantos trazem canal utilizável, quanto tempo leva pedir orçamento a 10 deles (critério de sucesso), e se o script é agressivo demais com Google Maps.

## Pré-requisitos e pendências

A implementação depende de três itens:

- [ ] Projeto no Supabase, criado na conta existente (`wesnogrog`)
- [ ] Administrador do Workspace disponível para configurar o app interno e escopo `gmail.send`
- [ ] Node.js ou Python instalado no PC do usuário (para rodar o script local)

**Escolha do scraper:** dos 4 repositórios candidatos ([tools-google-maps](https://github.com/hannesegi/tools-google-maps), [leadhunter](https://github.com/mrsudo404/leadhunter), [prospect-atlas](https://github.com/shahmeeraayy22/prospect-atlas), [google-maps-leadscraper-kit](https://github.com/humblemillz/google-maps-leadscraper-kit)), um será escolhido na Tarefa 1 com base em:
- Compatibilidade com Python/Node
- Facilidade de personalização para extrair e-mail e WhatsApp
- Documentação e manutenção

**Riscos que continuam abertos:**

- O script visita sites informados no Google Maps para extrair contatos. Esse uso pode não estar coberto explicitamente pelos termos, então a revisão jurídica deve avaliar.
- A taxa real de fornecedores com e-mail ou WhatsApp só será conhecida na validação com o time.
- O Google pode bloquear o IP do usuário se o scraper for agressivo demais. Delays são incluídos, mas isso pode variar por sessão.
- O layout do Google Maps pode mudar, exigindo ajuste no scraper.

Os limites do Supabase vêm de fontes de terceiros e devem ser conferidos em [supabase.com/pricing](https://supabase.com/pricing) ao criar o projeto.
