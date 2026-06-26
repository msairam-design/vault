-- ============================================
-- FAMILY VAULT - COMPLETE SETUP SCRIPT
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. DROP EVERYTHING (For a clean start)
-- ============================================
-- Drop Policies
DROP POLICY IF EXISTS "vaults_select" ON vaults CASCADE;
DROP POLICY IF EXISTS "vaults_insert" ON vaults CASCADE;
DROP POLICY IF EXISTS "vaults_update" ON vaults CASCADE;
DROP POLICY IF EXISTS "vaults_delete" ON vaults CASCADE;

DROP POLICY IF EXISTS "shares_select" ON vault_shares CASCADE;
DROP POLICY IF EXISTS "shares_insert" ON vault_shares CASCADE;
DROP POLICY IF EXISTS "shares_delete" ON vault_shares CASCADE;

DROP POLICY IF EXISTS "items_select" ON vault_items CASCADE;
DROP POLICY IF EXISTS "items_insert" ON vault_items CASCADE;
DROP POLICY IF EXISTS "items_update" ON vault_items CASCADE;
DROP POLICY IF EXISTS "items_delete" ON vault_items CASCADE;

DROP POLICY IF EXISTS "Users can read family secrets" ON family_secrets CASCADE;
DROP POLICY IF EXISTS "Users can manage family secrets" ON family_secrets CASCADE;

-- Drop Functions
DROP FUNCTION IF EXISTS public.is_vault_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_vault_shared(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_vault(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_share(uuid) CASCADE;

-- Drop Tables
DROP TABLE IF EXISTS public.vault_items CASCADE;
DROP TABLE IF EXISTS public.vault_shares CASCADE;
DROP TABLE IF EXISTS public.vaults CASCADE;
DROP TABLE IF EXISTS public.family_secrets CASCADE;

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- 2a. VAULTS (Folders)
CREATE TABLE public.vaults (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_email text,
    name text NOT NULL,
    is_shared boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 2b. VAULT SHARES (Who has access)
CREATE TABLE public.vault_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id uuid NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    shared_with_email text NOT NULL,
    permission text DEFAULT 'read',
    created_at timestamptz DEFAULT now(),
    UNIQUE(vault_id, shared_with_email)
);

-- 2c. VAULT ITEMS (The actual passwords)
CREATE TABLE public.vault_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vault_id uuid NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    title text NOT NULL,
    url text,
    phone text,
    email_associated text,
    username text,
    encrypted_password text NOT NULL,
    iv text NOT NULL,
    salt text NOT NULL,
    secret_label text NOT NULL,
    encrypt_tag text DEFAULT 'Family',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2d. FAMILY SECRETS (The 24 labels)
CREATE TABLE public.family_secrets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- 3. CREATE HELPER FUNCTIONS (Security Definer)
-- ============================================

-- Check if user OWNS the vault
CREATE OR REPLACE FUNCTION public.is_vault_owner(v_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.vaults v WHERE v.id = v_id AND v.user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is SHARED on the vault (by email)
CREATE OR REPLACE FUNCTION public.is_vault_shared(v_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.vault_shares vs 
    WHERE vs.vault_id = v_id 
    AND vs.shared_with_email = (auth.jwt() ->> 'email')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Combined check: Owner OR Shared
CREATE OR REPLACE FUNCTION public.can_access_vault(v_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (public.is_vault_owner(v_id) OR public.is_vault_shared(v_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can manage a share (must own the vault)
CREATE OR REPLACE FUNCTION public.can_manage_share(s_id uuid)
RETURNS boolean AS $$
DECLARE
  v_vault_id uuid;
BEGIN
  SELECT vault_id INTO v_vault_id FROM public.vault_shares WHERE id = s_id;
  RETURN public.is_vault_owner(v_vault_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_secrets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES
-- ============================================

-- 5a. VAULTS Policies
CREATE POLICY "vaults_select" ON public.vaults
  FOR SELECT TO authenticated
  USING (public.can_access_vault(id));

CREATE POLICY "vaults_insert" ON public.vaults
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vaults_update" ON public.vaults
  FOR UPDATE TO authenticated
  USING (public.is_vault_owner(id))
  WITH CHECK (public.is_vault_owner(id));

CREATE POLICY "vaults_delete" ON public.vaults
  FOR DELETE TO authenticated
  USING (public.is_vault_owner(id));

-- 5b. SHARES Policies
CREATE POLICY "shares_select" ON public.vault_shares
  FOR SELECT TO authenticated
  USING (
    public.is_vault_owner(vault_id) OR 
    shared_with_email = (auth.jwt() ->> 'email')
  );

CREATE POLICY "shares_insert" ON public.vault_shares
  FOR INSERT TO authenticated
  WITH CHECK (public.is_vault_owner(vault_id));

CREATE POLICY "shares_delete" ON public.vault_shares
  FOR DELETE TO authenticated
  USING (public.is_vault_owner(vault_id));

-- 5c. ITEMS Policies
CREATE POLICY "items_select" ON public.vault_items
  FOR SELECT TO authenticated
  USING (public.can_access_vault(vault_id));

CREATE POLICY "items_insert" ON public.vault_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_vault_owner(vault_id));

CREATE POLICY "items_update" ON public.vault_items
  FOR UPDATE TO authenticated
  USING (public.is_vault_owner(vault_id))
  WITH CHECK (public.is_vault_owner(vault_id));

CREATE POLICY "items_delete" ON public.vault_items
  FOR DELETE TO authenticated
  USING (public.is_vault_owner(vault_id));

-- 5d. FAMILY SECRETS Policies
CREATE POLICY "family_secrets_select" ON public.family_secrets
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "family_secrets_manage" ON public.family_secrets
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 6. INSERT THE 24 SEED LABELS
-- ============================================
INSERT INTO public.family_secrets (label) VALUES
('SLKE'), ('SLEK'), ('SKLE'), ('SKEL'), ('SELK'), ('SEKL'),
('LSKE'), ('LSEK'), ('LKSE'), ('LKES'), ('LESK'), ('LEKS'),
('KSLE'), ('KSEL'), ('KLSE'), ('KLES'), ('KESL'), ('KELS'),
('ESLK'), ('ESKL'), ('ELSK'), ('ELKS'), ('EKSL'), ('EKLS')
ON CONFLICT (label) DO NOTHING;

-- ============================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_vaults_user_id ON public.vaults(user_id);
CREATE INDEX idx_vault_shares_vault_id ON public.vault_shares(vault_id);
CREATE INDEX idx_vault_shares_email ON public.vault_shares(shared_with_email);
CREATE INDEX idx_vault_items_vault_id ON public.vault_items(vault_id);
CREATE INDEX idx_vault_items_user_id ON public.vault_items(user_id);

-- ============================================
-- 8. CONFIRMATION
-- ============================================
SELECT '✅ Family Vault setup complete!' as status;
SELECT COUNT(*) as total_seeds_installed FROM public.family_secrets;