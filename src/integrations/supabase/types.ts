export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      atendimentos: {
        Row: {
          agendamento_id: string
          cadastrado: boolean
          created_at: string
          empresa_id: string
          entrega_confirmada: boolean
          entrega_confirmada_em: string | null
          etapa: Database["public"]["Enums"]["etapa_atendimento"]
          finalizado_em: string | null
          foto_url: string | null
          id: string
          iniciado_em: string
          nascimento: string | null
          observacao: string | null
          pagamento_confirmado: boolean
          pagamento_confirmado_em: string | null
          peso: number | null
          pet_id: string | null
          pet_nome: string
          pet_tipo: Database["public"]["Enums"]["tipo_pet"] | null
          sexo: Database["public"]["Enums"]["sexo_pet"] | null
          temperamento: Database["public"]["Enums"]["temperamento_pet"] | null
        }
        Insert: {
          agendamento_id: string
          cadastrado?: boolean
          created_at?: string
          empresa_id: string
          entrega_confirmada?: boolean
          entrega_confirmada_em?: string | null
          etapa?: Database["public"]["Enums"]["etapa_atendimento"]
          finalizado_em?: string | null
          foto_url?: string | null
          id?: string
          iniciado_em?: string
          nascimento?: string | null
          observacao?: string | null
          pagamento_confirmado?: boolean
          pagamento_confirmado_em?: string | null
          peso?: number | null
          pet_nome?: string
          pet_tipo?: Database["public"]["Enums"]["tipo_pet"] | null
          pet_id?: string | null
          sexo?: Database["public"]["Enums"]["sexo_pet"] | null
          temperamento?: Database["public"]["Enums"]["temperamento_pet"] | null
        }
        Update: {
          agendamento_id?: string
          cadastrado?: boolean
          created_at?: string
          empresa_id?: string
          entrega_confirmada?: boolean
          entrega_confirmada_em?: string | null
          etapa?: Database["public"]["Enums"]["etapa_atendimento"]
          finalizado_em?: string | null
          foto_url?: string | null
          id?: string
          iniciado_em?: string
          nascimento?: string | null
          observacao?: string | null
          pagamento_confirmado?: boolean
          pagamento_confirmado_em?: string | null
          peso?: number | null
          pet_nome?: string
          pet_tipo?: Database["public"]["Enums"]["tipo_pet"] | null
          sexo?: Database["public"]["Enums"]["sexo_pet"] | null
          temperamento?: Database["public"]["Enums"]["temperamento_pet"] | null
          pet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: true
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          cadastrado: boolean
          cliente_id: string
          created_at: string
          empresa_id: string
          foto_url: string | null
          id: string
          nascimento: string | null
          nome: string
          observacao: string | null
          peso: number | null
          sexo: Database["public"]["Enums"]["sexo_pet"] | null
          temperamento: Database["public"]["Enums"]["temperamento_pet"] | null
          tipo: Database["public"]["Enums"]["tipo_pet"] | null
          updated_at: string
        }
        Insert: {
          cadastrado?: boolean
          cliente_id: string
          created_at?: string
          empresa_id: string
          foto_url?: string | null
          id?: string
          nascimento?: string | null
          nome?: string
          observacao?: string | null
          peso?: number | null
          sexo?: Database["public"]["Enums"]["sexo_pet"] | null
          temperamento?: Database["public"]["Enums"]["temperamento_pet"] | null
          tipo?: Database["public"]["Enums"]["tipo_pet"] | null
          updated_at?: string
        }
        Update: {
          cadastrado?: boolean
          cliente_id?: string
          created_at?: string
          empresa_id?: string
          foto_url?: string | null
          id?: string
          nascimento?: string | null
          nome?: string
          observacao?: string | null
          peso?: number | null
          sexo?: Database["public"]["Enums"]["sexo_pet"] | null
          temperamento?: Database["public"]["Enums"]["temperamento_pet"] | null
          tipo?: Database["public"]["Enums"]["tipo_pet"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          cliente_id: string
          confirmacao_solicitada_em: string | null
          created_at: string
          empresa_id: string
          fim: string
          id: string
          inicio: string
          lembrete_enviado_em: string | null
          observacao: string | null
          servico_id: string
          status: Database["public"]["Enums"]["status_agendamento"]
        }
        Insert: {
          cliente_id: string
          confirmacao_solicitada_em?: string | null
          created_at?: string
          empresa_id: string
          fim: string
          id?: string
          inicio: string
          lembrete_enviado_em?: string | null
          observacao?: string | null
          servico_id: string
          status?: Database["public"]["Enums"]["status_agendamento"]
        }
        Update: {
          cliente_id?: string
          confirmacao_solicitada_em?: string | null
          created_at?: string
          empresa_id?: string
          fim?: string
          id?: string
          inicio?: string
          lembrete_enviado_em?: string | null
          observacao?: string | null
          servico_id?: string
          status?: Database["public"]["Enums"]["status_agendamento"]
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      bloqueios: {
        Row: {
          created_at: string
          empresa_id: string
          fim: string
          id: string
          inicio: string
          motivo: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          fim: string
          id?: string
          inicio: string
          motivo?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          fim?: string
          id?: string
          inicio?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bloqueios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          email: string | null
          empresa_id: string
          filiacao: string | null
          id: string
          nome: string
          telefone: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          empresa_id: string
          filiacao?: string | null
          id?: string
          nome: string
          telefone: string
        }
        Update: {
          created_at?: string
          email?: string | null
          empresa_id?: string
          filiacao?: string | null
          id?: string
          nome?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_admins: {
        Row: {
          created_at: string
          empresa_id: string
          full_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          full_name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          full_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_admins_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          atender_feriados: boolean
          ativa: boolean
          cor_fundo: string
          cor_primaria: string
          cor_secundaria: string
          cor_texto: string
          created_at: string
          dias_semana: number[]
          endereco: string
          hora_fim: string
          hora_inicio: string
          id: string
          intervalo_fim: string | null
          intervalo_inicio: string | null
          logo_url: string | null
          nome: string
          slug: string
          tipo_agenda: Database["public"]["Enums"]["tipo_agenda"]
          whatsapp_numero: string
        }
        Insert: {
          atender_feriados?: boolean
          ativa?: boolean
          cor_fundo?: string
          cor_primaria?: string
          cor_secundaria?: string
          cor_texto?: string
          created_at?: string
          dias_semana?: number[]
          endereco?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          logo_url?: string | null
          nome: string
          slug: string
          tipo_agenda: Database["public"]["Enums"]["tipo_agenda"]
          whatsapp_numero?: string
        }
        Update: {
          atender_feriados?: boolean
          ativa?: boolean
          cor_fundo?: string
          cor_primaria?: string
          cor_secundaria?: string
          cor_texto?: string
          created_at?: string
          dias_semana?: number[]
          endereco?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          logo_url?: string | null
          nome?: string
          slug?: string
          tipo_agenda?: Database["public"]["Enums"]["tipo_agenda"]
          whatsapp_numero?: string
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean
          created_at: string
          duracao_min: number
          empresa_id: string
          id: string
          intervalo_min: number
          nome: string
          preco: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          duracao_min?: number
          empresa_id: string
          id?: string
          intervalo_min?: number
          nome: string
          preco?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          duracao_min?: number
          empresa_id?: string
          id?: string
          intervalo_min?: number
          nome?: string
          preco?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_agendamento: {
        Args: {
          p_email?: string
          p_filiacao?: string
          p_inicio: string
          p_nome: string
          p_servico: string
          p_slug: string
          p_telefone: string
        }
        Returns: string
      }
      eh_dono: { Args: { _empresa: string }; Returns: boolean }
      empresa_ativa: { Args: { _empresa_id: string }; Returns: boolean }
      empresa_do_admin: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      horarios_ocupados: {
        Args: { p_data: string; p_empresa: string }
        Returns: {
          fim: string
          inicio: string
        }[]
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "master"
      etapa_atendimento: "em_atendimento" | "finalizado"
      sexo_pet: "macho" | "femea"
      temperamento_pet: "manso" | "bravo"
      tipo_pet: "cachorro" | "gato" | "ave" | "roedor" | "reptil" | "outro"
      status_agendamento:
        | "pendente"
        | "confirmado"
        | "cancelado"
        | "concluido"
        | "aguardando_confirmacao"
      tipo_agenda:
        | "saude_bem_estar"
        | "beleza_estetica"
        | "servicos_profissionais_consultoria"
        | "educacao_treinamentos"
        | "esporte_fitness_lazer"
        | "automotivo_servicos_gerais"
        | "eventos_gastronomia_entretenimento"
        | "servicos_publicos_governamentais"
        | "corporativo_rh"
        | "pet_shop_veterinaria"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "master"],
      etapa_atendimento: ["em_atendimento", "finalizado"],
      sexo_pet: ["macho", "femea"],
      temperamento_pet: ["manso", "bravo"],
      tipo_pet: ["cachorro", "gato", "ave", "roedor", "reptil", "outro"],
      status_agendamento: [
        "pendente",
        "confirmado",
        "cancelado",
        "concluido",
        "aguardando_confirmacao",
      ],
      tipo_agenda: [
        "saude_bem_estar",
        "beleza_estetica",
        "servicos_profissionais_consultoria",
        "educacao_treinamentos",
        "esporte_fitness_lazer",
        "automotivo_servicos_gerais",
        "eventos_gastronomia_entretenimento",
        "servicos_publicos_governamentais",
        "corporativo_rh",
        "pet_shop_veterinaria",
      ],
    },
  },
} as const
