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
      categorias: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      detalle_solicitud: {
        Row: {
          cantidad_entregada: number
          cantidad_solicitada: number
          created_at: string
          id: string
          producto_id: string
          solicitud_id: string
        }
        Insert: {
          cantidad_entregada?: number
          cantidad_solicitada: number
          created_at?: string
          id?: string
          producto_id: string
          solicitud_id: string
        }
        Update: {
          cantidad_entregada?: number
          cantidad_solicitada?: number
          created_at?: string
          id?: string
          producto_id?: string
          solicitud_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "detalle_solicitud_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_solicitud_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          fecha: string
          id: string
          motivo: string | null
          producto_id: string
          referencia: string | null
          solicitud_id: string | null
          tipo: Database["public"]["Enums"]["movimiento_tipo"]
          usuario_responsable: string | null
        }
        Insert: {
          cantidad: number
          fecha?: string
          id?: string
          motivo?: string | null
          producto_id: string
          referencia?: string | null
          solicitud_id?: string | null
          tipo: Database["public"]["Enums"]["movimiento_tipo"]
          usuario_responsable?: string | null
        }
        Update: {
          cantidad?: number
          fecha?: string
          id?: string
          motivo?: string | null
          producto_id?: string
          referencia?: string | null
          solicitud_id?: string | null
          tipo?: Database["public"]["Enums"]["movimiento_tipo"]
          usuario_responsable?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          categoria_id: string | null
          creado_por: string | null
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          observaciones: string | null
          proveedor: string | null
          sku: string
          stock_actual: number
          stock_minimo: number
          ubicacion_id: string | null
          unidad_medida: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria_id?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          observaciones?: string | null
          proveedor?: string | null
          sku: string
          stock_actual?: number
          stock_minimo?: number
          ubicacion_id?: string | null
          unidad_medida?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria_id?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          observaciones?: string | null
          proveedor?: string | null
          sku?: string
          stock_actual?: number
          stock_minimo?: number
          ubicacion_id?: string | null
          unidad_medida?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          area: string | null
          correo: string
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          area?: string | null
          correo: string
          created_at?: string
          id: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          area?: string | null
          correo?: string
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      solicitudes: {
        Row: {
          autorizado_por: string | null
          comentarios_admin: string | null
          comentarios_almacen: string | null
          comentarios_usuario: string | null
          created_at: string
          entregado_por: string | null
          estatus: Database["public"]["Enums"]["solicitud_estatus"]
          fecha_autorizacion: string | null
          fecha_entrega: string | null
          fecha_lista: string | null
          fecha_requerida: string | null
          fecha_solicitud: string
          folio: number
          id: string
          preparado_por: string | null
          recibido_por: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          autorizado_por?: string | null
          comentarios_admin?: string | null
          comentarios_almacen?: string | null
          comentarios_usuario?: string | null
          created_at?: string
          entregado_por?: string | null
          estatus?: Database["public"]["Enums"]["solicitud_estatus"]
          fecha_autorizacion?: string | null
          fecha_entrega?: string | null
          fecha_lista?: string | null
          fecha_requerida?: string | null
          fecha_solicitud?: string
          folio?: number
          id?: string
          preparado_por?: string | null
          recibido_por?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          autorizado_por?: string | null
          comentarios_admin?: string | null
          comentarios_almacen?: string | null
          comentarios_usuario?: string | null
          created_at?: string
          entregado_por?: string | null
          estatus?: Database["public"]["Enums"]["solicitud_estatus"]
          fecha_autorizacion?: string | null
          fecha_entrega?: string | null
          fecha_lista?: string | null
          fecha_requerida?: string | null
          fecha_solicitud?: string
          folio?: number
          id?: string
          preparado_por?: string | null
          recibido_por?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      ubicaciones: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
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
      confirmar_recepcion_solicitud: {
        Args: { _comentarios?: string; _solicitud_id: string }
        Returns: {
          autorizado_por: string | null
          comentarios_admin: string | null
          comentarios_almacen: string | null
          comentarios_usuario: string | null
          created_at: string
          entregado_por: string | null
          estatus: Database["public"]["Enums"]["solicitud_estatus"]
          fecha_autorizacion: string | null
          fecha_entrega: string | null
          fecha_lista: string | null
          fecha_requerida: string | null
          fecha_solicitud: string
          folio: number
          id: string
          preparado_por: string | null
          recibido_por: string | null
          updated_at: string
          usuario_id: string
        }
        SetofOptions: {
          from: "*"
          to: "solicitudes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      entregar_solicitud: {
        Args: { _comentarios?: string; _entregas: Json; _solicitud_id: string }
        Returns: {
          autorizado_por: string | null
          comentarios_admin: string | null
          comentarios_almacen: string | null
          comentarios_usuario: string | null
          created_at: string
          entregado_por: string | null
          estatus: Database["public"]["Enums"]["solicitud_estatus"]
          fecha_autorizacion: string | null
          fecha_entrega: string | null
          fecha_lista: string | null
          fecha_requerida: string | null
          fecha_solicitud: string
          folio: number
          id: string
          preparado_por: string | null
          recibido_por: string | null
          updated_at: string
          usuario_id: string
        }
        SetofOptions: {
          from: "*"
          to: "solicitudes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      marcar_lista_solicitud: {
        Args: { _comentarios?: string; _entregas: Json; _solicitud_id: string }
        Returns: {
          autorizado_por: string | null
          comentarios_admin: string | null
          comentarios_almacen: string | null
          comentarios_usuario: string | null
          created_at: string
          entregado_por: string | null
          estatus: Database["public"]["Enums"]["solicitud_estatus"]
          fecha_autorizacion: string | null
          fecha_entrega: string | null
          fecha_lista: string | null
          fecha_requerida: string | null
          fecha_solicitud: string
          folio: number
          id: string
          preparado_por: string | null
          recibido_por: string | null
          updated_at: string
          usuario_id: string
        }
        SetofOptions: {
          from: "*"
          to: "solicitudes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_user_activo: {
        Args: { _activo: boolean; _user_id: string }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "almacen" | "solicitante"
      movimiento_tipo: "entrada" | "salida" | "ajuste"
      solicitud_estatus:
        | "pendiente"
        | "aprobada"
        | "rechazada"
        | "cancelada"
        | "lista"
        | "entregada"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "almacen", "solicitante"],
      movimiento_tipo: ["entrada", "salida", "ajuste"],
      solicitud_estatus: [
        "pendiente",
        "aprobada",
        "rechazada",
        "cancelada",
        "lista",
        "entregada",
      ],
    },
  },
} as const
