-- Criar enum para roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'accountant');
  END IF;
END$$;

-- Tabela de perfis dos usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de roles separada (CRITICAL SECURITY)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Tabela de clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de pastas
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de arquivos
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de vinculação contabilidade-cliente
CREATE TABLE public.accountant_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(accountant_id, client_id)
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountant_clients ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies para profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies para user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies para clients
CREATE POLICY "Admins can view all clients"
  ON public.clients FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Accountants can view assigned clients"
  ON public.clients FOR SELECT
  USING (
    public.has_role(auth.uid(), 'accountant') AND
    EXISTS (
      SELECT 1 FROM public.accountant_clients
      WHERE accountant_id = auth.uid() AND client_id = clients.id
    )
  );

CREATE POLICY "Admins can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update clients"
  ON public.clients FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para folders
CREATE POLICY "Admins can view all folders"
  ON public.folders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Accountants can view folders of assigned clients"
  ON public.folders FOR SELECT
  USING (
    public.has_role(auth.uid(), 'accountant') AND
    EXISTS (
      SELECT 1 FROM public.accountant_clients
      WHERE accountant_id = auth.uid() AND client_id = folders.client_id
    )
  );

CREATE POLICY "Admins can insert folders"
  ON public.folders FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update folders"
  ON public.folders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete folders"
  ON public.folders FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para files
CREATE POLICY "Admins can view all files"
  ON public.files FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Accountants can view files of assigned clients"
  ON public.files FOR SELECT
  USING (
    public.has_role(auth.uid(), 'accountant') AND
    EXISTS (
      SELECT 1 FROM public.accountant_clients ac
      JOIN public.folders f ON f.client_id = ac.client_id
      WHERE ac.accountant_id = auth.uid() AND f.id = files.folder_id
    )
  );

CREATE POLICY "Admins can insert files"
  ON public.files FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete files"
  ON public.files FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para accountant_clients
CREATE POLICY "Admins can manage accountant assignments"
  ON public.accountant_clients FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Accountants can view own assignments"
  ON public.accountant_clients FOR SELECT
  USING (auth.uid() = accountant_id);

-- Criar bucket de storage para arquivos fiscais
INSERT INTO storage.buckets (id, name, public)
VALUES ('fiscal-files', 'fiscal-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para storage
DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
CREATE POLICY "Admins can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fiscal-files' AND
    (SELECT public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Admins can view all files" ON storage.objects;
CREATE POLICY "Admins can view all files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fiscal-files' AND
    (SELECT public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Accountants can view assigned files" ON storage.objects;
CREATE POLICY "Accountants can view assigned files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fiscal-files' AND
    (SELECT public.has_role(auth.uid(), 'accountant'))
  );

DROP POLICY IF EXISTS "Admins can delete files" ON storage.objects;
CREATE POLICY "Admins can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fiscal-files' AND
    (SELECT public.has_role(auth.uid(), 'admin'))
  );