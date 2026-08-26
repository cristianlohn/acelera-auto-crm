/**
 * @file database.types.ts
 * @description Mapeamento de tipos gerados do schema do Supabase / PostgreSQL.
 *
 * Espelho fiel do schema relacional definido em `supabase/schema.sql`.
 * Fornece tipagem estrita para consultas, inserts, updates e Row Level Security (RLS).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LeadStatus =
  | "novo"
  | "atendimento"
  | "visita"
  | "proposta"
  | "fechado";

export type LeadOrigin =
  | "whatsapp"
  | "instagram"
  | "site"
  | "indicacao"
  | "telefone"
  | "olx"
  | "icarros";

export type VehicleStatus = "disponivel" | "reservado" | "vendido";

export type FuelType =
  | "flex"
  | "gasolina"
  | "etanol"
  | "diesel"
  | "hibrido"
  | "eletrico";

export type TransmissionType = "automatico" | "manual" | "cvt";

export type UserRole = "admin" | "gerente" | "vendedor";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          document: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          document?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          document?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          role: UserRole;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          full_name: string;
          role?: UserRole;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          full_name?: string;
          role?: UserRole;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };

      vehicles: {
        Row: {
          id: string;
          organization_id: string;
          make: string;
          model: string;
          version: string | null;
          year_fab: number;
          year_model: number;
          price: number;
          mileage: number;
          plate_last_digits: string;
          color: string;
          fuel: FuelType;
          transmission: TransmissionType;
          status: VehicleStatus;
          photo_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          make: string;
          model: string;
          version?: string | null;
          year_fab: number;
          year_model: number;
          price: number;
          mileage?: number;
          plate_last_digits: string;
          color?: string;
          fuel?: FuelType;
          transmission?: TransmissionType;
          status?: VehicleStatus;
          photo_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          make?: string;
          model?: string;
          version?: string | null;
          year_fab?: number;
          year_model?: number;
          price?: number;
          mileage?: number;
          plate_last_digits?: string;
          color?: string;
          fuel?: FuelType;
          transmission?: TransmissionType;
          status?: VehicleStatus;
          photo_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };

      leads: {
        Row: {
          id: string;
          organization_id: string;
          seller_id: string | null;
          seller_name: string;
          name: string;
          phone: string;
          email: string | null;
          vehicle_interest: string;
          status: LeadStatus;
          origin: LeadOrigin;
          last_contact_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          seller_id?: string | null;
          seller_name?: string;
          name: string;
          phone: string;
          email?: string | null;
          vehicle_interest: string;
          status?: LeadStatus;
          origin?: LeadOrigin;
          last_contact_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          seller_id?: string | null;
          seller_name?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          vehicle_interest?: string;
          status?: LeadStatus;
          origin?: LeadOrigin;
          last_contact_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_seller_id_fkey";
            columns: ["seller_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_org_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      lead_status: LeadStatus;
      lead_origin: LeadOrigin;
      vehicle_status: VehicleStatus;
      fuel_type: FuelType;
      transmission_type: TransmissionType;
      user_role: UserRole;
    };
  };
}
