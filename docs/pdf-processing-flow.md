# PDF Upload & Flashcard Generation - Fluxo Técnico

## Arquitetura Geral

```
┌─────────────┐    ┌─────────┐    ┌──────┐    ┌─────┐
│   Browser   │───▶│   API   │───▶│ R2   │    │Redis│
│  (upload)   │    │(busboy) │    │(gzip)│    │Queue│
└─────────────┘    └────┬────┘    └──┬───┘    └──┬──┘
                        │            │           │
                        └────────────┴───────────┘
                                     │
                              ┌──────▼──────┐
                              │   Worker    │
                              │ (pdf-parse) │
                              │  (Gemini)   │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │ PostgreSQL  │
                              │ (cards +    │
                              │  embeddings)│
                              └─────────────┘
```

---

## Decisões Técnicas

### 1. Streaming Upload (não buffer)

| Abordagem | Memória | Escolha |
|-----------|---------|---------|
| Buffer em memória | O(tamanho do arquivo) | ❌ |
| **Stream direto para R2** | ~5MB (chunks) | ✅ |

**Razão:** Evita estouro de memória com PDFs grandes.

---

### 2. Worker Separado (não processamento síncrono)

| Abordagem | Problema | Escolha |
|-----------|----------|---------|
| Processar na API | Timeout, bloqueia requests | ❌ |
| **Worker assíncrono** | Retorno imediato (202), retry automático | ✅ |

**Razão:** AI leva 30-60s. API precisa responder rápido.

---

### 3. R2 como Buffer Temporário

```
Upload → R2 → Worker baixa → R2 deletado
```

**Por que R2 e não passar direto:**
- API e Worker são **processos separados**
- BullMQ só passa metadata, não binário
- R2 permite **retry** se Worker falhar

---

### 4. Buffer Completo para pdf-parse

| Operação | Pode usar stream? |
|----------|-------------------|
| Upload para R2 | ✅ Sim |
| Download do R2 | ✅ Sim |
| **Extração de texto** | ❌ Não |
| Geração AI | ✅ Sim (só texto) |

**Razão:** PDFs têm tabela XREF no final. Precisa ler tudo.

---

### 5. Compressão Gzip

| Métrica | Sem Gzip | Com Gzip |
|---------|----------|----------|
| Custo storage | 100% | ~30-40% |
| Banda upload | 100% | ~30-40% |

**Razão:** R2 cobra por GB. PDFs comprimem bem.

---

### 6. ws ao invés de Socket.IO

| Lib | Bundle | Deps | Para este caso |
|-----|--------|------|----------------|
| **ws** | ~20KB | 0 | ✅ Suficiente |
| Socket.IO | ~300KB | Muitas | Overkill |

**Razão:** Só precisamos de broadcast server→client.

---

## Uso de Memória

| Componente | Pico de Memória |
|------------|-----------------|
| API (upload) | ~5MB |
| Worker (pdf-parse) | Tamanho do PDF (máx 20MB) |
| Worker (AI prompt) | ~15KB (texto truncado) |

---

## Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `server/api/decks/upload.post.ts` | Stream upload + add job |
| `server/utils/storage.ts` | R2 upload/download gzip |
| `server/utils/queue.ts` | BullMQ jobs |
| `server/workers/deck-processor.ts` | PDF → AI → Cards |
| `server/websocket/index.ts` | Status real-time |
| `server/utils/pubsub.ts` | Publisher Redis |
