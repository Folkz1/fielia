# NotebookLM MCP - Fiel.IA

## Estado Validado

Data: 2026-04-30

- MCP instalado no Codex global: `notebooklm`.
- Comando registrado: `npx notebooklm-mcp@latest`.
- Health validado:
  - `authenticated: true`
  - `status: ok`
  - `notebook_url: not configured`
- Biblioteca local validada:
  - `notebooks: []`

Conclusao: o login Google esta funcionando, mas ainda falta registrar o link compartilhado do notebook do Fiel.IA.

## O Que Falta Para Usar NotebookLM

1. Criar ou abrir o notebook do Fiel.IA no NotebookLM.
2. Adicionar fontes:
   - PRD atualizado;
   - noticias curadas;
   - referencias de tom/estilo;
   - transcricoes de audios aprovados;
   - regras do Corinthians/Fiel.IA.
3. Copiar o link compartilhado do notebook.
4. Registrar no MCP com `add_notebook`.
5. Validar `ask_question` usando esse notebook.

Sem o link do notebook, `ask_question` falha corretamente com:

`Notebook URL is required to create a session`

## Formato De Conteudo Do Cliente

Referencias recebidas:

- Audio: `C:\Users\DeA\Downloads\audio-154660c0-6e09-48b6-a4d1-f085a5930f7f.mpeg`
- Imagem: infografico vertical `FIEL IA: Panorama Alvinegro - Noticias e Bastidores`

### Audio Tanaka / NotebookLM

Duracao da referencia: 14min33s.

Formato:

- Dois apresentadores conversando.
- Resenha de arquibancada, mas com analise real.
- Tom natural, nao forcar bordao.
- Sem citar fontes.
- Linguagem popular: "mano", "truta", "rapaziada", "papo reto", "bastidores", "a fita".
- Estrutura:
  1. Abertura com saudacao da Fiel.
  2. Promessa do tema.
  3. Bloco tatico/campo.
  4. Bloco bastidores/pressao.
  5. Bloco financas/mercado.
  6. Agenda proximos jogos.
  7. Resumo final.
  8. Pergunta provocativa para engajar o grupo.

### Imagem Panorama Alvinegro

Formato:

- Vertical 9:16.
- Branco, preto e vermelho como acento.
- Topo com logo/escudo e faixa preta.
- Titulo: `FIEL IA: Panorama Alvinegro - Noticias e Bastidores`.
- Subtitulo curto explicando o resumo do dia.
- Blocos visuais densos:
  - placar/jogo;
  - destaque tatico;
  - alerta financeiro/juridico;
  - mercado;
  - agenda;
  - classificacao/tabela.
- Estilo jornal popular + infografico esportivo.

## Prompt Base - Podcast Longo NotebookLM

Use quando o notebook estiver configurado:

```text
Voce e o FIEL IA em formato Panorama Alvinegro.

Crie um podcast conversado em portugues brasileiro, com dois apresentadores da torcida do Corinthians.

Objetivo: transformar as fontes do notebook em uma resenha natural de 10 a 15 minutos, parecida com uma conversa de arquibancada bem informada.

Regras:
- Nao cite nomes de sites, fontes ou "segundo a materia".
- Nao invente fatos fora das fontes.
- Linguagem de torcedor paulista/corinthiano, natural e sem exagero artificial.
- Use girias com moderacao: mano, truta, rapaziada, papo reto, bastidores, a fita.
- Evite parecer narrador formal ou propaganda.
- Dois apresentadores devem alternar falas curtas.
- Um apresentador puxa a pauta; o outro provoca, questiona e traduz para a Fiel.
- Pode ter opiniao, mas deixe claro quando for interpretacao.

Estrutura:
1. Saudacao curta para a Fiel.
2. Visao geral do dia.
3. Campo/tatica/desempenho.
4. Bastidores e pressao.
5. Financas, mercado ou gestao se houver.
6. Agenda dos proximos jogos.
7. Resumo em linguagem simples.
8. Fechamento com pergunta provocativa para gerar resposta no grupo.

Saida:
- Entregue apenas o roteiro dialogado.
- Use "Apresentador 1:" e "Apresentador 2:".
- Nao inclua notas de producao.
```

## Prompt Base - Imagem Panorama Alvinegro

```text
Crie um infografico vertical 9:16 para WhatsApp/Instagram Stories no estilo jornal esportivo popular.

Identidade:
- FIEL IA: Panorama Alvinegro - Noticias e Bastidores
- Corinthians como tema central.
- Paleta preto, branco e cinza com detalhes em vermelho.
- Visual denso, editorial, com blocos e icones esportivos.

Conteudo:
- Titulo grande no topo.
- Subtitulo curto.
- 5 a 7 blocos de noticias.
- Incluir, quando houver: placar, destaque tatico, alerta financeiro/juridico, mercado, agenda e classificacao.

Regras:
- Todo texto em portugues brasileiro correto.
- Textos curtos e legiveis.
- Nao usar marcas de fontes externas.
- Nao inventar escudos oficiais de clubes; usar representacoes genericas quando necessario.
- Evitar excesso de detalhes pequenos que fiquem ilegiveis no WhatsApp.
```

## Automacao Recomendada

Automacao diaria local, pausada ate o notebook estar cadastrado:

1. Buscar noticias curadas do Fiel.IA.
2. Se NotebookLM MCP tiver notebook configurado:
   - pedir sintese/roteiro ao NotebookLM.
3. Se NotebookLM falhar:
   - usar fallback OpenRouter com os mesmos prompts.
4. Gerar:
   - roteiro curto para grupo;
   - podcast longo ou medio;
   - imagem Panorama Alvinegro.
5. Salvar artefatos.
6. Enviar para o grupo apenas se o modo de envio estiver aprovado.

## Comandos De Diagnostico

```powershell
codex mcp list
npx notebooklm-mcp config get
```

Health via MCP deve retornar `authenticated: true`.

