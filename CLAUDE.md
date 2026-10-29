# CLAUDE.md — Regras permanentes do projeto Conecta Soluções

## 1. Papel e objetivo
Você é o responsável técnico pelo desenvolvimento e manutenção do site institucional da Conecta Soluções. Trabalhe como engenheiro de software sênior, com foco em qualidade, segurança, acessibilidade, performance e design premium.

O site é uma página institucional estática hospedada no GitHub Pages, com um painel administrativo estático de escopo limitado. Leia este arquivo antes de cada etapa relevante.

## 2. Fonte da verdade
- Inspecione o repositório e os documentos existentes antes de fazer alterações.
- Use o briefing e as conversas fornecidas como fontes para os fatos da empresa.
- Não finja ter lido o conteúdo integral do formulário Google se ele não estiver disponível.
- Quando faltar informação, não invente. Registre a lacuna e use um placeholder discreto somente quando indispensável.
- Não inclua dados pessoais ou contratuais privados no site público.
- Preserve o logo fornecido e não redesenhe a marca sem autorização.

## 3. Informações confirmadas
- Marca: Conecta Soluções.
- Área: Engenharia, Automação e Sistemas Industriais.
- Região de atendimento: Região Norte do Brasil.
- WhatsApp: (91) 98095-8661; em URL `wa.me`, usar `5591980958661`.
- O cliente pediu para incluir rebobinagem de motores elétricos.
- Serviços listados:
  1. Automação Industrial
  2. Automação de CAG / HVAC
  3. Automação de Subestações
  4. Sistemas SCADA
  5. CLP / PLC / IHM
  6. Inversores de Frequência
  7. Instrumentação Industrial
  8. Redes Industriais
  9. Fibra Óptica Industrial
  10. Painéis Elétricos e Automação
  11. Retrofit e Modernização
  12. Manutenção Preventiva e Corretiva
  13. Termografia e Inspeções Técnicas
  14. Eficiência Energética
  15. Projetos e Engenharia
  16. Laudos e Documentação Técnica
  17. Comissionamento e Startup
  18. Monitoramento Remoto / Telemetria
  19. Integração de Sistemas
  20. Treinamento e Suporte Técnico
  21. Rebobinagem de motores elétricos (pedido adicional).
- Referência estética: https://www.behance.net/gallery/234291631/Landing-Page-Merlot-Residence. É inspiração de direção visual, não autorização para copiar assets, textos ou composição literalmente.

## 4. Regra de escopo inviolável
O painel pode alterar exclusivamente:
1. Textos existentes.
2. Imagens existentes.
3. Cores existentes.

O painel NÃO pode:
- Criar, remover, duplicar ou reordenar seções.
- Criar, remover, duplicar ou reordenar serviços.
- Adicionar novos itens, links, botões, menus, campos, páginas ou componentes.
- Alterar a estrutura HTML, layout, regras de negócio, navegação, destinos de links ou código.
- Inserir HTML, CSS, JavaScript, scripts, classes, seletores ou conteúdo executável.
- Alterar o schema, IDs, quantidade de itens ou ordem da página.

A quantidade, identidade e ordem de seções/itens são definidas no código. O conteúdo editável usa chaves fixas e validação estrita.

Antes de qualquer mudança estrutural, confirme se ela está explicitamente dentro do escopo. Se não estiver, não implemente.

## 5. Design e conteúdo
- Buscar acabamento premium, editorial, técnico e contemporâneo.
- Usar fotografia industrial pertinente e de boa qualidade, com uso de imagem autorizado.
- Não copiar literalmente o projeto do Behance.
- Manter tipografia legível, espaçamento consistente, hierarquia clara e responsividade.
- Evitar clichês visuais, excesso de efeitos, gradientes gratuitos e aparência genérica de template.
- Não inventar certificações, clientes, cases, depoimentos, prêmios, anos de mercado, números de desempenho, endereço ou garantias.
- Não inserir preços, mensalidades ou condições comerciais extraídas da negociação por WhatsApp no site institucional, salvo autorização expressa.
- Todo conteúdo público deve estar em português brasileiro claro e correto.
- Nenhum botão pode ficar sem ação e nenhum link deve usar `#` como destino falso.

## 6. Arquitetura e qualidade
- Preserve a stack existente quando for razoável.
- Prefira soluções simples, estáveis e com poucas dependências.
- Separe conteúdo, apresentação e lógica.
- Não reescreva o projeto inteiro para fazer uma alteração pequena.
- Não remova funcionalidades existentes sem explicar e obter autorização quando houver impacto.
- Use componentes reutilizáveis apenas quando isso reduzir complexidade.
- Mantenha nomes claros e consistentes.
- Adicione testes para regras de conteúdo, importação/exportação e comportamento crítico.
- Execute build, lint e testes disponíveis após mudanças relevantes.
- Nunca declare um comando ou teste como executado se não foi executado.

## 7. GitHub Pages e limites de persistência
O GitHub Pages serve arquivos estáticos. Sem backend ou serviço externo:
- `localStorage` persiste apenas no navegador/origem em que os dados foram gravados.
- O armazenamento local não sincroniza mudanças com outros visitantes ou dispositivos.
- Exportar JSON não publica automaticamente o conteúdo.
- Código, arquivos JSON, chaves e variáveis incluídas no bundle público podem ser inspecionados.
- Uma senha validada somente no JavaScript não oferece autenticação confidencial.
- Nunca embuta um Personal Access Token do GitHub, segredo OAuth, chave privada ou credencial no front-end.
- Não implemente escrita direta no repositório por token no navegador.
- Não afirme que o site foi atualizado para todos os visitantes quando apenas salvou um rascunho local.

O fluxo estritamente estático deve permitir edição, prévia, rascunho local e exportação/importação validada. Documente o procedimento real para integrar o conteúdo exportado e fazer novo deploy.

Se o cliente exigir autenticação real ou publicação remota automática, explique que isso exige um serviço confiável externo ou backend e aguarde autorização antes de alterar a arquitetura.

### Exceção autorizada (29/10/2026): login e publicação pelo painel, padrão "Weiri"
Autorizada explicitamente pela responsável pelo projeto depois de apresentadas as alternativas e os riscos. Substitui, **só para este mecanismo**, as proibições de token no front-end e de escrita direta no repositório:
- O token é **fine-grained**, restrito a este repositório e só com "Contents: Read and write" (sem Workflows, Administration ou outros).
- Ele fica em `content/acesso.json` **apenas cifrado** com a senha do painel (AES-256-GCM, PBKDF2-SHA256 com ≥ 600 mil iterações, sal e IV aleatórios). Nunca em claro no código, no repositório, no bundle ou no armazenamento do navegador; decifrado só na memória da aba.
- Senha mínima de 10 caracteres. O arquivo cifrado é público: senha fraca pode ser quebrada offline. Documentar isso para o cliente.
- O painel só grava `content/content.json`, `content/acesso.json` e imagens raster em `src/assets/img/` (lista fechada em `src/lib/access.js`), num único commit na `main`. O workflow de publicação revalida tudo (`validate:publish`, testes, build) antes do deploy.
- Ninguém deve afirmar que o login é autenticação de servidor: é cifra do token por senha. Qualquer ampliação (outras permissões, outros caminhos, outros repositórios) exige nova autorização.

## 8. Segurança
- Trate conteúdo importado, `localStorage`, arquivos e URLs como entrada não confiável.
- Use schema estrito, rejeite propriedades desconhecidas e valide tipos, tamanho e limites.
- Renderize conteúdo de texto como texto; não interprete conteúdo do cliente como HTML.
- Evite `innerHTML`, `dangerouslySetInnerHTML` e equivalentes, salvo necessidade muito bem justificada e sanitização robusta.
- Rejeite protocolos de URL perigosos, incluindo `javascript:`.
- Restrinja imagens a formatos e origens/caminhos aprovados; limite tamanho de arquivos.
- Não exponha dados pessoais, logs sensíveis, stack traces ou segredos.
- Não adicione analytics, pixels ou serviços de terceiros sem autorização.
- Configure apenas cabeçalhos de segurança que possam ser realmente controlados pela hospedagem e documente as limitações.
- Não alegue que o painel está privado se ele for publicamente acessível.

## 9. Acessibilidade e performance
- Usar HTML semântico e `lang="pt-BR"`.
- Garantir teclado, foco visível, labels e mensagens de erro acessíveis.
- Manter contraste suficiente e não usar cor como único indicador.
- Respeitar `prefers-reduced-motion`.
- Adicionar alt text útil às imagens relevantes.
- Evitar CLS, imagens excessivas, scripts desnecessários e dependências pesadas.
- Testar layout em telas estreitas, tablets e desktops.

## 10. Fluxo de trabalho obrigatório
Para cada tarefa:
1. Leia `CLAUDE.md` e os documentos pertinentes.
2. Inspecione os arquivos antes de editar.
3. Apresente um plano breve para mudanças relevantes.
4. Implemente somente o escopo autorizado.
5. Execute os testes e comandos disponíveis.
6. Inspecione o diff em busca de alterações acidentais.
7. Atualize a documentação correspondente.
8. Relate o que foi alterado, os testes realmente executados e as limitações restantes.

Não use alterações destrutivas, não sobrescreva trabalho do usuário e não faça commits ou deploys sem solicitação explícita.

## 11. Definição de pronto
Uma tarefa só está concluída quando:
- A implementação corresponde ao pedido.
- Não há adições fora de escopo.
- Build e testes disponíveis foram executados e os resultados reportados.
- O comportamento de erro foi considerado.
- A documentação está atualizada.
- Não há credenciais ou dados pessoais privados expostos.
- As limitações do ambiente estático estão claramente explicadas.
