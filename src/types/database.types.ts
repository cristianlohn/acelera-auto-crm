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
  | "icarros"
  | "webmotors"
  | "indicacao_dono"
  | "cliente_carteira"
  | "patio_balcao";

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
          plan?: string | null;
          subscription_status?: string | null;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          plan_tier?: string | null;
          plan_status?: string | null;
          asaas_customer_id?: string | null;
          asaas_subscription_id?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          document?: string | null;
          plan?: string | null;
          subscription_status?: string | null;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          plan_tier?: string | null;
          plan_status?: string | null;
          asaas_customer_id?: string | null;
          asaas_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          document?: string | null;
          plan?: string | null;
          subscription_status?: string | null;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          plan_tier?: string | null;
          plan_status?: string | null;
          asaas_customer_id?: string | null;
          asaas_subscription_id?: string | null;
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

      api_keys: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          created_at: string;
          last_used_at: string | null;
          revoked_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          key_prefix?: string;
          key_hash?: string;
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };

      organization_invites: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: string;
          token: string;
          status: "pending" | "accepted" | "revoked" | "expired";
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          role?: string;
          token?: string;
          status?: "pending" | "accepted" | "revoked" | "expired";
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          role?: string;
          token?: string;
          status?: "pending" | "accepted" | "revoked" | "expired";
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };

      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: string;
          status: "pending" | "active" | "revoked";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: string;
          status?: "pending" | "active" | "revoked";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: string;
          status?: "pending" | "active" | "revoked";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
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

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];

