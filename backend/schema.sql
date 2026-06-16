-- StudyGPT Database Schema SQL DDL
-- Compatible with Supabase PostgreSQL (Postgres 15+)

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. USERS PROFILE TABLE
-- Extends Supabase auth.users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. WORKSPACES
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

-- 4. DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Storage bucket path
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'indexed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. DOCUMENT CHUNKS
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    content TEXT NOT NULL,
    embedding VECTOR(768) NOT NULL, -- Gemini Embedding size (text-embedding-004)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CHAT SESSIONS
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    search_mode TEXT NOT NULL DEFAULT 'hybrid' CHECK (search_mode IN ('materials', 'web', 'hybrid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. MESSAGE SOURCES
CREATE TABLE IF NOT EXISTS public.message_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('file', 'web')),
    source_name TEXT NOT NULL,
    source_url TEXT,
    chunk_id UUID REFERENCES public.document_chunks(id) ON DELETE SET NULL,
    page_number INTEGER,
    snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. QUIZZES
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    quiz_type TEXT NOT NULL CHECK (quiz_type IN ('mcq', 'short_answer', 'exam_paper')),
    questions JSONB NOT NULL, -- Format: [{"id": "uuid", "question": "...", "options": [...], "correct": "A", "explanation": "..."}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL, -- Format: {"question_id": "selected_answer"}
    score INTEGER NOT NULL, -- percentage score
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. FLASHCARD DECKS
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. FLASHCARD ITEMS
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. FLASHCARD REVIEWS (Leitner System Tracking)
CREATE TABLE IF NOT EXISTS public.flashcard_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    box INTEGER DEFAULT 1 NOT NULL CHECK (box >= 1 AND box <= 5),
    next_review TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_reviewed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(flashcard_id, user_id)
);

-- 14. STUDY PLANS
CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    tasks JSONB NOT NULL,
    progress_pct INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. LEARNING STATS
CREATE TABLE IF NOT EXISTS public.learning_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    hours_studied NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    questions_asked INTEGER DEFAULT 0 NOT NULL,
    quizzes_completed INTEGER DEFAULT 0 NOT NULL,
    accuracy INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, subject)
);

-- 16. PROMPT TEMPLATES
CREATE TABLE IF NOT EXISTS public.prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. USAGE LOGS
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0 NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =======================================================
-- INDEXES & PERFORMANCE
-- =======================================================
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_wm_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_docs_ws ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_ws ON public.document_chunks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ws ON public.chat_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_sess ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_sources_msg ON public.message_sources(message_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_ws ON public.quizzes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_decks_ws ON public.flashcard_decks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cards_deck ON public.flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.flashcard_reviews(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_plans_ws ON public.study_plans(workspace_id);

-- Create HNSW Vector Index for efficient Cosine Similarity Search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx 
ON public.document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- =======================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =======================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Helper security verification functions
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid, u_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = ws_id AND user_id = u_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies
CREATE POLICY user_profile_all ON public.users FOR ALL USING (auth.uid() = id);

CREATE POLICY ws_all ON public.workspaces FOR ALL 
    USING (is_workspace_member(id, auth.uid()));

CREATE POLICY wm_all ON public.workspace_members FOR ALL 
    USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY doc_all ON public.documents FOR ALL 
    USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY chunk_all ON public.document_chunks FOR ALL 
    USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY sess_all ON public.chat_sessions FOR ALL 
    USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY msg_all ON public.messages FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = session_id AND is_workspace_member(workspace_id, auth.uid())));

CREATE POLICY src_all ON public.message_sources FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.chat_sessions s ON m.session_id = s.id WHERE m.id = message_id AND is_workspace_member(s.workspace_id, auth.uid())));

CREATE POLICY quiz_all ON public.quizzes FOR ALL 
    USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY qa_all ON public.quiz_attempts FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY deck_all ON public.flashcard_decks FOR ALL 
    USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY cards_all ON public.flashcards FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.flashcard_decks d WHERE d.id = deck_id AND is_workspace_member(d.workspace_id, auth.uid())));

CREATE POLICY reviews_all ON public.flashcard_reviews FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY plans_all ON public.study_plans FOR ALL 
    USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY stats_all ON public.learning_stats FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY logs_all ON public.usage_logs FOR ALL 
    USING (auth.uid() = user_id);

-- =======================================================
-- RETRIEVAL MATCHER WITH WORKSPACE SEGREGATION
-- =======================================================
CREATE OR REPLACE FUNCTION match_workspace_document_chunks(
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    filter_workspace_id uuid
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    page_number int,
    similarity float,
    metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.page_number,
        1 - (dc.embedding <=> query_embedding) AS similarity,
        dc.metadata
    FROM document_chunks dc
    WHERE dc.workspace_id = filter_workspace_id
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Trigger to sync new auth.users with public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create a default personal workspace for the user
  INSERT INTO public.workspaces (name, created_by)
  VALUES ('Personal Workspace', new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically add creator to workspace members
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new.id, new.created_by, 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();
