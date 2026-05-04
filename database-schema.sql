-- ==========================================
-- 1. APAGAR ESTRUTURA ANTIGA (DROP)
-- Esta etapa apaga as tabelas e limpa o banco
-- (Ignora erros de "not found" caso seja a primeira vez)
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;

DROP TABLE IF EXISTS public.subtasks CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;


-- ==========================================
-- 2. RECRIAR TODA A ESTRUTURA
-- ==========================================

-- Habilita a extensão para geração de UUIDs, se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2.1 Tabela de profiles (relacionada ao usuário no Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para criar o perfil recém-cadastrado no auth automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2.2 Tabela de Projetos
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  owner TEXT,
  progress INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  forecast_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'NOT_STARTED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 Tabela de Tarefas
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  assignees TEXT[] DEFAULT '{}',
  progress INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  forecast_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'NOT_STARTED',
  risk_level TEXT DEFAULT 'LOW',
  updates TEXT,
  objective TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 Tabela de Subtarefas
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  assignees TEXT[] DEFAULT '{}',
  progress INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  forecast_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'NOT_STARTED',
  risk_level TEXT DEFAULT 'LOW',
  updates TEXT,
  objective TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. HABILITAR SEGURANÇA (RLS - Row Level Security)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- 3.1 Políticas para Profiles
CREATE POLICY "Users can view all profiles" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3.2 Políticas para Projetos (Ler, inserir, atualizar e deletar seus próprios projetos)
CREATE POLICY "Users can view own projects" 
  ON public.projects FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" 
  ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
  ON public.projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
  ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- 3.3 Políticas para Tarefas (Seguindo a relação de Projetos)
CREATE POLICY "Users can view tasks of own projects" 
  ON public.tasks FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can insert tasks to own projects" 
  ON public.tasks FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update tasks of own projects" 
  ON public.tasks FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can delete tasks of own projects" 
  ON public.tasks FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
  );

-- 3.4 Políticas para Subtarefas (Seguindo a relação Tarefa -> Projetos)
CREATE POLICY "Users can view subtasks of own projects" 
  ON public.subtasks FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tasks JOIN public.projects ON projects.id = tasks.project_id WHERE tasks.id = subtasks.task_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can insert subtasks to own projects" 
  ON public.subtasks FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks JOIN public.projects ON projects.id = tasks.project_id WHERE tasks.id = subtasks.task_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update subtasks of own projects" 
  ON public.subtasks FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tasks JOIN public.projects ON projects.id = tasks.project_id WHERE tasks.id = subtasks.task_id AND projects.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks JOIN public.projects ON projects.id = tasks.project_id WHERE tasks.id = subtasks.task_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can delete subtasks of own projects" 
  ON public.subtasks FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.tasks JOIN public.projects ON projects.id = tasks.project_id WHERE tasks.id = subtasks.task_id AND projects.user_id = auth.uid())
  );
