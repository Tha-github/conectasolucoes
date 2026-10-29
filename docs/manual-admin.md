# Manual do painel de conteúdo — Conecta Soluções

Endereço do painel: **`<endereço do site>/admin/`** (por exemplo, `https://usuario.github.io/nome-do-repo/admin/` ou
`https://www.seudominio.com.br/admin/`).

| Quero…                        | Veja                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| Alterar um texto              | [1. Alterar textos](#1-alterar-textos)                                    |
| Trocar uma foto               | [2. Substituir imagens](#2-substituir-imagens)                            |
| Mudar uma cor                 | [3. Modificar cores](#3-modificar-cores)                                  |
| Entrar no painel              | [Entrar](#entrar-no-painel)                                               |
| Colocar as mudanças no ar     | [5. Publicar](#5-publicar-as-mudanças)                                    |
| Continuar em outro computador | [4. Salvar, exportar e importar](#4-salvar-exportar-importar-e-restaurar) |

## Antes de começar: três regras

1. **Nada vai ao ar até você clicar em Publicar no site.** Até lá, as alterações ficam só neste navegador (com
   prévia). Depois de publicar, o site muda para todos os visitantes em 1 a 3 minutos.
2. **Guarde a senha com cuidado.** Ela destrava a chave que permite alterar o site. Use uma frase longa, não a anote
   em lugar visível e não a envie por mensagem aberta. Se desconfiar que alguém a conhece, avise o responsável
   técnico para trocar a chave e a senha. **Não digite informações confidenciais nos campos:** tudo o que é
   publicado fica público.
3. **O painel altera apenas três coisas:**
   - **textos**;
   - **imagens** (arquivo, enquadramento e descrição);
   - **cores** da paleta.

   Ele não cria, apaga, duplica nem reordena seções, serviços, links, botões ou menus. Também não muda o número do
   WhatsApp, os destinos dos links nem o layout. Essas alterações são feitas pelo responsável técnico.

## Entrar no painel

1. Abra o endereço do painel e digite a **senha**. Clique em **Entrar**.
2. Senha errada mostra "Senha incorreta." e o campo fica limpo para tentar de novo.
3. Ao terminar, clique em **Sair** (ou feche a aba). O acesso não fica guardado no navegador: na próxima vez, a senha
   é pedida de novo.
4. **Trocar senha:** dentro do painel, botão **Trocar senha**. A senha nova vale depois que o site atualizar (1 a 3
   minutos).

Na primeira vez (antes de existir senha), o painel mostra a **configuração inicial**, feita pelo responsável
técnico ([`publicacao.md`](publicacao.md) §0).

## A tela

| Área                             | Para que serve                                                                                                                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Barra superior**               | Status e os botões **Publicar no site**, **Salvar rascunho**, **Exportar JSON**, **Importar JSON**, **Restaurar padrão**, **Trocar senha** e **Sair**.                                                                                  |
| **Menu lateral (Áreas do site)** | Leva aos grupos de campos (Destaque principal, Empresa, Serviços, Tema…). O número ao lado de uma área indica quantos campos dela foram alterados em relação ao site publicado. No celular, o menu vira uma faixa: deslize para o lado. |
| **Campos**                       | Cada texto mostra o limite de caracteres (ex.: `62/80`). Campos alterados ganham um filete à esquerda e o botão **Restaurar padrão**.                                                                                                   |
| **Prévia**                       | Mostra a página com as suas alterações (ao lado dos campos em telas largas, abaixo deles nas menores). Os botões **Celular**, **Tablet** e **Largura total** mudam a largura.                                                           |

| Status                                           | Significado                                                |
| ------------------------------------------------ | ---------------------------------------------------------- |
| Igual ao conteúdo publicado                      | Nada foi alterado.                                         |
| Alterações não salvas neste navegador            | Há mudanças ainda não salvas como rascunho.                |
| **Rascunho salvo neste navegador** (data e hora) | O rascunho está guardado **só neste navegador**.           |
| **Arquivo exportado** (data e hora)              | O conteúdo foi baixado como arquivo.                       |
| **Alterações ainda não publicadas**              | O conteúdo é diferente do site. Continua até a publicação. |

## 1. Alterar textos

1. Use os atalhos para ir à área (por exemplo, **Destaque principal**).
2. Clique no campo e digite. A prévia se atualiza em seguida.
3. Respeite o limite mostrado no canto do campo; ao chegar nele, o campo não aceita mais letras.
4. Clique em **Salvar rascunho** para não perder o trabalho.

Observações:

- Quebras de linha coladas viram espaço.
- Campo vazio fica marcado em vermelho e impede salvar ou exportar.
- **HTML não funciona.** `<b>`, `<script>` e similares aparecem literalmente como texto.
- **Títulos em duas partes.** Os títulos principais têm a parte leve (campo "Título") e a parte em destaque (campo
  "… parte em destaque" ou "… parte em dourado"), exibida com mais peso e, no fundo vinho, em dourado. A parte em
  destaque pode ficar vazia; nesse caso o título aparece inteiro no estilo leve.
- **Selo e características.** O selo circular do destaque (3 linhas) e as 6 características da área Empresa
  (rótulo + valor) são textos fixos em quantidade e posição: dá para reescrever, não para criar ou remover itens.
  Os ícones das características são fixos no código.
- Os nomes dos 21 serviços podem ser ajustados, mas cada um deve continuar descrevendo o mesmo serviço. A
  verificação de publicação recusa, por exemplo, trocar "Rebobinagem de Motores Elétricos" por outro assunto.
- A verificação de publicação também recusa anos de mercado, números de desempenho, certificações, garantias, preços,
  depoimentos, clientes e dados pessoais. Esses dados só podem entrar depois de confirmados e liberados pelo
  responsável técnico.

## 2. Substituir imagens

Cada imagem do site ocupa um **espaço fixo** (12 no total): símbolo da marca; imagem principal e imagem em primeiro
plano do destaque; as 8 imagens do mosaico da Empresa (imagem 1 e "demais imagens" 2 a 8); e a faixa do Contato. O
painel troca a imagem desses espaços, mas não cria imagens novas, não remove peças do mosaico e não muda posições.

1. No campo da imagem, clique em **Substituir imagem** e escolha o arquivo.
   - Aceitos: **JPEG, PNG, WebP e AVIF**, com até 15 MB.
   - Recusados: **SVG, GIF, executáveis e outros tipos**. Logotipo em SVG só entra pelo responsável técnico.
2. O painel confere o arquivo: tamanho, tipo real (um PNG renomeado para `.webp` é recusado), dimensões mínimas e se
   a imagem abre de verdade. Se recusar, ele explica o motivo e **nada é alterado**.
3. Imagens maiores que o necessário são **reduzidas sem distorcer** e convertidas para **WebP**. Isso também remove
   dados da câmera e de localização (GPS). O diálogo mostra o antes e o depois.
4. No diálogo **Substituir imagem**:
   - confira a foto **nas molduras em que ela aparece**. A imagem principal do destaque é um recorte vertical
     estreito (cerca de 1:2, com a aresta esquerda inclinada); a de primeiro plano é 4:5; as do mosaico, 3:4; a faixa
     do Contato, 12:5 no computador e 3:2 no celular;
   - escolha o **enquadramento** (Centro, Topo, Base, Esquerda ou Direita), que define a parte da foto que continua
     visível quando a moldura corta;
   - escreva o **texto alternativo**, descrevendo a foto para quem usa leitor de tela. Exemplo: "Técnico
     inspecionando painel elétrico com câmera termográfica". Ele é obrigatório nas fotografias. No **símbolo da
     marca** ele fica vazio de propósito, porque o nome da empresa já aparece em texto ao lado;
   - clique em **Aplicar ao rascunho**. **Cancelar** (ou Escape) descarta tudo.
5. A imagem aparece na prévia e fica guardada **neste navegador**, com um nome como
   `hero-image-20261029-111136.webp`. O enquadramento pode ser trocado depois, sem reenviar a foto.
6. **A imagem não vai dentro do arquivo JSON.** Na publicação, baixe também o arquivo de imagem pelo link **Baixar …**
   e envie com **o mesmo nome**.

Use apenas fotos próprias ou com licença comercial, e evite imagens que sugiram clientes ou obras que não sejam da
Conecta Soluções.

## 3. Modificar cores

1. Vá ao grupo **Tema**. São 14 cores com nomes fixos, como "Fundo da página", "Texto principal" e "Cor de ação
   (botões, foco)". Não é possível criar cores novas nem aplicar cor a outros elementos.
2. Escolha a cor no **quadrado colorido** (seletor visual) ou digite o código no campo ao lado. O campo aceita
   `#173B4C`, `173b4c` ou o atalho `#abc` (que vira `#AABBCC`).
3. A prévia muda **na hora**.
4. Um código inválido (`#12`, `red`, `rgb(…)`) mostra erro e **não é aplicado**: a cor anterior continua valendo.
   **Escape** ou sair do campo descarta o que foi digitado.
5. **Contraste:** se uma combinação ficar difícil de ler (texto claro sobre fundo claro, por exemplo), aparece um
   aviso **nas duas cores envolvidas**. Enquanto o aviso estiver ativo, a prévia mantém a paleta publicada e o
   rascunho não pode ser salvo nem exportado.
6. Para desfazer, use **Restaurar padrão** no próprio campo.

## 4. Salvar, exportar, importar e restaurar

| Botão                | O que faz                                                                                                           | Atenção                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Salvar rascunho**  | Guarda o trabalho neste navegador.                                                                                  | Outro navegador, outro computador ou janela anônima **não** veem o rascunho. Limpar os dados do navegador o apaga.                                          |
| **Exportar JSON**    | Baixa `conecta-conteudo-AAAA-MM-DD.json` e oferece **Baixar como content.json (para o GitHub)** e as imagens novas. | É o que se envia para publicar.                                                                                                                             |
| **Importar JSON**    | Carrega um arquivo exportado antes.                                                                                 | Arquivo com campo desconhecido, serviço ou seção a mais ou a menos, texto acima do limite ou cor inválida é **recusado inteiro**, com a lista de problemas. |
| **Restaurar padrão** | Volta todos os campos ao conteúdo publicado.                                                                        | Se houver alterações, pede confirmação e oferece **Exportar antes**.                                                                                        |

- Ao fechar a aba com alterações não salvas, o navegador pergunta se você quer sair.
- Para continuar em outro computador: **Exportar JSON** aqui → **Importar JSON** lá. As imagens novas precisam ser
  escolhidas de novo, porque não vão no JSON.

## 5. Publicar as mudanças

1. Confira a **prévia** (Celular, Tablet e Largura total).
2. Clique em **Publicar no site** e confirme em **Publicar agora**.
3. Aparece "Enviado. O GitHub está validando e atualizando o site". Em 1 a 3 minutos, o aviso muda para **"Pronto:
   as alterações já aparecem no site para todos os visitantes."** Pode continuar editando enquanto isso.
4. Se aparecer que **"as alterações ainda não apareceram"** depois de alguns minutos, a validação automática pode ter
   recusado algo (o site continua como estava). Avise o responsável técnico.
5. Se aparecer que **"o conteúdo no GitHub mudou depois que este painel foi aberto"**, outra publicação aconteceu
   (por exemplo, em outro computador). Nada foi publicado: exporte ou salve o rascunho, aguarde alguns minutos,
   recarregue a página e refaça.

As imagens novas vão junto na mesma publicação; não é preciso baixá-las nem enviá-las à parte.

### Alternativa: publicar por Pull Request (sem o painel)

Continua disponível para o responsável técnico, com a conta do GitHub. Passo a passo completo em
[`publicacao.md`](publicacao.md) §4. Resumo:

1. **No painel:** confira a prévia → **Exportar JSON** → **Baixar como content.json (para o GitHub)**. Se trocou
   imagens, baixe também cada arquivo indicado, **sem renomear**.
2. **No GitHub:** na pasta `content/` do repositório, use _Add file → Upload files_, arraste o `content.json` e
   escolha **"Create a new branch for this commit and start a pull request"**, com um nome começando por
   `conteudo/` (por exemplo, `conteudo/2026-10-29-textos`).
3. **Imagens novas:** na **mesma branch**, envie-as para `src/assets/img/`.
4. **No Pull Request:** aguarde o check **validar**.
   - **Vermelho:** abra _Details_. O resumo diz o que foi recusado (por exemplo, `area.title: máximo de 40
caracteres`). Corrija no painel, exporte de novo e envie para a mesma branch.
   - **Verde:** confira a lista **Campos alterados** e clique em **Squash and merge**.
5. O site é publicado automaticamente em alguns minutos. Se a aprovação estiver configurada, o responsável técnico
   aprova o deploy no GitHub.

**Não tem acesso ao GitHub?** Envie o `content.json` e as imagens ao responsável técnico, que segue o mesmo
processo.

**Depois de publicado**, o conteúdo fica gravado no repositório. Qualquer pessoa, em qualquer navegador, vê o site
atualizado, e o painel passa a usar esse conteúdo como padrão. Pode levar alguns minutos, por causa do cache do
GitHub Pages.

## 6. Problemas comuns

| Situação                                               | O que fazer                                                                            |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| "Não foi possível salvar" (janela anônima ou bloqueio) | Ainda dá para editar e exportar. Use uma janela normal para salvar rascunhos.          |
| Rascunho de versão antiga ou corrompido                | O painel volta os campos problemáticos ao valor publicado e lista o que foi trocado.   |
| Na prévia em largura de celular, o menu aparece aberto | É esperado: a prévia não executa scripts. No site publicado ele vira o botão **Menu**. |
| Imagem importada aparece só como texto                 | O arquivo não está no site nem neste navegador. Escolha a imagem de novo.              |
| Check **validar** vermelho                             | Leia o motivo em _Details_, corrija no painel e reenvie.                               |

O painel exige navegador atual (Chrome, Edge, Firefox ou Safari recentes) com JavaScript ativado.

## 7. Segurança (resumo técnico)

- Não há senha nem token **legíveis** no código. A chave do GitHub existe só cifrada em `admin/acesso.json`
  (AES-256-GCM, PBKDF2-SHA256 com 600 mil iterações) e só é decifrada na memória da aba, com a senha. Exceção
  autorizada e riscos em `CLAUDE.md` §7 e [`publicacao.md`](publicacao.md) §0.
- Requisições: o próprio site (`content/content.json`, `admin/preview-templates.json`, `admin/images.json`,
  `admin/acesso.json`) e, depois do login, `https://api.github.com` (única origem externa liberada na CSP, em
  `connect-src`). O painel só grava `content/content.json`, `content/acesso.json` e imagens em `src/assets/img/`.
- A CSP permite `'self'`, `blob:` para as imagens e o tema da prévia (gerados localmente) e `api.github.com`.
- A prévia roda num `iframe` com `sandbox` sem scripts, e todo texto é escapado.
- JSON importado, rascunho salvo e arquivos de imagem são tratados como entrada não confiável. A validação estrita
  cobre:
  - o schema;
  - os tamanhos;
  - os tipos MIME e os bytes reais;
  - as dimensões;
  - os caminhos;
  - o contraste.
- As mensagens de erro não expõem detalhes internos.
- `noindex, nofollow` evita indexação, mas **não** restringe o acesso.
