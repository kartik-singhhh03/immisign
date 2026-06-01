-- seed.sql

-- Clear out just in case
TRUNCATE TABLE public.agencies CASCADE;

-- Insert Agency
INSERT INTO public.agencies (id, name, slug) VALUES 
('11111111-1111-1111-1111-111111111111', 'AVC Migration', 'avc-migration');

-- Insert into auth.users (dummy encrypted password: 'password123')
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES
('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222221', 'authenticated', 'authenticated', 'owner@demoagency.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'admin@demoagency.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222223', 'authenticated', 'authenticated', 'agent@demoagency.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222224', 'authenticated', 'authenticated', 'manager@demoagency.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222225', 'authenticated', 'authenticated', 'assistant@demoagency.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222226', 'authenticated', 'authenticated', 'readonly@demoagency.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

-- Insert into public.users
INSERT INTO public.users (id, agency_id, full_name, email, role, job_title) VALUES
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Owner User', 'owner@demoagency.com', 'owner', 'Principal'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@demoagency.com', 'admin', 'Practice Manager'),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Agent User', 'agent@demoagency.com', 'agent', 'Senior Agent'),
('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'Manager User', 'manager@demoagency.com', 'manager', 'Case Manager'),
('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', 'Assistant User', 'assistant@demoagency.com', 'support', 'Legal Assistant'),
('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', 'Viewer User', 'readonly@demoagency.com', 'viewer', 'Auditor');

-- Insert Clients
INSERT INTO public.clients (id, agency_id, name, email, phone) VALUES
('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Harpreet Kaur', 'harpreet@example.com', '0400000001'),
('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Gurpreet Singh', 'gurpreet@example.com', '0400000002');

-- Matter Types
INSERT INTO public.matter_types (id, agency_id, name, description) VALUES
('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'Partner Visa - SC 820', 'Onshore Partner Visa'),
('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'Skilled Migration - SC 190', 'State Nominated Skilled Visa');

-- Agreements
INSERT INTO public.agreements (id, agency_id, created_by, title, agreement_number, client_id, matter_type_id, client_name, client_email, status, total_signers) VALUES
('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Agreement - Harpreet Kaur', 'AGR-1048', '33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444441', 'Harpreet Kaur', 'harpreet@example.com', 'pending', 1),
('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', 'Agreement - Gurpreet Singh', 'AGR-1049', '33333333-3333-3333-3333-333333333332', '44444444-4444-4444-4444-444444444442', 'Gurpreet Singh', 'gurpreet@example.com', 'draft', 1);

-- Documents

-- Approvals
INSERT INTO public.application_approvals (id, agency_id, client_id, created_by, title, visa_subclass, status, review_token) VALUES
('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222223', 'SC 820 Evidentiary Review', 'SC 820', 'pending', 'xyz-token-123');
