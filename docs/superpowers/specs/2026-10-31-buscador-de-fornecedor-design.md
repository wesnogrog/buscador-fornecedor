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

A primeira versão usa a API oficial do Google Places, Supabase e envio feito pelo próprio orçamentista.

| Tema | Decisão | Motivo |
| --- | --- | --- |
| Custo | Nenhuma cobrança | Exigência da agência |
| Busca | API oficial do Google Places, com cartão cadastrado e limites ativados | Mais estável que o scraper `tools-google-maps`, sem depender de proxies |
| Contato válido | Tem e-mail ou WhatsApp, e o canal passa por verificação automática | Critério definido pelo time |
| Portfólio | Não entra | Dispensado pela agência |
| E-mail | Enviado pela conta Google Workspace de quem usa o app | Sem custo extra, e as respostas chegam na caixa da pessoa |
| WhatsApp | O app abre a conversa com o texto pronto e a pessoa clica em enviar | Mantém o custo zero e protege o número da agência |
| Pedidos | Compartilhados com todo o time | Evita contato duplicado sem que o time saiba |

**Fora da primeira versão:** portfólio, mapa, envio automático pelo WhatsApp, leitura de respostas, comparação de preços e exportação de dados.

## Arquitetura

O app é um site estático apoiado no Supabase, e o Google Drive fica de fora porque não executa essas etapas. Tudo passa pelo Supabase, exceto a abertura do WhatsApp.

- **Tela do app:** site em React, em hospedagem gratuita, com busca, seleção, texto do pedido e acompanhamento. Chama o Supabase e abre o link do WhatsApp diretamente.
- **Supabase, no plano gratuito:**
    - **Login:** só contas do domínio da agência.
    - **Banco de dados:** pedidos, contatos do site e envios.
    - **Busca:** protege a chave, conta a cota e consulta o Google Places.
    - **Verificação:** lê até três páginas do site, extrai e-mail e WhatsApp e confere o MX.
    - **Envio de e-mail:** usa a credencial criptografada, envia pela Gmail API e registra o envio.
- **WhatsApp:** link `wa.me`, sem servidor. A pessoa clica em enviar.

A lista aparece assim que a busca responde, e cada contato do site é preenchido em seguida, por uma chamada separada. Assim, um site lento não trava a busca nem esgota o tempo de execução da função. A hospedagem da tela será o Cloudflare Pages, com o código em um repositório privado no GitHub.

## Fluxo de uso

O orçamentista vai da busca ao envio em cinco passos, na mesma tela de pedido.

1. **Novo pedido:** informa nome do orçamento, serviço e região. Exemplo: "Evento X", "locação de som", "Campinas".
2. **Resultados:** vê até 20 fornecedores, com "carregar mais" até o máximo de 60. Cada um mostra nome, endereço, nota, link para o Google Maps, canais e aviso de contato anterior.
3. **Mensagem:** marca fornecedores, escolhe um modelo e confere a prévia. Os campos são `{fornecedor}`, `{servico}`, `{evento}`, `{data}`, `{local}` e `{prazo}`.
4. **Envio:** confirma os e-mails, enviados individualmente. No WhatsApp, cada fornecedor tem um botão que abre a conversa com o texto pronto.
5. **Acompanhamento:** vê a situação de cada fornecedor. Depois de abrir o WhatsApp, marca "enviei", porque o app não sabe se a mensagem saiu. As respostas chegam no Gmail e no WhatsApp.

A lista ordena primeiro quem tem e-mail e WhatsApp, depois quem tem um dos dois. Quem não tem nenhum fica em uma seção separada no fim. A lista exibe o logo do Google, como a [política da API](https://developers.google.com/maps/documentation/places/web-service/policies) exige para dados mostrados sem mapa.

### Indicadores de contato

| Indicador | Regra | O que não garante |
| --- | --- | --- |
| E-mail verificado | Veio do site do fornecedor, tem formato válido e o domínio tem registro MX | Que a caixa exista ou seja lida |
| WhatsApp no site | O site tem link `wa.me` ou `api.whatsapp.com` | Que o número continue ativo |
| WhatsApp provável | O telefone do Google é celular brasileiro, com DDD e nono dígito | Que o número tenha WhatsApp |
| Só telefone fixo | O número parece fixo e não há link de WhatsApp. Não há botão de WhatsApp, só o número para ligar | Que o fornecedor atenda |
| Site fora do ar | O site não respondeu, então nada pôde ser verificado | Que o fornecedor tenha encerrado as atividades |

O app descarta endereços como `noreply@` e textos com formato de e-mail em códigos ou nomes de imagens. Em cada site, ele lê no máximo três páginas: a inicial e até duas de contato.

### Status da cota

Todas as telas mostram para todo o time quantas buscas ainda restam, por exemplo: "Buscas restantes hoje: 18 de 32". O número cai a cada busca ou "carregar mais", de qualquer pessoa, e renova entre 4h e 5h de Brasília, que é a [meia-noite do Pacífico usada pelo Google](https://docs.cloud.google.com/docs/quotas/overview). Se restar menos no mês do que no dia, o status mostra o número do mês. Não há limite por pessoa.

## Dados

O banco guarda o identificador do Google e os dados próprios da agência, mas nunca nome, endereço, telefone, nota ou site vindos do Google. Os [termos da plataforma](https://cloud.google.com/maps-platform/terms) proíbem copiar e salvar nomes e endereços, e os [termos específicos](https://cloud.google.com/maps-platform/terms/maps-service-terms) permitem guardar o `place_id`.

| Tabela | Conteúdo |
| --- | --- |
| `pedidos` | Nome do orçamento, serviço, região, data, local, prazo e autor |
| `pedido_fornecedores` | `place_id` e situação do fornecedor em cada pedido |
| `fornecedor_contatos` | `place_id`, nome, e-mail e WhatsApp encontrados no site, data da verificação e marca "não contatar" |
| `modelos` | Textos reutilizáveis, com os campos ainda sem preencher |
| `envios` | Canal, autor, data, situação e modelo usado, com `{fornecedor}` sem preencher |
| `cota_uso` | Consultas usadas por dia do Google e por faixa de preço da API |
| `credenciais_gmail` | Credencial criptografada de cada pessoa |

**Consultado de novo:** ao reabrir um pedido, o app não faz nenhuma consulta. Ele mostra o nome publicado no site do fornecedor, o domínio, os contatos e a situação. Fornecedores sem site aparecem com o botão "ver dados", que faz uma consulta na faixa Pro. O telefone vem na faixa Enterprise, só quando a pessoa clica no botão de WhatsApp e o número não veio do site. Logo depois de uma busca, os dados já estão na memória da tela e não geram nova consulta.

**E-mails enviados:** a mensagem final, com o nome do fornecedor, fica só na pasta de enviados do Gmail de quem enviou, como qualquer e-mail escrito pela pessoa.

## Cota e custos

O limite gratuito suporta 500 buscas por mês com 20 resultados cada e cerca de 200 usos de "carregar mais", considerando 22 dias úteis com até 32 consultas por dia. Limites diários no próprio Google impedem ultrapassar a cota gratuita, mesmo se o app falhar.

| Consulta do Google | Uso no app | Grátis por mês | Preço acima da cota (por 1.000) | Bloqueio no app |
| --- | --- | --- | --- | --- |
| Text Search Enterprise | Busca e "carregar mais" | 1.000 | US$ 35 | 950 |
| Place Details Pro | Botão "ver dados" de fornecedor sem site | 5.000 | US$ 17 | 950, somado à faixa Enterprise |
| Place Details Enterprise | Telefone ao clicar no WhatsApp | 1.000 | US$ 20 | 950 |

Fonte: [tabela de preços](https://developers.google.com/maps/billing-and-pricing/pricing) e [campos do Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search). A documentação não diz se cada página é cobrada separadamente, então o app conta cada página como uma consulta.

**Limites no Google:**

- **Text Search:** 32 consultas por dia. No máximo, são 992 em um mês de 31 dias, então não há como passar da cota gratuita. Em dias de pico, as buscas param até o dia seguinte.
- **Place Details:** 32 requisições diárias, somando as faixas Pro e Enterprise. O total máximo também é de 992 por mês, abaixo das duas cotas gratuitas. O limite vale para todo o time.
- **Orçamento:** um alerta no Google avisa o responsável à primeira despesa, mas não interrompe o consumo. Ele existe porque a garantia vale para os limites configurados e as cotas atuais: se o Google reduzir a cota gratuita, os limites precisam ser revistos. A [documentação de custos](https://developers.google.com/maps/billing-and-pricing/manage-costs) confirma que, ao atingir o limite, as requisições falham.

**Outros limites:** cada pessoa envia até 100 e-mails por dia pelo app. O plano gratuito do Supabase pausa projetos após cerca de uma semana sem uso, segundo [fonte de terceiros](https://automationatlas.io/answers/supabase-free-tier-limits-2026/), o que não deve ocorrer com o volume previsto.

## Tratamento de erros

Uma falha em um fornecedor nunca interrompe os demais, e nenhum erro apaga o texto ou a seleção.

| Situação | O que o app faz |
| --- | --- |
| Cota de busca perto do fim | Avisa a partir de 80% e bloqueia ao atingir o limite. Pedidos salvos e contatos do site continuam disponíveis |
| Limite diário do Google atingido | Zera o status e informa que novas consultas voltam entre 4h e 5h de Brasília. O botão de WhatsApp fica indisponível quando depende de uma consulta |
| Site lento ou fora do ar | Desiste depois de 8 segundos por página e mostra o que tiver |
| Falha ao enviar um e-mail | Marca o envio como "falhou", mostra o motivo e permite tentar de novo |
| E-mail devolvido | A devolução chega no Gmail da pessoa, que marca o contato como inválido no app |
| Autorização do Gmail expirada | Pede nova autorização e mantém o texto e a seleção |
| Envio repetido | Avisa se o fornecedor já recebeu mensagem naquele pedido. Um clique duplo não gera dois e-mails |
| Fornecedor marcado como "não contatar" | Bloqueia e-mail e WhatsApp, mostrando o motivo |
| Fornecedor removido do Google | Mantém o registro do pedido e indica que os dados não estão mais disponíveis |
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

A entrega depende de testes automáticos sem custo e de uma validação real com o time.

- **Automáticos:** extração de e-mails e WhatsApp, classificação de telefones, preenchimento de modelos, contador de cota, virada do dia no horário do Pacífico, reabertura de pedido sem nenhuma consulta ao Google, bloqueio de envio repetido e bloqueio de "não contatar".
- **Integração:** Google e Gmail simulados, para não gastar cota nem enviar e-mails reais.
- **Banco:** as regras de acesso recusam quem não está logado ou é de outro domínio. Uma verificação confirma que nenhuma tabela tem nome, endereço ou telefone do Google.
- **Teste real controlado:** limites diários conferidos no painel do Google e poucas buscas, com envios apenas para endereços da própria agência e uma abertura real do link do WhatsApp em celular e computador.
- **Validação com o time:** cerca de 20 buscas reais medem quantos fornecedores trazem canal utilizável e quanto tempo leva pedir orçamento a 10 deles, que é o critério de sucesso.

## Pré-requisitos e pendências

A implementação depende de quatro itens da agência, e o último pode interromper o projeto.

- [ ] Projeto no Google Cloud pertencente à organização Workspace, com faturamento e cartão cadastrados
- [ ] Administrador do Workspace disponível para configurar o app interno
- [ ] Projeto no Supabase, criado na conta existente
- [ ] Confirmação no painel do Google de que Text Search e Place Details aceitam o limite de 32 por dia. O nome desse limite só foi visto em guias de terceiros. Sem ele, a garantia de nenhuma cobrança não existe e a implementação para antes de qualquer código

**Riscos que continuam abertos:**

- O app usa o site informado pelo Google para visitar a página do fornecedor e guarda só o que encontra lá. Os termos não tratam desse caso de forma explícita, então a revisão jurídica deve incluí-lo.
- A taxa real de fornecedores com e-mail ou WhatsApp só será conhecida na validação com o time.
- O formato do link `wa.me` não pôde ser conferido na página de ajuda do WhatsApp, por isso entra no teste real controlado.

Os limites do Supabase vêm de fontes de terceiros e devem ser conferidos em [supabase.com/pricing](https://supabase.com/pricing) ao criar o projeto.
