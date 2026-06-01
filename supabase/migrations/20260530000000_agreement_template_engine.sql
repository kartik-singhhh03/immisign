-- Migration: agreement_template_engine
-- Description: Adds missing corporate/financial fields to Agencies and DOB to Clients for standard agreement population

-- 1. Agencies Extension
ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS legal_name TEXT,
ADD COLUMN IF NOT EXISTS abn TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_bsb TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Clients Extension
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS dob DATE;
