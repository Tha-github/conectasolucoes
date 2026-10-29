# Manual do painel de conteúdo — Conecta Soluções

Endereço do painel: **`<endereço do site>/admin/`** (por exemplo, `https://usuario.github.io/nome-do-repo/admin/` ou
`https://www.seudominio.com.br/admin/`).

| Quero…                        | Veja                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| Alterar um texto              | [1. Alterar textos](#1-alterar-textos)                                    |
| Trocar uma foto               | [2. Substituir imagens](#2-substituir-imagens)                            |
| Mudar uma cor                 | [3. Modificar cores](#3-modificar-cores)                                  |
| Colocar as mudanças no ar     | [5. Publicar](#5-publicar-as-mudanças)                                    |
| Continuar em outro computador | [4. Salvar, exportar e importar](#4-salvar-exportar-importar-e-restaurar) |

## Antes de começar: três regras

1. **O painel não publica sozinho.** Ele edita o conteúdo **no seu navegador**, mostra uma prévia e gera um arquivo.
   Os visitantes só veem as mudanças depois da [publicação](#5-publicar-as-mudanças).
2. **O painel é uma página pública, sem senha.** Quem tiver o endereço consegue abri-lo, mas só altera o próprio
   navegador: ninguém muda o site por ele. A segurança está na publicação, que exige conta autorizada no GitHub.
   **Não digite informações confidenciais.**
   - Uma "senha" verificada só no navegador não protegeria nada, porque o código do site é público. Por isso ela não
     existe.
   - Acesso restrito de verdade ou publicação com um clique exigiriam um serviço externo com login, o que ainda não
     foi autorizado.
3. **O painel altera apenas três coisas:**
   - **textos**;
   - **imagens** (arquivo, enquadramento e descrição);
   - **cores** da paleta.

   Ele não cria, apaga, duplica nem reordena seções, serviços, links, botões ou menus. Também não muda o número do
   WhatsApp, os destinos dos links nem o layout. Essas alterações são feitas pelo responsável técnico.

## A tela

| Área                             | Para que serve                                                                                                                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Barra superior**               | Status e os botões **Salvar rascunho**, **Exportar JSON**, **Importar JSON** e **Restaurar padrão**.                                                                                                                                    |
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

A publicação acontece **por Pull Request no GitHub**, com a conta de quem tem acesso ao repositório. O passo a passo
completo está em [`publicacao.md`](publicacao.md) §4. Resumo:

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

- Não há senhas, tokens nem chaves no código. O painel só faz requisições ao próprio site: `content/content.json`,
  `admin/preview-templates.json` e `admin/images.json`.
- A CSP permite apenas `'self'`, mais `blob:` para as imagens e o tema da prévia, que são gerados localmente.
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
