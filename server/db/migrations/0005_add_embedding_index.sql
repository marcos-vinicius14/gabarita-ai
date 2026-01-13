-- Add HNSW index for efficient vector similarity search
-- Using cosine distance for semantic similarity comparison
CREATE INDEX IF NOT EXISTS "cards_embedding_idx" 
ON "tb_cards" USING hnsw (embedding vector_cosine_ops);
