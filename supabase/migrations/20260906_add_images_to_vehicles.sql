-- Migration: Adiciona a coluna images (array de URLs de fotos da galeria) na tabela public.vehicles
-- Data: 2026-09-06
-- Descrição: Permite persistência nativa da galeria de fotos do veículo com suporte a array de URLs (TEXT[]).

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
