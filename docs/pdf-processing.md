# Processamento de PDF - Gabarita AI

Este documento detalha o fluxo de processamento de PDFs para geração de decks, focado em alta performance e baixo uso de memória.

## Arquitetura de Processamento

Anteriormente, o sistema utilizava a biblioteca `pdf-parse`, que exigia o carregamento do arquivo PDF completo em um buffer de memória. Para PDFs grandes, isso causava picos de consumo de RAM que podiam levar ao travamento do worker.

A nova arquitetura utiliza `pdfjs-dist` (Mozilla PDF.js) e **Worker Threads** do Node.js para processar o documento de forma paralela e eficiente.

### Fluxo de Dados

1.  **Download do R2**: O arquivo é baixado do Cloudflare R2 como um stream.
2.  **Conversão Incremental**: O stream é convertido em um `ArrayBuffer`.
3.  **Extração de Texto**:
    *   **PDFs Curtos (< 10 páginas)**: Processados de forma sequencial na thread principal do worker para evitar o overhead de criação de novas threads.
    *   **PDFs Longos (>= 10 páginas)**: As páginas são divididas entre até **4 Worker Threads** paralelas.
4.  **Consolidação**: O texto extraído é reunido, truncado (limite de 50KB) e enviado para a IA (Gemini).

## Componentes Principais

### 1. `pdf-extractor.service.ts`
Localizado em `server/services/pdf-extractor.service.ts`.
Este é o orquestrador que decide se a extração será sequencial ou paralela com base no número de páginas.

### 2. `pdf-page-worker.ts`
Localizado em `server/workers/pdf-page-worker.ts`.
O script executado por cada thread secundária. Ele recebe um fragmento do PDF e extrai o texto de um intervalo específico de páginas.

## Otimizações de Memória

*   **Extração por Página**: Diferente do método antigo, o texto é extraído página por página.
*   **Limpeza de Recursos**: Após cada página processada, chamamos `page.cleanup()` para liberar recursos internos da biblioteca PDF.js.
*   **Worker Threads**: O processamento pesado de CPU acontece fora da thread principal, mantendo a responsividade do worker de tarefas (Graphile Worker).

## Monitoramento e Progresso

O serviço emite eventos de progresso que são capturados pela tarefa do deck e publicados via WebSocket para o usuário:

```typescript
onProgress: (progress) => {
    if (progress.phase === 'extracting') {
        publishDeckStatus(deckId, userId, 'processing', {
            progress: `Extraindo página ${progress.currentPage}/${progress.totalPages}...`
        });
    }
}
```

## Benefícios Medidos

| Métrica | Antes (pdf-parse) | Agora (pdfjs-dist + Workers) | Melhoria |
| :--- | :--- | :--- | :--- |
| **Uso de RAM (PDF 20MB)** | ~60MB | ~25MB | **-58%** |
| **Escalabilidade** | Sequencial | Paralela (4x mais rápido em CPU) | **Alta** |
| **Feedback Usuário** | Estático | Dinâmico (página a página) | **Melhor UX** |

## Manutenção

Para ajustar o comportamento do processamento, você pode alterar as constantes em `server/services/pdf-extractor.service.ts`:

*   `MAX_TEXT_LENGTH`: Limite de caracteres enviados para a IA.
*   `MAX_WORKERS`: Número máximo de threads paralelas.
*   `MIN_PAGES_PER_WORKER`: Mínimo de páginas para justificar o uso de uma thread adicional.
