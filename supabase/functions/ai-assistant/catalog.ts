// Generated from database metadata; contains no row data or credentials.
export const readCatalog: Record<string, { name: string; type: string }[]> = {
  "_nc_m2m_negocios_divisas": [
    {
      "name": "divisas_id",
      "type": "uuid"
    },
    {
      "name": "negocios_id",
      "type": "uuid"
    }
  ],
  "activos_digitales": [
    {
      "name": "activo",
      "type": "text"
    },
    {
      "name": "id_wallet",
      "type": "text"
    },
    {
      "name": "wallet",
      "type": "text"
    },
    {
      "name": "red",
      "type": "text"
    },
    {
      "name": "tarifas",
      "type": "text"
    },
    {
      "name": "saldo_usdt",
      "type": "numeric"
    },
    {
      "name": "saldo_real",
      "type": "numeric"
    },
    {
      "name": "ingresos_usdt",
      "type": "numeric"
    },
    {
      "name": "egresos_usdt",
      "type": "numeric"
    },
    {
      "name": "rate_final",
      "type": "numeric"
    },
    {
      "name": "liquidez_esperada_cop",
      "type": "numeric"
    },
    {
      "name": "movimientos",
      "type": "jsonb"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "saldo_inicial",
      "type": "numeric"
    },
    {
      "name": "titular",
      "type": "text"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    },
    {
      "name": "institucion_id",
      "type": "uuid"
    },
    {
      "name": "tipo",
      "type": "text"
    },
    {
      "name": "pais",
      "type": "text"
    }
  ],
  "activos_liquidos": [
    {
      "name": "activo",
      "type": "text"
    },
    {
      "name": "institucion",
      "type": "text"
    },
    {
      "name": "titular",
      "type": "text"
    },
    {
      "name": "empresa",
      "type": "text"
    },
    {
      "name": "cuenta",
      "type": "text"
    },
    {
      "name": "divisa",
      "type": "text"
    },
    {
      "name": "tarifas",
      "type": "text"
    },
    {
      "name": "saldo_cop",
      "type": "numeric"
    },
    {
      "name": "saldo_real",
      "type": "numeric"
    },
    {
      "name": "ingresos_cop",
      "type": "numeric"
    },
    {
      "name": "egresos_cop",
      "type": "numeric"
    },
    {
      "name": "movimientos",
      "type": "jsonb"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "saldo_inicial",
      "type": "numeric"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    },
    {
      "name": "institucion_id",
      "type": "uuid"
    },
    {
      "name": "tipo",
      "type": "text"
    },
    {
      "name": "pais",
      "type": "text"
    },
    {
      "name": "api_id",
      "type": "text"
    }
  ],
  "app_versions": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "version",
      "type": "text"
    },
    {
      "name": "version_code",
      "type": "integer"
    },
    {
      "name": "title",
      "type": "text"
    },
    {
      "name": "summary",
      "type": "text"
    },
    {
      "name": "changes",
      "type": "jsonb"
    },
    {
      "name": "is_published",
      "type": "boolean"
    },
    {
      "name": "released_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    }
  ],
  "capital_movimientos": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "socio_id",
      "type": "uuid"
    },
    {
      "name": "fecha",
      "type": "date"
    },
    {
      "name": "tipo",
      "type": "text"
    },
    {
      "name": "monto",
      "type": "numeric"
    },
    {
      "name": "tasa",
      "type": "numeric"
    },
    {
      "name": "monto_cop",
      "type": "numeric"
    },
    {
      "name": "medio",
      "type": "text"
    },
    {
      "name": "cuenta_liquida_id",
      "type": "uuid"
    },
    {
      "name": "cuenta_digital_id",
      "type": "uuid"
    },
    {
      "name": "contrato_id",
      "type": "uuid"
    },
    {
      "name": "condiciones",
      "type": "text"
    },
    {
      "name": "numero",
      "type": "bigint"
    },
    {
      "name": "codigo",
      "type": "text"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    }
  ],
  "capital_socios": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "nombre",
      "type": "text"
    },
    {
      "name": "tipo",
      "type": "text"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    }
  ],
  "cash_tokens": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "codigo",
      "type": "text"
    },
    {
      "name": "monto",
      "type": "numeric"
    },
    {
      "name": "divisa",
      "type": "text"
    },
    {
      "name": "referencia",
      "type": "text"
    },
    {
      "name": "estado",
      "type": "text"
    },
    {
      "name": "status",
      "type": "text"
    },
    {
      "name": "fecha",
      "type": "date"
    },
    {
      "name": "expires_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    },
    {
      "name": "redeemed_by",
      "type": "uuid"
    },
    {
      "name": "redeemed_by_name",
      "type": "text"
    },
    {
      "name": "redeemed_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "cancel_reason",
      "type": "text"
    },
    {
      "name": "cancelled_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "updated_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "efectivo_id",
      "type": "uuid"
    },
    {
      "name": "pago_codigo",
      "type": "text"
    }
  ],
  "client_shared_links": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "client_id",
      "type": "text"
    },
    {
      "name": "client_name",
      "type": "text"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "is_active",
      "type": "boolean"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    }
  ],
  "clientes": [
    {
      "name": "codigo",
      "type": "character varying"
    },
    {
      "name": "nombre",
      "type": "text"
    },
    {
      "name": "numero",
      "type": "integer"
    },
    {
      "name": "ingresos_cop",
      "type": "numeric"
    },
    {
      "name": "pagado_cop",
      "type": "numeric"
    },
    {
      "name": "pendiente_cop",
      "type": "numeric"
    },
    {
      "name": "saldo_cop",
      "type": "numeric"
    },
    {
      "name": "estado",
      "type": "character varying"
    },
    {
      "name": "fecha_creacion",
      "type": "timestamp with time zone"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "updated_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "pais",
      "type": "text"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    },
    {
      "name": "total_negocios",
      "type": "integer"
    }
  ],
  "comisionistas": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "codigo",
      "type": "character varying"
    },
    {
      "name": "numero",
      "type": "integer"
    },
    {
      "name": "cliente_id",
      "type": "uuid"
    },
    {
      "name": "referidos_ids",
      "type": "ARRAY"
    },
    {
      "name": "porcentaje_comision",
      "type": "numeric"
    },
    {
      "name": "ingresos_cop",
      "type": "numeric"
    },
    {
      "name": "comisiones_cop",
      "type": "numeric"
    },
    {
      "name": "fecha_creacion",
      "type": "timestamp with time zone"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    }
  ],
  "compras_usdt": [
    {
      "name": "codigo",
      "type": "text"
    },
    {
      "name": "numero",
      "type": "integer"
    },
    {
      "name": "fecha",
      "type": "date"
    },
    {
      "name": "divisa_codigo",
      "type": "text"
    },
    {
      "name": "valor_comprado",
      "type": "numeric"
    },
    {
      "name": "usdt_comprado",
      "type": "numeric"
    },
    {
      "name": "tasa",
      "type": "numeric"
    },
    {
      "name": "costo",
      "type": "numeric"
    },
    {
      "name": "wallet_destino",
      "type": "text"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "wallet_destino_id",
      "type": "text"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    },
    {
      "name": "proveedor",
      "type": "text"
    },
    {
      "name": "estado",
      "type": "text"
    },
    {
      "name": "saldo_compra_aplicado",
      "type": "boolean"
    },
    {
      "name": "fecha_recibido",
      "type": "timestamp with time zone"
    },
    {
      "name": "recibido_por",
      "type": "uuid"
    }
  ],
  "dispersiones": [
    {
      "name": "codigo",
      "type": "text"
    },
    {
      "name": "numero",
      "type": "integer"
    },
    {
      "name": "fecha",
      "type": "timestamp with time zone"
    },
    {
      "name": "cliente_id",
      "type": "uuid"
    },
    {
      "name": "cliente_codigo",
      "type": "character varying"
    },
    {
      "name": "cliente_nombre",
      "type": "character varying"
    },
    {
      "name": "monto",
      "type": "numeric"
    },
    {
      "name": "monto_cop",
      "type": "numeric"
    },
    {
      "name": "origen_fondos",
      "type": "text"
    },
    {
      "name": "referencia",
      "type": "character varying"
    },
    {
      "name": "estado",
      "type": "character varying"
    },
    {
      "name": "tiene_comprobante",
      "type": "boolean"
    },
    {
      "name": "comprobante_url",
      "type": "text"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "origen_fondos_id",
      "type": "text"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    },
    {
      "name": "saldo_origen_aplicado",
      "type": "boolean"
    },
    {
      "name": "costo_cop",
      "type": "numeric"
    },
    {
      "name": "costo_origen_aplicado",
      "type": "boolean"
    }
  ],
  "divisas": [
    {
      "name": "codigo",
      "type": "character varying"
    },
    {
      "name": "divisa",
      "type": "character varying"
    },
    {
      "name": "nombre_divisa",
      "type": "character varying"
    },
    {
      "name": "pais",
      "type": "text"
    },
    {
      "name": "bandera_url",
      "type": "character varying"
    },
    {
      "name": "total_recibido",
      "type": "numeric"
    },
    {
      "name": "total_comprado",
      "type": "numeric"
    },
    {
      "name": "total_pendiente",
      "type": "numeric"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "_nc_ph_ckz5aoc0tw3da0f",
      "type": "text"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    }
  ],
  "efectivo": [
    {
      "name": "codigo",
      "type": "text"
    },
    {
      "name": "fecha",
      "type": "date"
    },
    {
      "name": "tipo",
      "type": "text"
    },
    {
      "name": "cliente_id",
      "type": "uuid"
    },
    {
      "name": "cliente_codigo",
      "type": "character varying"
    },
    {
      "name": "cliente_nombre",
      "type": "character varying"
    },
    {
      "name": "monto",
      "type": "numeric"
    },
    {
      "name": "origen_fondos",
      "type": "text"
    },
    {
      "name": "referencia",
      "type": "character varying"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "origen_fondos_id",
      "type": "text"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    },
    {
      "name": "comision_cop",
      "type": "numeric"
    }
  ],
  "gastos": [
    {
      "name": "codigo",
      "type": "text"
    },
    {
      "name": "fecha",
      "type": "date"
    },
    {
      "name": "concepto",
      "type": "character varying"
    },
    {
      "name": "categoria",
      "type": "text"
    },
    {
      "name": "divisa",
      "type": "text"
    },
    {
      "name": "monto",
      "type": "numeric"
    },
    {
      "name": "origen_fondos",
      "type": "text"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "comprobante_url",
      "type": "text"
    },
    {
      "name": "origen_fondos_id",
      "type": "text"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    }
  ],
  "historial_ganancia_diaria": [
    {
      "name": "fecha",
      "type": "date"
    },
    {
      "name": "ganancia_cop",
      "type": "numeric"
    },
    {
      "name": "registrado_en",
      "type": "timestamp with time zone"
    }
  ],
  "instituciones": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "name",
      "type": "text"
    },
    {
      "name": "type",
      "type": "text"
    },
    {
      "name": "currency",
      "type": "text"
    },
    {
      "name": "divisa_id",
      "type": "uuid"
    },
    {
      "name": "country",
      "type": "text"
    },
    {
      "name": "website_url",
      "type": "text"
    },
    {
      "name": "logo_url",
      "type": "text"
    },
    {
      "name": "status",
      "type": "text"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "updated_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    },
    {
      "name": "color",
      "type": "text"
    }
  ],
  "negocios": [
    {
      "name": "codigo",
      "type": "text"
    },
    {
      "name": "numero",
      "type": "integer"
    },
    {
      "name": "fecha",
      "type": "date"
    },
    {
      "name": "cliente_id",
      "type": "uuid"
    },
    {
      "name": "cliente_codigo",
      "type": "character varying"
    },
    {
      "name": "cliente_nombre",
      "type": "character varying"
    },
    {
      "name": "divisa_codigo",
      "type": "character varying"
    },
    {
      "name": "monto_divisa",
      "type": "numeric"
    },
    {
      "name": "tasa",
      "type": "numeric"
    },
    {
      "name": "tasa_cliente_cop",
      "type": "numeric"
    },
    {
      "name": "ingreso_cop",
      "type": "numeric"
    },
    {
      "name": "monto_cop",
      "type": "numeric"
    },
    {
      "name": "usdt_por_divisa",
      "type": "numeric"
    },
    {
      "name": "costo_usdt_comp",
      "type": "numeric"
    },
    {
      "name": "estado",
      "type": "character varying"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    }
  ],
  "profiles": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "email",
      "type": "text"
    },
    {
      "name": "full_name",
      "type": "text"
    },
    {
      "name": "role",
      "type": "text"
    },
    {
      "name": "onboarding_completed",
      "type": "boolean"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "updated_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "authorized_currencies",
      "type": "ARRAY"
    },
    {
      "name": "status",
      "type": "text"
    },
    {
      "name": "is_super_admin",
      "type": "boolean"
    },
    {
      "name": "pais",
      "type": "text"
    },
    {
      "name": "operator_code",
      "type": "text"
    },
    {
      "name": "two_factor_enabled",
      "type": "boolean"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    }
  ],
  "resumen_liquidacion": [
    {
      "name": "total_negocio_cop",
      "type": "numeric"
    },
    {
      "name": "total_ventas_usdt_cop",
      "type": "numeric"
    },
    {
      "name": "total_liquidez_esperada_cop",
      "type": "numeric"
    },
    {
      "name": "ganancia_esperada_cop",
      "type": "numeric"
    },
    {
      "name": "total_activos_digitales_usdt",
      "type": "numeric"
    },
    {
      "name": "total_activos_liquidos_cop",
      "type": "numeric"
    },
    {
      "name": "total_saldo_pendiente_clientes_cop",
      "type": "numeric"
    },
    {
      "name": "total_gastos_cop",
      "type": "numeric"
    },
    {
      "name": "updated_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    },
    {
      "name": "rate_usdt_cop",
      "type": "numeric"
    },
    {
      "name": "total_costos_dispersion_cop",
      "type": "numeric"
    },
    {
      "name": "saldo_neto_clientes_cop",
      "type": "numeric"
    },
    {
      "name": "total_capital_invertido_cop",
      "type": "numeric"
    }
  ],
  "transferencias_internas": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "codigo",
      "type": "text"
    },
    {
      "name": "fecha",
      "type": "date"
    },
    {
      "name": "tipo_origen",
      "type": "text"
    },
    {
      "name": "origen_id",
      "type": "uuid"
    },
    {
      "name": "origen_nombre",
      "type": "text"
    },
    {
      "name": "tipo_destino",
      "type": "text"
    },
    {
      "name": "destino_id",
      "type": "uuid"
    },
    {
      "name": "destino_nombre",
      "type": "text"
    },
    {
      "name": "monto",
      "type": "numeric"
    },
    {
      "name": "divisa_origen",
      "type": "text"
    },
    {
      "name": "monto_destino",
      "type": "numeric"
    },
    {
      "name": "divisa_destino",
      "type": "text"
    },
    {
      "name": "tasa",
      "type": "numeric"
    },
    {
      "name": "costo",
      "type": "numeric"
    },
    {
      "name": "divisa_costo",
      "type": "text"
    },
    {
      "name": "concepto",
      "type": "text"
    },
    {
      "name": "notas",
      "type": "text"
    },
    {
      "name": "comprobante_url",
      "type": "text"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    }
  ],
  "user_version_confirmations": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "user_id",
      "type": "uuid"
    },
    {
      "name": "version_id",
      "type": "uuid"
    },
    {
      "name": "version_code",
      "type": "integer"
    },
    {
      "name": "confirmed_at",
      "type": "timestamp with time zone"
    }
  ],
  "ventas_usdt": [
    {
      "name": "codigo",
      "type": "text"
    },
    {
      "name": "numero",
      "type": "integer"
    },
    {
      "name": "fecha",
      "type": "date"
    },
    {
      "name": "concepto",
      "type": "text"
    },
    {
      "name": "usdt_vendido",
      "type": "numeric"
    },
    {
      "name": "tasa",
      "type": "numeric"
    },
    {
      "name": "total_cop",
      "type": "numeric"
    },
    {
      "name": "wallet_origen",
      "type": "text"
    },
    {
      "name": "destino_fondos_nombre",
      "type": "text"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "wallet_origen_id",
      "type": "text"
    },
    {
      "name": "destino_fondos_id",
      "type": "text"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    },
    {
      "name": "fee_usdt",
      "type": "numeric"
    },
    {
      "name": "saldo_venta_aplicado",
      "type": "boolean"
    },
    {
      "name": "estado",
      "type": "text"
    },
    {
      "name": "fecha_recibido",
      "type": "timestamp with time zone"
    },
    {
      "name": "recibido_por",
      "type": "uuid"
    }
  ],
  "usuarios": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "email",
      "type": "text"
    },
    {
      "name": "full_name",
      "type": "text"
    },
    {
      "name": "role",
      "type": "text"
    },
    {
      "name": "onboarding_completed",
      "type": "boolean"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "updated_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "authorized_currencies",
      "type": "ARRAY"
    },
    {
      "name": "status",
      "type": "text"
    },
    {
      "name": "is_super_admin",
      "type": "boolean"
    },
    {
      "name": "pais",
      "type": "text"
    },
    {
      "name": "operator_code",
      "type": "text"
    },
    {
      "name": "two_factor_enabled",
      "type": "boolean"
    },
    {
      "name": "created_by",
      "type": "uuid"
    },
    {
      "name": "created_by_name",
      "type": "text"
    },
    {
      "name": "created_at_audit",
      "type": "timestamp with time zone"
    }
  ],
  "push_subscriptions": [
    {
      "name": "id",
      "type": "uuid"
    },
    {
      "name": "user_id",
      "type": "uuid"
    },
    {
      "name": "device_type",
      "type": "text"
    },
    {
      "name": "user_agent",
      "type": "text"
    },
    {
      "name": "last_push_version",
      "type": "text"
    },
    {
      "name": "last_push_version_code",
      "type": "integer"
    },
    {
      "name": "is_active",
      "type": "boolean"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone"
    },
    {
      "name": "updated_at",
      "type": "timestamp with time zone"
    }
  ]
};
export const technicalReference = {
  "snapshotDate": "2026-11-13",
  "schema": {
    "_nc_m2m_negocios_divisas": [
      {
        "name": "divisas_id",
        "type": "uuid"
      },
      {
        "name": "negocios_id",
        "type": "uuid"
      }
    ],
    "activos_digitales": [
      {
        "name": "activo",
        "type": "text"
      },
      {
        "name": "id_wallet",
        "type": "text"
      },
      {
        "name": "wallet",
        "type": "text"
      },
      {
        "name": "red",
        "type": "text"
      },
      {
        "name": "tarifas",
        "type": "text"
      },
      {
        "name": "saldo_usdt",
        "type": "numeric"
      },
      {
        "name": "saldo_real",
        "type": "numeric"
      },
      {
        "name": "ingresos_usdt",
        "type": "numeric"
      },
      {
        "name": "egresos_usdt",
        "type": "numeric"
      },
      {
        "name": "rate_final",
        "type": "numeric"
      },
      {
        "name": "liquidez_esperada_cop",
        "type": "numeric"
      },
      {
        "name": "movimientos",
        "type": "jsonb"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "saldo_inicial",
        "type": "numeric"
      },
      {
        "name": "titular",
        "type": "text"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      },
      {
        "name": "institucion_id",
        "type": "uuid"
      },
      {
        "name": "tipo",
        "type": "text"
      },
      {
        "name": "pais",
        "type": "text"
      }
    ],
    "activos_liquidos": [
      {
        "name": "activo",
        "type": "text"
      },
      {
        "name": "institucion",
        "type": "text"
      },
      {
        "name": "titular",
        "type": "text"
      },
      {
        "name": "empresa",
        "type": "text"
      },
      {
        "name": "cuenta",
        "type": "text"
      },
      {
        "name": "divisa",
        "type": "text"
      },
      {
        "name": "tarifas",
        "type": "text"
      },
      {
        "name": "saldo_cop",
        "type": "numeric"
      },
      {
        "name": "saldo_real",
        "type": "numeric"
      },
      {
        "name": "ingresos_cop",
        "type": "numeric"
      },
      {
        "name": "egresos_cop",
        "type": "numeric"
      },
      {
        "name": "movimientos",
        "type": "jsonb"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "saldo_inicial",
        "type": "numeric"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      },
      {
        "name": "institucion_id",
        "type": "uuid"
      },
      {
        "name": "tipo",
        "type": "text"
      },
      {
        "name": "pais",
        "type": "text"
      },
      {
        "name": "api_id",
        "type": "text"
      }
    ],
    "app_versions": [
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "version",
        "type": "text"
      },
      {
        "name": "version_code",
        "type": "integer"
      },
      {
        "name": "title",
        "type": "text"
      },
      {
        "name": "summary",
        "type": "text"
      },
      {
        "name": "changes",
        "type": "jsonb"
      },
      {
        "name": "is_published",
        "type": "boolean"
      },
      {
        "name": "released_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      }
    ],
    "capital_movimientos": [
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "socio_id",
        "type": "uuid"
      },
      {
        "name": "fecha",
        "type": "date"
      },
      {
        "name": "tipo",
        "type": "text"
      },
      {
        "name": "monto",
        "type": "numeric"
      },
      {
        "name": "tasa",
        "type": "numeric"
      },
      {
        "name": "monto_cop",
        "type": "numeric"
      },
      {
        "name": "medio",
        "type": "text"
      },
      {
        "name": "cuenta_liquida_id",
        "type": "uuid"
      },
      {
        "name": "cuenta_digital_id",
        "type": "uuid"
      },
      {
        "name": "contrato_id",
        "type": "uuid"
      },
      {
        "name": "condiciones",
        "type": "text"
      },
      {
        "name": "numero",
        "type": "bigint"
      },
      {
        "name": "codigo",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      }
    ],
    "capital_socios": [
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "nombre",
        "type": "text"
      },
      {
        "name": "tipo",
        "type": "text"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      }
    ],
    "cash_tokens": [
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "codigo",
        "type": "text"
      },
      {
        "name": "token_code",
        "type": "text"
      },
      {
        "name": "monto",
        "type": "numeric"
      },
      {
        "name": "divisa",
        "type": "text"
      },
      {
        "name": "referencia",
        "type": "text"
      },
      {
        "name": "estado",
        "type": "text"
      },
      {
        "name": "status",
        "type": "text"
      },
      {
        "name": "fecha",
        "type": "date"
      },
      {
        "name": "expires_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      },
      {
        "name": "redeemed_by",
        "type": "uuid"
      },
      {
        "name": "redeemed_by_name",
        "type": "text"
      },
      {
        "name": "redeemed_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "cancel_reason",
        "type": "text"
      },
      {
        "name": "cancelled_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "updated_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "efectivo_id",
        "type": "uuid"
      },
      {
        "name": "pago_codigo",
        "type": "text"
      }
    ],
    "client_shared_links": [
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "client_id",
        "type": "text"
      },
      {
        "name": "client_name",
        "type": "text"
      },
      {
        "name": "slug",
        "type": "text"
      },
      {
        "name": "pin",
        "type": "text"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "is_active",
        "type": "boolean"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      }
    ],
    "clientes": [
      {
        "name": "codigo",
        "type": "character varying"
      },
      {
        "name": "nombre",
        "type": "text"
      },
      {
        "name": "numero",
        "type": "integer"
      },
      {
        "name": "ingresos_cop",
        "type": "numeric"
      },
      {
        "name": "pagado_cop",
        "type": "numeric"
      },
      {
        "name": "pendiente_cop",
        "type": "numeric"
      },
      {
        "name": "saldo_cop",
        "type": "numeric"
      },
      {
        "name": "estado",
        "type": "character varying"
      },
      {
        "name": "fecha_creacion",
        "type": "timestamp with time zone"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "updated_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "pais",
        "type": "text"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      },
      {
        "name": "total_negocios",
        "type": "integer"
      }
    ],
    "comisionistas": [
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "codigo",
        "type": "character varying"
      },
      {
        "name": "numero",
        "type": "integer"
      },
      {
        "name": "cliente_id",
        "type": "uuid"
      },
      {
        "name": "referidos_ids",
        "type": "ARRAY"
      },
      {
        "name": "porcentaje_comision",
        "type": "numeric"
      },
      {
        "name": "ingresos_cop",
        "type": "numeric"
      },
      {
        "name": "comisiones_cop",
        "type": "numeric"
      },
      {
        "name": "fecha_creacion",
        "type": "timestamp with time zone"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      }
    ],
    "compras_usdt": [
      {
        "name": "codigo",
        "type": "text"
      },
      {
        "name": "numero",
        "type": "integer"
      },
      {
        "name": "fecha",
        "type": "date"
      },
      {
        "name": "divisa_codigo",
        "type": "text"
      },
      {
        "name": "valor_comprado",
        "type": "numeric"
      },
      {
        "name": "usdt_comprado",
        "type": "numeric"
      },
      {
        "name": "tasa",
        "type": "numeric"
      },
      {
        "name": "costo",
        "type": "numeric"
      },
      {
        "name": "wallet_destino",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "wallet_destino_id",
        "type": "text"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      },
      {
        "name": "proveedor",
        "type": "text"
      },
      {
        "name": "estado",
        "type": "text"
      },
      {
        "name": "saldo_compra_aplicado",
        "type": "boolean"
      },
      {
        "name": "fecha_recibido",
        "type": "timestamp with time zone"
      },
      {
        "name": "recibido_por",
        "type": "uuid"
      }
    ],
    "dispersiones": [
      {
        "name": "codigo",
        "type": "text"
      },
      {
        "name": "numero",
        "type": "integer"
      },
      {
        "name": "fecha",
        "type": "timestamp with time zone"
      },
      {
        "name": "cliente_id",
        "type": "uuid"
      },
      {
        "name": "cliente_codigo",
        "type": "character varying"
      },
      {
        "name": "cliente_nombre",
        "type": "character varying"
      },
      {
        "name": "monto",
        "type": "numeric"
      },
      {
        "name": "monto_cop",
        "type": "numeric"
      },
      {
        "name": "origen_fondos",
        "type": "text"
      },
      {
        "name": "referencia",
        "type": "character varying"
      },
      {
        "name": "estado",
        "type": "character varying"
      },
      {
        "name": "tiene_comprobante",
        "type": "boolean"
      },
      {
        "name": "comprobante_url",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "origen_fondos_id",
        "type": "text"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      },
      {
        "name": "saldo_origen_aplicado",
        "type": "boolean"
      },
      {
        "name": "costo_cop",
        "type": "numeric"
      },
      {
        "name": "costo_origen_aplicado",
        "type": "boolean"
      }
    ],
    "divisas": [
      {
        "name": "codigo",
        "type": "character varying"
      },
      {
        "name": "divisa",
        "type": "character varying"
      },
      {
        "name": "nombre_divisa",
        "type": "character varying"
      },
      {
        "name": "pais",
        "type": "text"
      },
      {
        "name": "bandera_url",
        "type": "character varying"
      },
      {
        "name": "total_recibido",
        "type": "numeric"
      },
      {
        "name": "total_comprado",
        "type": "numeric"
      },
      {
        "name": "total_pendiente",
        "type": "numeric"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "_nc_ph_ckz5aoc0tw3da0f",
        "type": "text"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      }
    ],
    "efectivo": [
      {
        "name": "codigo",
        "type": "text"
      },
      {
        "name": "fecha",
        "type": "date"
      },
      {
        "name": "tipo",
        "type": "text"
      },
      {
        "name": "cliente_id",
        "type": "uuid"
      },
      {
        "name": "cliente_codigo",
        "type": "character varying"
      },
      {
        "name": "cliente_nombre",
        "type": "character varying"
      },
      {
        "name": "monto",
        "type": "numeric"
      },
      {
        "name": "origen_fondos",
        "type": "text"
      },
      {
        "name": "referencia",
        "type": "character varying"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "origen_fondos_id",
        "type": "text"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      },
      {
        "name": "comision_cop",
        "type": "numeric"
      }
    ],
    "gastos": [
      {
        "name": "codigo",
        "type": "text"
      },
      {
        "name": "fecha",
        "type": "date"
      },
      {
        "name": "concepto",
        "type": "character varying"
      },
      {
        "name": "categoria",
        "type": "text"
      },
      {
        "name": "divisa",
        "type": "text"
      },
      {
        "name": "monto",
        "type": "numeric"
      },
      {
        "name": "origen_fondos",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "comprobante_url",
        "type": "text"
      },
      {
        "name": "origen_fondos_id",
        "type": "text"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      }
    ],
    "historial_ganancia_diaria": [
      {
        "name": "fecha",
        "type": "date"
      },
      {
        "name": "ganancia_cop",
        "type": "numeric"
      },
      {
        "name": "registrado_en",
        "type": "timestamp with time zone"
      }
    ],
    "instituciones": [
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "name",
        "type": "text"
      },
      {
        "name": "type",
        "type": "text"
      },
      {
        "name": "currency",
        "type": "text"
      },
      {
        "name": "divisa_id",
        "type": "uuid"
      },
      {
        "name": "country",
        "type": "text"
      },
      {
        "name": "website_url",
        "type": "text"
      },
      {
        "name": "logo_url",
        "type": "text"
      },
      {
        "name": "status",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "updated_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      },
      {
        "name": "color",
        "type": "text"
      }
    ],
    "negocios": [
      {
        "name": "codigo",
        "type": "text"
      },
      {
        "name": "numero",
        "type": "integer"
      },
      {
        "name": "fecha",
        "type": "date"
      },
      {
        "name": "cliente_id",
        "type": "uuid"
      },
      {
        "name": "cliente_codigo",
        "type": "character varying"
      },
      {
        "name": "cliente_nombre",
        "type": "character varying"
      },
      {
        "name": "divisa_codigo",
        "type": "character varying"
      },
      {
        "name": "monto_divisa",
        "type": "numeric"
      },
      {
        "name": "tasa",
        "type": "numeric"
      },
      {
        "name": "tasa_cliente_cop",
        "type": "numeric"
      },
      {
        "name": "ingreso_cop",
        "type": "numeric"
      },
      {
        "name": "monto_cop",
        "type": "numeric"
      },
      {
        "name": "usdt_por_divisa",
        "type": "numeric"
      },
      {
        "name": "costo_usdt_comp",
        "type": "numeric"
      },
      {
        "name": "estado",
        "type": "character varying"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      }
    ],
    "profiles": [
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "email",
        "type": "text"
      },
      {
        "name": "full_name",
        "type": "text"
      },
      {
        "name": "role",
        "type": "text"
      },
      {
        "name": "onboarding_completed",
        "type": "boolean"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "updated_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "authorized_currencies",
        "type": "ARRAY"
      },
      {
        "name": "status",
        "type": "text"
      },
      {
        "name": "is_super_admin",
        "type": "boolean"
      },
      {
        "name": "pais",
        "type": "text"
      },
      {
        "name": "operator_code",
        "type": "text"
      },
      {
        "name": "two_factor_enabled",
        "type": "boolean"
      },
      {
        "name": "two_factor_backup_codes",
        "type": "ARRAY"
      },
      {
        "name": "two_factor_secret",
        "type": "text"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      },
      {
        "name": "biometric_credentials",
        "type": "jsonb"
      }
    ],
    "push_subscriptions": [
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "user_id",
        "type": "uuid"
      },
      {
        "name": "endpoint",
        "type": "text"
      },
      {
        "name": "p256dh",
        "type": "text"
      },
      {
        "name": "auth",
        "type": "text"
      },
      {
        "name": "device_type",
        "type": "text"
      },
      {
        "name": "user_agent",
        "type": "text"
      },
      {
        "name": "last_push_version",
        "type": "text"
      },
      {
        "name": "last_push_version_code",
        "type": "integer"
      },
      {
        "name": "is_active",
        "type": "boolean"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "updated_at",
        "type": "timestamp with time zone"
      }
    ],
    "resumen_liquidacion": [
      {
        "name": "total_negocio_cop",
        "type": "numeric"
      },
      {
        "name": "total_ventas_usdt_cop",
        "type": "numeric"
      },
      {
        "name": "total_liquidez_esperada_cop",
        "type": "numeric"
      },
      {
        "name": "ganancia_esperada_cop",
        "type": "numeric"
      },
      {
        "name": "total_activos_digitales_usdt",
        "type": "numeric"
      },
      {
        "name": "total_activos_liquidos_cop",
        "type": "numeric"
      },
      {
        "name": "total_saldo_pendiente_clientes_cop",
        "type": "numeric"
      },
      {
        "name": "total_gastos_cop",
        "type": "numeric"
      },
      {
        "name": "updated_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      },
      {
        "name": "rate_usdt_cop",
        "type": "numeric"
      },
      {
        "name": "total_costos_dispersion_cop",
        "type": "numeric"
      },
      {
        "name": "saldo_neto_clientes_cop",
        "type": "numeric"
      },
      {
        "name": "total_capital_invertido_cop",
        "type": "numeric"
      }
    ],
    "transferencias_internas": [
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "codigo",
        "type": "text"
      },
      {
        "name": "fecha",
        "type": "date"
      },
      {
        "name": "tipo_origen",
        "type": "text"
      },
      {
        "name": "origen_id",
        "type": "uuid"
      },
      {
        "name": "origen_nombre",
        "type": "text"
      },
      {
        "name": "tipo_destino",
        "type": "text"
      },
      {
        "name": "destino_id",
        "type": "uuid"
      },
      {
        "name": "destino_nombre",
        "type": "text"
      },
      {
        "name": "monto",
        "type": "numeric"
      },
      {
        "name": "divisa_origen",
        "type": "text"
      },
      {
        "name": "monto_destino",
        "type": "numeric"
      },
      {
        "name": "divisa_destino",
        "type": "text"
      },
      {
        "name": "tasa",
        "type": "numeric"
      },
      {
        "name": "costo",
        "type": "numeric"
      },
      {
        "name": "divisa_costo",
        "type": "text"
      },
      {
        "name": "concepto",
        "type": "text"
      },
      {
        "name": "notas",
        "type": "text"
      },
      {
        "name": "comprobante_url",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      }
    ],
    "user_version_confirmations": [
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "user_id",
        "type": "uuid"
      },
      {
        "name": "version_id",
        "type": "uuid"
      },
      {
        "name": "version_code",
        "type": "integer"
      },
      {
        "name": "confirmed_at",
        "type": "timestamp with time zone"
      }
    ],
    "ventas_usdt": [
      {
        "name": "codigo",
        "type": "text"
      },
      {
        "name": "numero",
        "type": "integer"
      },
      {
        "name": "fecha",
        "type": "date"
      },
      {
        "name": "concepto",
        "type": "text"
      },
      {
        "name": "usdt_vendido",
        "type": "numeric"
      },
      {
        "name": "tasa",
        "type": "numeric"
      },
      {
        "name": "total_cop",
        "type": "numeric"
      },
      {
        "name": "wallet_origen",
        "type": "text"
      },
      {
        "name": "destino_fondos_nombre",
        "type": "text"
      },
      {
        "name": "created_at",
        "type": "timestamp with time zone"
      },
      {
        "name": "id",
        "type": "uuid"
      },
      {
        "name": "wallet_origen_id",
        "type": "text"
      },
      {
        "name": "destino_fondos_id",
        "type": "text"
      },
      {
        "name": "created_by",
        "type": "uuid"
      },
      {
        "name": "created_by_name",
        "type": "text"
      },
      {
        "name": "created_at_audit",
        "type": "timestamp with time zone"
      },
      {
        "name": "fee_usdt",
        "type": "numeric"
      },
      {
        "name": "saldo_venta_aplicado",
        "type": "boolean"
      },
      {
        "name": "estado",
        "type": "text"
      },
      {
        "name": "fecha_recibido",
        "type": "timestamp with time zone"
      },
      {
        "name": "recibido_por",
        "type": "uuid"
      }
    ]
  },
  "relationships": [
    {
      "table_name": "_nc_m2m_negocios_divisas",
      "name": "fk_negocios_divisas_ja48563uq4",
      "definition": "FOREIGN KEY (negocios_id) REFERENCES negocios(id) ON UPDATE CASCADE ON DELETE CASCADE"
    },
    {
      "table_name": "_nc_m2m_negocios_divisas",
      "name": "fk_negocios_divisas_noq9vfbmyj",
      "definition": "FOREIGN KEY (divisas_id) REFERENCES divisas(id) ON UPDATE CASCADE ON DELETE CASCADE"
    },
    {
      "table_name": "activos_digitales",
      "name": "activos_digitales_institucion_id_fkey",
      "definition": "FOREIGN KEY (institucion_id) REFERENCES instituciones(id) ON DELETE SET NULL"
    },
    {
      "table_name": "activos_liquidos",
      "name": "activos_liquidos_institucion_id_fkey",
      "definition": "FOREIGN KEY (institucion_id) REFERENCES instituciones(id) ON DELETE SET NULL"
    },
    {
      "table_name": "capital_movimientos",
      "name": "capital_movimientos_contrato_id_fkey",
      "definition": "FOREIGN KEY (contrato_id) REFERENCES capital_movimientos(id)"
    },
    {
      "table_name": "capital_movimientos",
      "name": "capital_movimientos_cuenta_digital_id_fkey",
      "definition": "FOREIGN KEY (cuenta_digital_id) REFERENCES activos_digitales(id)"
    },
    {
      "table_name": "capital_movimientos",
      "name": "capital_movimientos_cuenta_liquida_id_fkey",
      "definition": "FOREIGN KEY (cuenta_liquida_id) REFERENCES activos_liquidos(id)"
    },
    {
      "table_name": "capital_movimientos",
      "name": "capital_movimientos_socio_id_fkey",
      "definition": "FOREIGN KEY (socio_id) REFERENCES capital_socios(id)"
    },
    {
      "table_name": "cash_tokens",
      "name": "cash_tokens_created_by_fkey",
      "definition": "FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL"
    },
    {
      "table_name": "cash_tokens",
      "name": "cash_tokens_efectivo_id_fkey",
      "definition": "FOREIGN KEY (efectivo_id) REFERENCES efectivo(id) ON DELETE SET NULL"
    },
    {
      "table_name": "cash_tokens",
      "name": "cash_tokens_redeemed_by_fkey",
      "definition": "FOREIGN KEY (redeemed_by) REFERENCES profiles(id) ON DELETE SET NULL"
    },
    {
      "table_name": "client_shared_links",
      "name": "client_shared_links_created_by_fkey",
      "definition": "FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL"
    },
    {
      "table_name": "comisionistas",
      "name": "comisionistas_cliente_id_fkey",
      "definition": "FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON UPDATE CASCADE ON DELETE SET NULL"
    },
    {
      "table_name": "compras_usdt",
      "name": "compras_usdt_recibido_por_fkey",
      "definition": "FOREIGN KEY (recibido_por) REFERENCES auth.users(id)"
    },
    {
      "table_name": "dispersiones",
      "name": "fk_dispersiones_cliente",
      "definition": "FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON UPDATE CASCADE ON DELETE SET NULL"
    },
    {
      "table_name": "efectivo",
      "name": "fk_efectivo_cliente",
      "definition": "FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON UPDATE CASCADE ON DELETE SET NULL"
    },
    {
      "table_name": "instituciones",
      "name": "instituciones_divisa_id_fkey",
      "definition": "FOREIGN KEY (divisa_id) REFERENCES divisas(id) ON UPDATE CASCADE ON DELETE SET NULL"
    },
    {
      "table_name": "negocios",
      "name": "fk_negocios_cliente",
      "definition": "FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON UPDATE CASCADE ON DELETE SET NULL"
    },
    {
      "table_name": "profiles",
      "name": "profiles_id_fkey",
      "definition": "FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE"
    },
    {
      "table_name": "push_subscriptions",
      "name": "push_subscriptions_user_id_fkey",
      "definition": "FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE"
    },
    {
      "table_name": "transferencias_internas",
      "name": "transferencias_internas_created_by_fkey",
      "definition": "FOREIGN KEY (created_by) REFERENCES auth.users(id)"
    },
    {
      "table_name": "user_version_confirmations",
      "name": "user_version_confirmations_user_id_fkey",
      "definition": "FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE"
    },
    {
      "table_name": "user_version_confirmations",
      "name": "user_version_confirmations_version_id_fkey",
      "definition": "FOREIGN KEY (version_id) REFERENCES app_versions(id) ON DELETE CASCADE"
    },
    {
      "table_name": "ventas_usdt",
      "name": "ventas_usdt_recibido_por_fkey",
      "definition": "FOREIGN KEY (recibido_por) REFERENCES auth.users(id)"
    }
  ],
  "functions": [
    {
      "schema": "kaupaloki_private",
      "name": "actualizar_o_eliminar_movimiento_capital",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 4964
    },
    {
      "schema": "kaupaloki_private",
      "name": "aplicar_movimiento_capital",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 4250
    },
    {
      "schema": "kaupaloki_private",
      "name": "aplicar_tasa_liquidacion",
      "arguments": "p_rate numeric",
      "returns": "void",
      "security_definer": true,
      "source_length": 1072
    },
    {
      "schema": "kaupaloki_private",
      "name": "bloquear_operacion_usdt",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 70
    },
    {
      "schema": "kaupaloki_private",
      "name": "calcular_ganancia_liquidacion",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 442
    },
    {
      "schema": "kaupaloki_private",
      "name": "capturar_ganancia_al_liquidar",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 83
    },
    {
      "schema": "kaupaloki_private",
      "name": "capturar_ganancia_diaria",
      "arguments": "",
      "returns": "void",
      "security_definer": true,
      "source_length": 719
    },
    {
      "schema": "kaupaloki_private",
      "name": "contabilizar_compra_usdt",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 3542
    },
    {
      "schema": "kaupaloki_private",
      "name": "contabilizar_efectivo",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 2099
    },
    {
      "schema": "kaupaloki_private",
      "name": "contabilizar_gasto",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 2733
    },
    {
      "schema": "kaupaloki_private",
      "name": "contabilizar_saldo_origen_dispersion",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 2599
    },
    {
      "schema": "kaupaloki_private",
      "name": "contabilizar_venta_usdt",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 3487
    },
    {
      "schema": "kaupaloki_private",
      "name": "editar_saldos_usdt",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 2684
    },
    {
      "schema": "kaupaloki_private",
      "name": "lincoin_request",
      "arguments": "p_method text, p_cred jsonb",
      "returns": "http_response",
      "security_definer": false,
      "source_length": 1510
    },
    {
      "schema": "kaupaloki_private",
      "name": "normalizar_divisas_por_rol",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 310
    },
    {
      "schema": "kaupaloki_private",
      "name": "proteger_costo_capital",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 716
    },
    {
      "schema": "kaupaloki_private",
      "name": "puede_operar_divisa",
      "arguments": "p_code text",
      "returns": "boolean",
      "security_definer": true,
      "source_length": 585
    },
    {
      "schema": "kaupaloki_private",
      "name": "read_lincoin_balances",
      "arguments": "",
      "returns": "jsonb",
      "security_definer": true,
      "source_length": 1115
    },
    {
      "schema": "kaupaloki_private",
      "name": "registrar_saldos_usdt",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 1953
    },
    {
      "schema": "kaupaloki_private",
      "name": "reiniciar_operacion",
      "arguments": "p_confirmacion text",
      "returns": "void",
      "security_definer": false,
      "source_length": 2191
    },
    {
      "schema": "kaupaloki_private",
      "name": "sincronizar_token_pago",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 1481
    },
    {
      "schema": "kaupaloki_private",
      "name": "staff_role",
      "arguments": "",
      "returns": "text",
      "security_definer": true,
      "source_length": 726
    },
    {
      "schema": "kaupaloki_private",
      "name": "sync_lincoin",
      "arguments": "",
      "returns": "void",
      "security_definer": false,
      "source_length": 3656
    },
    {
      "schema": "kaupaloki_private",
      "name": "validar_institucion_activo",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 1047
    },
    {
      "schema": "kaupaloki_private",
      "name": "validar_token_pago",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 2351
    },
    {
      "schema": "public",
      "name": "abrir_portal_cliente",
      "arguments": "p_token uuid, p_pin text",
      "returns": "jsonb",
      "security_definer": true,
      "source_length": 3638
    },
    {
      "schema": "public",
      "name": "activar_perfil_invitado",
      "arguments": "",
      "returns": "boolean",
      "security_definer": true,
      "source_length": 224
    },
    {
      "schema": "public",
      "name": "actualizar_perfil_dashboard",
      "arguments": "p_id uuid, p_changes jsonb",
      "returns": "boolean",
      "security_definer": true,
      "source_length": 2394
    },
    {
      "schema": "public",
      "name": "actualizar_rate_usdt",
      "arguments": "p_rate numeric",
      "returns": "void",
      "security_definer": false,
      "source_length": 62
    },
    {
      "schema": "public",
      "name": "adjuntar_comprobante_gasto",
      "arguments": "p_id text, p_receipt text",
      "returns": "boolean",
      "security_definer": true,
      "source_length": 591
    },
    {
      "schema": "public",
      "name": "admin_restablecer_2fa",
      "arguments": "target_user_id uuid",
      "returns": "boolean",
      "security_definer": true,
      "source_length": 759
    },
    {
      "schema": "public",
      "name": "confirm_versions",
      "arguments": "p_version_ids uuid[]",
      "returns": "integer",
      "security_definer": true,
      "source_length": 617
    },
    {
      "schema": "public",
      "name": "crear_enlace_cliente",
      "arguments": "p_client_id text",
      "returns": "jsonb",
      "security_definer": true,
      "source_length": 1105
    },
    {
      "schema": "public",
      "name": "crear_negocio_dashboard",
      "arguments": "p_id uuid, p_cliente_id uuid, p_divisa_codigo text, p_fecha date, p_monto numeric, p_tasa numeric, p_codigo text",
      "returns": "uuid",
      "security_definer": false,
      "source_length": 1160
    },
    {
      "schema": "public",
      "name": "cuentas_para_dispersion",
      "arguments": "",
      "returns": "TABLE(id text, activo text, institucion text, cuenta text, titular text, divisa text, \"saldoReal\" numeric, \"saldoCop\" numeric)",
      "security_definer": true,
      "source_length": 515
    },
    {
      "schema": "public",
      "name": "eliminar_perfil_dashboard",
      "arguments": "p_id uuid",
      "returns": "boolean",
      "security_definer": true,
      "source_length": 755
    },
    {
      "schema": "public",
      "name": "emitir_token_pago_efectivo",
      "arguments": "p_pago_id uuid",
      "returns": "cash_tokens",
      "security_definer": false,
      "source_length": 954
    },
    {
      "schema": "public",
      "name": "fn_aplicar_transferencia_interna",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 3314
    },
    {
      "schema": "public",
      "name": "fn_divisas_sync_instituciones",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 182
    },
    {
      "schema": "public",
      "name": "fn_instituciones_sync_divisa",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 211
    },
    {
      "schema": "public",
      "name": "fn_recalculate_financial_aggregates",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 5212
    },
    {
      "schema": "public",
      "name": "get_invited_user_info",
      "arguments": "p_email text",
      "returns": "jsonb",
      "security_definer": true,
      "source_length": 254
    },
    {
      "schema": "public",
      "name": "get_pending_push_summary",
      "arguments": "p_user_id uuid",
      "returns": "jsonb",
      "security_definer": true,
      "source_length": 2080
    },
    {
      "schema": "public",
      "name": "get_pending_versions_for_current_user",
      "arguments": "",
      "returns": "SETOF app_versions",
      "security_definer": true,
      "source_length": 260
    },
    {
      "schema": "public",
      "name": "guardar_comprobante_dashboard",
      "arguments": "p_table text, p_id uuid, p_receipt text, p_previous text",
      "returns": "void",
      "security_definer": true,
      "source_length": 2189
    },
    {
      "schema": "public",
      "name": "guardar_comprobante_dispersion",
      "arguments": "p_id text, p_receipt text, p_previous text",
      "returns": "boolean",
      "security_definer": true,
      "source_length": 758
    },
    {
      "schema": "public",
      "name": "handle_new_user",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 1457
    },
    {
      "schema": "public",
      "name": "ingresos_clientes_30_dias",
      "arguments": "",
      "returns": "TABLE(fecha date, monto_cop numeric)",
      "security_definer": false,
      "source_length": 966
    },
    {
      "schema": "public",
      "name": "ingresos_mensuales_inicio",
      "arguments": "",
      "returns": "TABLE(mes date, monto_cop numeric)",
      "security_definer": false,
      "source_length": 1128
    },
    {
      "schema": "public",
      "name": "lincoin_balances",
      "arguments": "",
      "returns": "jsonb",
      "security_definer": false,
      "source_length": 53
    },
    {
      "schema": "public",
      "name": "listar_comisionistas_dashboard",
      "arguments": "",
      "returns": "SETOF comisionistas",
      "security_definer": false,
      "source_length": 191
    },
    {
      "schema": "public",
      "name": "listar_perfiles_dashboard",
      "arguments": "",
      "returns": "jsonb",
      "security_definer": true,
      "source_length": 433
    },
    {
      "schema": "public",
      "name": "marcar_compra_usdt_pendiente",
      "arguments": "p_compra_id uuid",
      "returns": "jsonb",
      "security_definer": true,
      "source_length": 566
    },
    {
      "schema": "public",
      "name": "marcar_compra_usdt_recibida",
      "arguments": "p_compra_id uuid",
      "returns": "jsonb",
      "security_definer": true,
      "source_length": 584
    },
    {
      "schema": "public",
      "name": "marcar_venta_usdt_pendiente",
      "arguments": "p_venta_id uuid",
      "returns": "jsonb",
      "security_definer": true,
      "source_length": 560
    },
    {
      "schema": "public",
      "name": "marcar_venta_usdt_recibida",
      "arguments": "p_venta_id uuid",
      "returns": "jsonb",
      "security_definer": true,
      "source_length": 578
    },
    {
      "schema": "public",
      "name": "mask_client_code_for_portal",
      "arguments": "p_codigo text, p_nombre text",
      "returns": "text",
      "security_definer": false,
      "source_length": 1067
    },
    {
      "schema": "public",
      "name": "obtener_enlace_cliente",
      "arguments": "p_client_id text",
      "returns": "jsonb",
      "security_definer": true,
      "source_length": 712
    },
    {
      "schema": "public",
      "name": "record_push_version_sent",
      "arguments": "p_user_id uuid, p_highest_version_code integer, p_version text",
      "returns": "void",
      "security_definer": true,
      "source_length": 286
    },
    {
      "schema": "public",
      "name": "registrar_autor_creacion",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 2668
    },
    {
      "schema": "public",
      "name": "registrar_pago_con_token",
      "arguments": "p_pago jsonb",
      "returns": "cash_tokens",
      "security_definer": false,
      "source_length": 1165
    },
    {
      "schema": "public",
      "name": "restablecer_mi_2fa",
      "arguments": "",
      "returns": "boolean",
      "security_definer": true,
      "source_length": 336
    },
    {
      "schema": "public",
      "name": "sync_negocio_divisa",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 369
    },
    {
      "schema": "public",
      "name": "trg_cash_tokens_auto_fill",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 966
    },
    {
      "schema": "public",
      "name": "trg_clientes_auto_fill",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 933
    },
    {
      "schema": "public",
      "name": "trg_comisionistas_auto_fill",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 1076
    },
    {
      "schema": "public",
      "name": "trg_compras_usdt_auto_fill",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 917
    },
    {
      "schema": "public",
      "name": "trg_dispersiones_auto_fill",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 1044
    },
    {
      "schema": "public",
      "name": "trg_efectivo_auto_fill",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 961
    },
    {
      "schema": "public",
      "name": "trg_gastos_auto_fill",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 613
    },
    {
      "schema": "public",
      "name": "trg_negocios_auto_fill",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 698
    },
    {
      "schema": "public",
      "name": "trg_profiles_auto_fill",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 1589
    },
    {
      "schema": "public",
      "name": "trg_profiles_enforce_uppercase",
      "arguments": "",
      "returns": "trigger",
      "security_definer": true,
      "source_length": 149
    },
    {
      "schema": "public",
      "name": "trg_ventas_usdt_auto_fill",
      "arguments": "",
      "returns": "trigger",
      "security_definer": false,
      "source_length": 719
    }
  ],
  "formulas": [
    {
      "schema": "public",
      "name": "registrar_autor_creacion",
      "definition": "CREATE OR REPLACE FUNCTION public.registrar_autor_creacion()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\r\ndeclare\r\n  actor uuid := auth.uid();\r\n  historical_author text;\r\nbegin\r\n  if tg_op = 'INSERT' and auth.role() = 'anon' then\r\n    raise insufficient_privilege using message = 'Se requiere una sesión para crear registros';\r\n  end if;\r\n\r\n  if tg_op = 'UPDATE' then\r\n    if tg_table_name = 'negocios' and old.created_by is null\r\n       and nullif(btrim(old.created_by_name), '') is null and new.created_by is not null then\r\n      if actor is null or not exists (\r\n        select 1 from public.profiles p\r\n        where p.id = actor and p.role in ('administrador', 'super_admin')\r\n          and coalesce(lower(p.status::text), '') not in ('inactivo', 'inactive', 'invitado', 'invited')\r\n      ) then\r\n        raise insufficient_privilege using message = 'Solo un administrador puede asignar un autor histórico';\r\n      end if;\r\n\r\n      select coalesce(nullif(btrim(p.full_name), ''), p.id::text) into historical_author\r\n      from public.profiles p\r\n      where p.id = new.created_by and p.role in ('administrador', 'super_admin', 'operador', 'dispersor', 'comercial', 'supervisor');\r\n\r\n      if historical_author is null then\r\n        raise foreign_key_violation using message = 'El autor seleccionado no está disponible';\r\n      end if;\r\n\r\n      new.created_by_name := historical_author;\r\n      new.created_at_audit := old.created_at_audit;\r\n      return new;\r\n    end if;\r\n\r\n    -- Profiles created during invite or backfill can have created_by assigned when null\r\n    if tg_table_name = 'profiles' and old.created_by is null and new.created_by is not null then\r\n      select nullif(btrim(p.full_name), '') into historical_author\r\n      from public.profiles p where p.id = new.created_by;\r\n      new.created_by_name := coalesce(historical_author, new.created_by::text);\r\n      new.created_at_audit := coalesce(old.created_at_audit, statement_timestamp());\r\n      return new;\r\n    end if;\r\n\r\n    if tg_table_name <> 'profiles' or old.created_by is not null or new.created_by is null then\r\n      new.created_by := old.created_by;\r\n      new.created_by_name := old.created_by_name;\r\n      new.created_at_audit := old.created_at_audit;\r\n      return new;\r\n    end if;\r\n  end if;\r\n\r\n  if tg_table_name = 'profiles' and auth.role() = 'service_role' then\r\n    actor := coalesce(actor, new.created_by);\r\n  end if;\r\n\r\n  new.created_by := actor;\r\n  new.created_by_name := null;\r\n  new.created_at_audit := statement_timestamp();\r\n  if actor is not null then\r\n    select nullif(btrim(p.full_name), '') into new.created_by_name\r\n    from public.profiles p where p.id = actor;\r\n    new.created_by_name := coalesce(new.created_by_name, actor::text);\r\n  end if;\r\n  return new;\r\nend;\r\n$function$\n"
    },
    {
      "schema": "kaupaloki_private",
      "name": "aplicar_tasa_liquidacion",
      "definition": "CREATE OR REPLACE FUNCTION kaupaloki_private.aplicar_tasa_liquidacion(p_rate numeric)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public', 'kaupaloki_private'\nAS $function$\nBEGIN\n  IF COALESCE(kaupaloki_private.staff_role(), '') NOT IN ('administrador', 'super_admin') THEN\n    RAISE insufficient_privilege;\n  END IF;\n  IF p_rate IS NULL OR p_rate <= 0 OR p_rate::text IN ('NaN', 'Infinity') THEN\n    RAISE EXCEPTION 'La tasa debe ser un número mayor que cero' USING ERRCODE = '22023';\n  END IF;\n\n  -- 1. Actualizar tasa en contratos de capital que se depositaron en USDT\n  UPDATE public.capital_movimientos\n  SET tasa = p_rate\n  WHERE medio = 'USDT' AND tipo = 'CONTRATO';\n\n  -- 2. Actualizar resumen de liquidación con la nueva tasa (el trigger recalculará capital invertido y ganancia)\n  UPDATE public.resumen_liquidacion r\n  SET rate_usdt_cop = p_rate,\n      total_activos_liquidos_cop = (SELECT COALESCE(SUM(saldo_cop), 0) FROM public.activos_liquidos WHERE id IS NOT NULL),\n      total_liquidez_esperada_cop = COALESCE(r.total_activos_digitales_usdt, 0) * p_rate,\n      updated_at = now()\n  WHERE r.id IS NOT NULL;\n  IF NOT FOUND THEN\n    RAISE EXCEPTION 'No se encontró el resumen de liquidación' USING ERRCODE = 'P0002';\n  END IF;\nEND;\n$function$\n"
    },
    {
      "schema": "kaupaloki_private",
      "name": "aplicar_movimiento_capital",
      "definition": "CREATE OR REPLACE FUNCTION kaupaloki_private.aplicar_movimiento_capital()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\ndeclare\n  socio_tipo text;\n  socio_nombre text;\n  disponible numeric;\n  importe numeric;\n  delta numeric;\nbegin\n  if auth.uid() is null or coalesce(kaupaloki_private.staff_role(), '') not in ('administrador', 'super_admin') then\n    raise insufficient_privilege;\n  end if;\n\n  -- Auto-assign rate from manual USDT rate if adding a contract in USDT without explicit rate\n  if new.medio = 'USDT' and (new.tasa is null or new.tasa <= 0) then\n    select rate_usdt_cop into new.tasa from public.resumen_liquidacion limit 1;\n    new.tasa := coalesce(new.tasa, 3950);\n  end if;\n\n  -- Serialize obligations for each person before checking their available balance.\n  select tipo, nombre into socio_tipo, socio_nombre from public.capital_socios where id = new.socio_id for no key update;\n  if not found then raise exception 'El socio o inversionista no está disponible.'; end if;\n  if new.tipo = 'DIVIDENDO' and socio_tipo <> 'SOCIO' then\n    raise exception 'Los dividendos solo se registran para socios.';\n  end if;\n\n  if new.contrato_id is not null then\n    select contrato.monto_cop - coalesce((\n      select sum(retiro.monto_cop) from public.capital_movimientos retiro\n      where retiro.contrato_id = contrato.id and retiro.tipo = 'RETIRO' and retiro.id <> new.id\n    ), 0) into disponible\n    from public.capital_movimientos contrato\n    where contrato.id = new.contrato_id and contrato.tipo = 'CONTRATO'\n      and contrato.socio_id = new.socio_id and contrato.fecha <= new.fecha;\n    if not found then raise exception 'Selecciona un contrato de esta persona con fecha válida.'; end if;\n    if new.tipo = 'RETIRO' and new.monto_cop > disponible then\n      raise exception 'El retiro supera el capital disponible del contrato.';\n    end if;\n  end if;\n\n  if new.tipo in ('LIQUIDACION','ADELANTO') or (new.tipo = 'INTERES' and new.medio is not null) then\n    select coalesce(sum(case\n      when tipo = 'DIVIDENDO' or (tipo = 'INTERES' and medio is null) then monto_cop\n      when tipo in ('LIQUIDACION','ADELANTO') then -monto_cop\n      else 0 end), 0) into disponible\n    from public.capital_movimientos where socio_id = new.socio_id and id <> new.id;\n    if new.tipo = 'LIQUIDACION' and new.monto_cop > disponible then\n      raise exception 'El monto supera el saldo disponible. Para adelantar rendimientos, usa Adelantar.';\n    end if;\n    if new.tipo = 'INTERES' and disponible < 0 then\n      raise exception 'Acredita el interés al saldo para compensar el adelanto antes de pagar.';\n    end if;\n    if new.tipo = 'ADELANTO' and new.monto_cop <= disponible then\n      raise exception 'El saldo ya cubre ese monto. Usa Liquidar.';\n    end if;\n  end if;\n\n  if new.medio is not null then\n    importe := new.monto;\n    delta := case when new.tipo = 'CONTRATO' then importe else -importe end;\n    if new.medio = 'USDT' then\n      update public.activos_digitales\n      set saldo_usdt = coalesce(saldo_usdt, 0) + delta,\n          ingresos_usdt = coalesce(ingresos_usdt, 0) + greatest(delta, 0),\n          egresos_usdt = coalesce(egresos_usdt, 0) + greatest(-delta, 0)\n      where id = new.cuenta_digital_id and (delta > 0 or coalesce(saldo_usdt, 0) >= importe);\n    else\n      update public.activos_liquidos\n      set saldo_cop = coalesce(saldo_cop, 0) + delta,\n          ingresos_cop = coalesce(ingresos_cop, 0) + greatest(delta, 0),\n          egresos_cop = coalesce(egresos_cop, 0) + greatest(-delta, 0)\n      where id = new.cuenta_liquida_id and coalesce(divisa, 'COP') = 'COP'\n        and ((upper(coalesce(institucion, '')) = 'EFECTIVO' or upper(coalesce(activo, '')) like '%EFECTIVO%') = (new.medio = 'EFECTIVO'))\n        and (delta > 0 or coalesce(saldo_cop, 0) >= importe);\n    end if;\n    if not found then raise exception 'La cuenta no está disponible o su saldo contable es insuficiente.'; end if;\n  end if;\n\n  if new.tipo = 'INTERES' then\n    insert into public.gastos(id, fecha, concepto, categoria, divisa, monto, origen_fondos)\n      values(new.id, new.fecha, 'Intereses · Capital & Socios' || coalesce(' · ' || nullif(btrim(socio_nombre), ''), ''), 'Gastos Financieros y Bancarios', 'COP', new.monto_cop, 'Capital & Socios');\n  elsif new.medio is not null then\n    update public.gastos set monto=monto where false;\n  end if;\n  return new;\nend;\n$function$\n"
    },
    {
      "schema": "public",
      "name": "fn_aplicar_transferencia_interna",
      "definition": "CREATE OR REPLACE FUNCTION public.fn_aplicar_transferencia_interna()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  v_debito_old numeric := 0;\n  v_debito_new numeric := 0;\n  v_divisa text;\nBEGIN\n  IF TG_OP IN ('UPDATE', 'DELETE') THEN\n    v_debito_old := OLD.monto + COALESCE(OLD.costo, 0);\n    IF OLD.tipo_origen = 'ACTIVO_LIQUIDO' THEN\n      UPDATE public.activos_liquidos\n      SET saldo_cop = COALESCE(saldo_cop, 0) + v_debito_old,\n          egresos_cop = GREATEST(0, COALESCE(egresos_cop, 0) - v_debito_old)\n      WHERE id = OLD.origen_id;\n    ELSIF OLD.tipo_origen = 'ACTIVO_DIGITAL' THEN\n      UPDATE public.activos_digitales\n      SET saldo_usdt = COALESCE(saldo_usdt, 0) + v_debito_old,\n          egresos_usdt = GREATEST(0, COALESCE(egresos_usdt, 0) - v_debito_old)\n      WHERE id = OLD.origen_id;\n    END IF;\n\n    IF OLD.tipo_destino = 'ACTIVO_LIQUIDO' THEN\n      UPDATE public.activos_liquidos\n      SET saldo_cop = COALESCE(saldo_cop, 0) - OLD.monto_destino,\n          ingresos_cop = GREATEST(0, COALESCE(ingresos_cop, 0) - OLD.monto_destino)\n      WHERE id = OLD.destino_id;\n    ELSIF OLD.tipo_destino = 'ACTIVO_DIGITAL' THEN\n      UPDATE public.activos_digitales\n      SET saldo_usdt = COALESCE(saldo_usdt, 0) - OLD.monto_destino,\n          ingresos_usdt = GREATEST(0, COALESCE(ingresos_usdt, 0) - OLD.monto_destino)\n      WHERE id = OLD.destino_id;\n    END IF;\n  END IF;\n\n  IF TG_OP IN ('INSERT', 'UPDATE') THEN\n    v_divisa := CASE WHEN NEW.tipo_origen = 'ACTIVO_DIGITAL' THEN 'USDT' ELSE 'COP' END;\n    IF NEW.origen_id = NEW.destino_id OR NEW.tipo_origen <> NEW.tipo_destino\n       OR NEW.monto <> NEW.monto_destino OR NEW.divisa_origen <> v_divisa\n       OR NEW.divisa_destino <> v_divisa OR NEW.divisa_costo <> v_divisa THEN\n      RAISE EXCEPTION 'Selecciona dos cuentas distintas del mismo tipo y divisa.';\n    END IF;\n    v_debito_new := NEW.monto + COALESCE(NEW.costo, 0);\n\n    IF NEW.tipo_origen = 'ACTIVO_LIQUIDO' THEN\n      UPDATE public.activos_liquidos\n      SET saldo_cop = COALESCE(saldo_cop, 0) - v_debito_new,\n          egresos_cop = COALESCE(egresos_cop, 0) + v_debito_new\n      WHERE id = NEW.origen_id AND coalesce(divisa, 'COP') = 'COP'\n        AND coalesce(saldo_cop, 0) >= v_debito_new;\n    ELSIF NEW.tipo_origen = 'ACTIVO_DIGITAL' THEN\n      UPDATE public.activos_digitales\n      SET saldo_usdt = COALESCE(saldo_usdt, 0) - v_debito_new,\n          egresos_usdt = COALESCE(egresos_usdt, 0) + v_debito_new\n      WHERE id = NEW.origen_id AND coalesce(saldo_usdt, 0) >= v_debito_new;\n    END IF;\n\n    IF NOT FOUND THEN\n      RAISE EXCEPTION 'El origen no está disponible o el saldo no cubre el monto y el costo.';\n    END IF;\n\n    IF NEW.tipo_destino = 'ACTIVO_LIQUIDO' THEN\n      UPDATE public.activos_liquidos\n      SET saldo_cop = COALESCE(saldo_cop, 0) + NEW.monto_destino,\n          ingresos_cop = COALESCE(ingresos_cop, 0) + NEW.monto_destino\n      WHERE id = NEW.destino_id AND coalesce(divisa, 'COP') = 'COP';\n    ELSIF NEW.tipo_destino = 'ACTIVO_DIGITAL' THEN\n      UPDATE public.activos_digitales\n      SET saldo_usdt = COALESCE(saldo_usdt, 0) + NEW.monto_destino,\n          ingresos_usdt = COALESCE(ingresos_usdt, 0) + NEW.monto_destino\n      WHERE id = NEW.destino_id;\n    END IF;\n    IF NOT FOUND THEN\n      RAISE EXCEPTION 'La cuenta de destino no está disponible.';\n    END IF;\n  END IF;\n\n  IF TG_OP = 'DELETE' THEN\n    RETURN OLD;\n  ELSE\n    RETURN NEW;\n  END IF;\nEND;\n$function$\n"
    },
    {
      "schema": "kaupaloki_private",
      "name": "contabilizar_venta_usdt",
      "definition": "CREATE OR REPLACE FUNCTION kaupaloki_private.contabilizar_venta_usdt()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  old_wallet text; new_wallet text;\n  old_account text; new_account text;\n  old_fee numeric := 0; new_fee numeric := 0;\n  old_debit numeric := 0; new_debit numeric := 0;\n  old_credit numeric := 0; new_credit numeric := 0;\n  old_linked boolean := false;\n  movement record;\nBEGIN\n  IF TG_OP <> 'INSERT' THEN\n    old_wallet := old.wallet_origen_id;\n    old_account := old.destino_fondos_id;\n    old_linked := old_wallet IS NOT NULL AND old_account IS NOT NULL;\n    old_fee := old.fee_usdt;\n\n    IF old_linked THEN\n      old_debit := old.usdt_vendido;\n      -- Si ya se había aplicado el saldo a la cuenta destino, lo revertimos\n      IF old.saldo_venta_aplicado THEN\n        old_credit := old.total_cop;\n      ELSE\n        old_credit := 0;\n      END IF;\n    END IF;\n  END IF;\n\n  IF TG_OP <> 'DELETE' THEN\n    new_wallet := new.wallet_origen_id;\n    new_account := new.destino_fondos_id;\n    new_fee := new.fee_usdt;\n\n    IF coalesce(new.estado, 'recibido') = 'recibido' THEN\n      new.estado := 'recibido';\n      new.saldo_venta_aplicado := true;\n    ELSE\n      new.estado := 'pendiente';\n      new.saldo_venta_aplicado := false;\n    END IF;\n\n    IF new.usdt_vendido IS NULL OR NOT (new.usdt_vendido > 0 AND new.usdt_vendido < 'Infinity'::numeric)\n       OR new.tasa IS NULL OR NOT (new.tasa > 0 AND new.tasa < 'Infinity'::numeric)\n       OR new_fee IS NULL OR NOT (new_fee >= 0 AND new_fee < 'Infinity'::numeric)\n       OR new.fecha IS NULL THEN\n      RAISE EXCEPTION 'Ingresa un monto, una tasa, un fee y una fecha válidos.';\n    END IF;\n\n    IF (TG_OP = 'INSERT' OR old_linked OR new_fee > 0)\n       AND (new_wallet IS NULL OR new_account IS NULL OR new_wallet = new_account) THEN\n      RAISE EXCEPTION 'Selecciona una billetera de origen y una cuenta de destino válidas.';\n    END IF;\n\n    IF TG_OP = 'INSERT' OR (new.usdt_vendido, new.tasa) IS DISTINCT FROM (old.usdt_vendido, old.tasa) THEN\n      new.total_cop := new.usdt_vendido * new.tasa;\n    END IF;\n\n    IF TG_OP = 'INSERT' OR old_linked THEN\n      new_debit := new.usdt_vendido;\n      -- Solo acreditamos la cuenta de destino si el dinero ya fue recibido\n      IF new.saldo_venta_aplicado THEN\n        new_credit := new.total_cop;\n      ELSE\n        new_credit := 0;\n      END IF;\n    END IF;\n  END IF;\n\n  FOR movement IN\n    SELECT account_id, currency, sum(delta) AS amount\n    FROM (VALUES (old_wallet, 'USDT', old_debit + old_fee), (old_account, 'COP', -old_credit),\n                 (new_wallet, 'USDT', -(new_debit + new_fee)), (new_account, 'COP', new_credit))\n      AS entries(account_id, currency, delta)\n    WHERE account_id IS NOT NULL\n    GROUP BY account_id, currency HAVING sum(delta) <> 0\n    ORDER BY currency, account_id\n  LOOP\n    IF movement.currency = 'USDT' THEN\n      UPDATE public.activos_digitales\n      SET saldo_usdt = coalesce(saldo_usdt, 0) + movement.amount\n      WHERE id::text = movement.account_id\n        AND (movement.amount > 0 OR coalesce(saldo_usdt, 0) + movement.amount >= 0);\n    ELSE\n      UPDATE public.activos_liquidos\n      SET saldo_cop = coalesce(saldo_cop, 0) + movement.amount\n      WHERE id::text = movement.account_id AND coalesce(divisa, 'COP') = 'COP'\n        AND (movement.amount > 0 OR coalesce(saldo_cop, 0) + movement.amount >= 0);\n    END IF;\n\n    IF NOT FOUND THEN\n      RAISE EXCEPTION 'La cuenta no está disponible o el saldo es insuficiente para la venta y su fee.';\n    END IF;\n  END LOOP;\n\n  IF TG_OP = 'DELETE' THEN RETURN old; END IF;\n  RETURN new;\nEND;\n$function$\n"
    },
    {
      "schema": "kaupaloki_private",
      "name": "contabilizar_saldo_origen_dispersion",
      "definition": "CREATE OR REPLACE FUNCTION kaupaloki_private.contabilizar_saldo_origen_dispersion()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  old_source text;\n  new_source text;\n  old_debit numeric := 0;\n  new_debit numeric := 0;\n  rejected boolean;\n  principal numeric;\n  entry record;\nBEGIN\n  IF TG_OP <> 'INSERT' THEN\n    old_source := nullif(btrim(old.origen_fondos_id), '');\n    IF old.saldo_origen_aplicado THEN\n      old_debit := coalesce(old.monto_cop, old.monto);\n    END IF;\n    IF old.costo_origen_aplicado THEN\n      old_debit := old_debit + old.costo_cop;\n    END IF;\n  END IF;\n\n  IF TG_OP <> 'DELETE' THEN\n    new_source := nullif(btrim(new.origen_fondos_id), '');\n    rejected := upper(btrim(coalesce(new.estado, 'COMPLETADO'))) = 'RECHAZADO';\n    principal := coalesce(new.monto_cop, new.monto);\n\n    IF rejected THEN\n      new.saldo_origen_aplicado := false;\n    ELSIF TG_OP = 'INSERT'\n       OR (new_source, new.monto_cop, new.monto, rejected) IS DISTINCT FROM\n          (old_source, old.monto_cop, old.monto, upper(btrim(coalesce(old.estado, 'COMPLETADO'))) = 'RECHAZADO') THEN\n      IF principal IS NULL OR NOT (principal > 0 AND principal < 'Infinity'::numeric) THEN\n        RAISE EXCEPTION 'Ingresa un monto válido para completar la dispersión.';\n      END IF;\n      new.saldo_origen_aplicado := true;\n    ELSE\n      new.saldo_origen_aplicado := old.saldo_origen_aplicado;\n    END IF;\n\n    new.costo_origen_aplicado := NOT rejected AND new.costo_cop > 0;\n    IF new.saldo_origen_aplicado OR new.costo_origen_aplicado THEN\n      IF new_source IS NULL THEN\n        RAISE EXCEPTION 'Vincula una cuenta de origen antes de completar la dispersión.';\n      END IF;\n      new.origen_fondos_id := new_source;\n    END IF;\n    IF new.saldo_origen_aplicado THEN\n      new_debit := principal;\n    END IF;\n    IF new.costo_origen_aplicado THEN\n      new_debit := new_debit + new.costo_cop;\n    END IF;\n  END IF;\n\n  FOR entry IN\n    SELECT account_id, sum(delta) AS amount\n    FROM (VALUES (old_source, old_debit), (new_source, -new_debit)) amounts(account_id, delta)\n    WHERE account_id IS NOT NULL\n    GROUP BY account_id HAVING sum(delta) <> 0\n    ORDER BY account_id\n  LOOP\n    UPDATE public.activos_liquidos\n    SET saldo_cop = coalesce(saldo_cop, 0) + entry.amount,\n        egresos_cop = coalesce(egresos_cop, 0) - entry.amount\n    WHERE id::text = entry.account_id AND coalesce(divisa, 'COP') = 'COP'\n      AND (entry.amount > 0 OR coalesce(saldo_cop, 0) >= -entry.amount);\n\n    IF NOT FOUND THEN\n      RAISE EXCEPTION 'La cuenta de origen no está disponible o su saldo contable es insuficiente para el monto y el costo.';\n    END IF;\n  END LOOP;\n\n  IF TG_OP = 'DELETE' THEN RETURN old; END IF;\n  RETURN new;\nEND;\n$function$\n"
    },
    {
      "schema": "kaupaloki_private",
      "name": "contabilizar_gasto",
      "definition": "CREATE OR REPLACE FUNCTION kaupaloki_private.contabilizar_gasto()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public', 'kaupaloki_private'\nAS $function$\nDECLARE\n  old_source text;\n  new_source text;\n  old_divisa text := 'COP';\n  new_divisa text := 'COP';\n  old_monto numeric := 0;\n  new_monto numeric := 0;\n  movement record;\nBEGIN\n  IF TG_OP <> 'INSERT' THEN\n    IF old.origen_fondos = 'Capital & Socios' OR EXISTS (SELECT 1 FROM public.capital_movimientos WHERE id = old.id) THEN\n      RETURN old;\n    END IF;\n    old_source := nullif(btrim(old.origen_fondos_id::text), '');\n    old_divisa := coalesce(old.divisa, 'COP');\n    old_monto := coalesce(old.monto, 0);\n\n    IF old_source IS NULL AND old.origen_fondos IS NOT NULL THEN\n      IF old_divisa = 'USDT' THEN\n        SELECT id::text INTO old_source FROM public.activos_digitales WHERE lower(btrim(activo)) = lower(btrim(old.origen_fondos)) LIMIT 1;\n      ELSE\n        SELECT id::text INTO old_source FROM public.activos_liquidos WHERE lower(btrim(activo)) = lower(btrim(old.origen_fondos)) LIMIT 1;\n      END IF;\n    END IF;\n  END IF;\n\n  IF TG_OP <> 'DELETE' THEN\n    IF new.origen_fondos = 'Capital & Socios' OR EXISTS (SELECT 1 FROM public.capital_movimientos WHERE id = new.id) THEN\n      RETURN new;\n    END IF;\n    new_source := nullif(btrim(new.origen_fondos_id::text), '');\n    new_divisa := coalesce(new.divisa, 'COP');\n    new_monto := coalesce(new.monto, 0);\n\n    IF new_source IS NULL AND new.origen_fondos IS NOT NULL THEN\n      IF new_divisa = 'USDT' THEN\n        SELECT id::text INTO new_source FROM public.activos_digitales WHERE lower(btrim(activo)) = lower(btrim(new.origen_fondos)) LIMIT 1;\n      ELSE\n        SELECT id::text INTO new_source FROM public.activos_liquidos WHERE lower(btrim(activo)) = lower(btrim(new.origen_fondos)) LIMIT 1;\n      END IF;\n      IF new_source IS NOT NULL THEN\n        new.origen_fondos_id := new_source::uuid;\n      END IF;\n    END IF;\n  END IF;\n\n  FOR movement IN\n    SELECT account_id, currency, sum(delta) AS amount\n    FROM (\n      VALUES \n        (old_source, old_divisa, old_monto),\n        (new_source, new_divisa, -new_monto)\n    ) AS entries(account_id, currency, delta)\n    WHERE account_id IS NOT NULL\n    GROUP BY account_id, currency HAVING sum(delta) <> 0\n    ORDER BY currency, account_id\n  LOOP\n    IF movement.currency = 'USDT' THEN\n      UPDATE public.activos_digitales\n      SET saldo_usdt = coalesce(saldo_usdt, 0) + movement.amount,\n          egresos_usdt = coalesce(egresos_usdt, 0) - movement.amount\n      WHERE id::text = movement.account_id;\n    ELSE\n      UPDATE public.activos_liquidos\n      SET saldo_cop = coalesce(saldo_cop, 0) + movement.amount,\n          egresos_cop = coalesce(egresos_cop, 0) - movement.amount\n      WHERE id::text = movement.account_id;\n    END IF;\n  END LOOP;\n\n  IF TG_OP = 'DELETE' THEN RETURN old; END IF;\n  RETURN new;\nEND;\n$function$\n"
    },
    {
      "schema": "kaupaloki_private",
      "name": "calcular_ganancia_liquidacion",
      "definition": "CREATE OR REPLACE FUNCTION kaupaloki_private.calcular_ganancia_liquidacion()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO ''\nAS $function$\nBEGIN\n  SELECT COALESCE(SUM(CASE WHEN tipo = 'CONTRATO' THEN monto_cop ELSE -monto_cop END), 0)\n  INTO NEW.total_capital_invertido_cop\n  FROM public.capital_movimientos\n  WHERE tipo IN ('CONTRATO', 'RETIRO');\n\n  NEW.ganancia_esperada_cop := COALESCE(NEW.total_activos_liquidos_cop, 0)\n    + COALESCE(NEW.total_liquidez_esperada_cop, 0)\n    - COALESCE(NEW.saldo_neto_clientes_cop, 0)\n    - NEW.total_capital_invertido_cop;\n  RETURN NEW;\nEND;\n$function$\n"
    },
    {
      "schema": "public",
      "name": "fn_recalculate_financial_aggregates",
      "definition": "CREATE OR REPLACE FUNCTION public.fn_recalculate_financial_aggregates()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  v_saldo_neto_clientes NUMERIC;\n  v_total_ventas NUMERIC;\n  v_total_gastos NUMERIC;\n  v_total_costos_dispersion NUMERIC;\n  v_total_activos_digitales NUMERIC;\n  v_total_activos_liquidos NUMERIC;\nBEGIN\n  IF pg_trigger_depth() > 1 THEN\n    RETURN NULL;\n  END IF;\n\n  -- 1a. Recalculate base operational income per client (negocios + efectivo ingreso)\n  UPDATE public.clientes c\n  SET\n    total_negocios = COALESCE((SELECT COUNT(*) FROM public.negocios n WHERE n.cliente_id = c.id), 0),\n    ingresos_cop = (\n      COALESCE((SELECT SUM(n.ingreso_cop) FROM public.negocios n WHERE n.cliente_id = c.id), 0)\n      + COALESCE((\n        SELECT SUM(e.monto)\n        FROM public.efectivo e\n        WHERE UPPER(BTRIM(e.tipo)) = 'INGRESO'\n          AND (e.cliente_id = c.id OR (e.cliente_id IS NULL AND e.cliente_codigo = c.codigo))\n      ), 0)\n    ),\n    pagado_cop = (\n      COALESCE((\n        SELECT SUM(COALESCE(d.monto_cop, d.monto))\n        FROM public.dispersiones d\n        WHERE d.cliente_id = c.id AND UPPER(BTRIM(COALESCE(d.estado, 'COMPLETADO'))) != 'RECHAZADO'\n      ), 0) +\n      COALESCE((\n        SELECT SUM(e.monto)\n        FROM public.efectivo e\n        WHERE e.cliente_id = c.id AND UPPER(BTRIM(e.tipo)) IN ('PAGO', 'EGRESO')\n      ), 0)\n    )\n  WHERE c.id IS NOT NULL;\n\n  -- 1b. Recalculate comisionistas based on referred clients' base operational income\n  UPDATE public.comisionistas cm\n  SET\n    ingresos_cop = CASE\n      WHEN cm.referidos_ids IS NOT NULL AND ARRAY_LENGTH(cm.referidos_ids, 1) > 0 THEN\n        COALESCE((SELECT SUM(c.ingresos_cop) FROM public.clientes c WHERE c.id = ANY(cm.referidos_ids)), 0)\n      ELSE 0\n    END,\n    comisiones_cop = CASE\n      WHEN cm.referidos_ids IS NOT NULL AND ARRAY_LENGTH(cm.referidos_ids, 1) > 0 THEN\n        COALESCE((SELECT SUM(c.ingresos_cop) FROM public.clientes c WHERE c.id = ANY(cm.referidos_ids)), 0) * COALESCE(cm.porcentaje_comision, 0)\n      ELSE 0\n    END\n  WHERE cm.id IS NOT NULL;\n\n  -- 1c. Add earned commissions to each comisionista client's ingresos_cop\n  UPDATE public.clientes c\n  SET ingresos_cop = c.ingresos_cop + COALESCE((\n    SELECT SUM(cm.comisiones_cop) FROM public.comisionistas cm WHERE cm.cliente_id = c.id\n  ), 0)\n  WHERE EXISTS (SELECT 1 FROM public.comisionistas cm WHERE cm.cliente_id = c.id);\n\n  -- 1d. Recompute client balances and status\n  UPDATE public.clientes\n  SET\n    pendiente_cop = GREATEST(0, ingresos_cop - pagado_cop),\n    saldo_cop = ingresos_cop - pagado_cop,\n    estado = CASE\n      WHEN ingresos_cop = 0 AND pagado_cop = 0 THEN 'SIN ACTIVIDAD'\n      WHEN pagado_cop > ingresos_cop THEN 'DEBE'\n      WHEN ingresos_cop = pagado_cop THEN 'PAGADO'\n      ELSE 'PENDIENTE'\n    END,\n    pais = COALESCE(NULLIF(TRIM(pais), ''), 'Colombia')\n  WHERE id IS NOT NULL;\n\n  -- 2. Divisas\n  UPDATE public.divisas d\n  SET\n    total_recibido = COALESCE((\n      SELECT SUM(n.monto_divisa)\n      FROM public.negocios n\n      WHERE n.divisa_codigo = d.codigo\n    ), 0),\n    total_comprado = GREATEST(\n      CASE WHEN d.codigo = 'USDT' THEN 0 ELSE COALESCE(d.total_comprado, 0) END,\n      COALESCE((\n        SELECT SUM(cu.valor_comprado)\n        FROM public.compras_usdt cu\n        WHERE cu.divisa_codigo = d.codigo\n      ), 0)\n    )\n  WHERE d.id IS NOT NULL;\n\n  UPDATE public.divisas\n  SET total_pendiente = GREATEST(0, total_recibido - total_comprado)\n  WHERE id IS NOT NULL;\n\n  -- 3. Resumen Liquidacion variables con rate manual USDT/COP\n  SELECT COALESCE(SUM(saldo_cop), 0) INTO v_saldo_neto_clientes FROM public.clientes;\n  SELECT COALESCE(SUM(total_cop), 0) INTO v_total_ventas FROM public.ventas_usdt WHERE id IS NOT NULL;\n  SELECT COALESCE(SUM(saldo_usdt), 0) INTO v_total_activos_digitales FROM public.activos_digitales WHERE activo != 'TEST' AND id IS NOT NULL;\n  SELECT COALESCE(SUM(saldo_cop), 0) INTO v_total_activos_liquidos FROM public.activos_liquidos WHERE id IS NOT NULL;\n\n  SELECT COALESCE(SUM(CASE WHEN divisa = 'COP' THEN monto ELSE monto * 4000 END), 0) INTO v_total_gastos FROM public.gastos WHERE id IS NOT NULL;\n\n  SELECT COALESCE(SUM(costo_cop), 0) INTO v_total_costos_dispersion\n  FROM public.dispersiones\n  WHERE UPPER(BTRIM(COALESCE(estado, 'COMPLETADO'))) <> 'RECHAZADO';\n\n  UPDATE public.resumen_liquidacion r\n  SET\n    total_negocio_cop = (SELECT COALESCE(SUM(ingreso_cop), 0) FROM public.negocios WHERE id IS NOT NULL),\n    total_ventas_usdt_cop = v_total_ventas,\n    total_activos_liquidos_cop = v_total_activos_liquidos,\n    total_activos_digitales_usdt = v_total_activos_digitales,\n    total_liquidez_esperada_cop = v_total_activos_digitales * COALESCE(NULLIF(GREATEST(r.rate_usdt_cop, 0), 0), 3950),\n    saldo_neto_clientes_cop = v_saldo_neto_clientes,\n    total_gastos_cop = v_total_gastos,\n    total_costos_dispersion_cop = v_total_costos_dispersion,\n    total_saldo_pendiente_clientes_cop = (SELECT COALESCE(SUM(GREATEST(0, pendiente_cop)), 0) FROM public.clientes WHERE id IS NOT NULL),\n    ganancia_esperada_cop = v_total_activos_liquidos\n      + v_total_activos_digitales * COALESCE(NULLIF(GREATEST(r.rate_usdt_cop, 0), 0), 3950)\n      - v_saldo_neto_clientes - COALESCE(r.total_capital_invertido_cop, 0),\n    updated_at = NOW()\n  WHERE r.id IS NOT NULL;\n\n  RETURN NULL;\nEND;\n$function$\n"
    },
    {
      "schema": "kaupaloki_private",
      "name": "contabilizar_compra_usdt",
      "definition": "CREATE OR REPLACE FUNCTION kaupaloki_private.contabilizar_compra_usdt()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\ndeclare\n  old_dst text; new_dst text;\n  old_currency text; new_currency text;\n  old_debit numeric := 0; new_debit numeric := 0;\n  old_credit numeric := 0; new_credit numeric := 0;\n  historical boolean := false;\n  movement record;\nbegin\n  if tg_op <> 'INSERT' then\n    old_dst := old.wallet_destino_id;\n    old_currency := old.divisa_codigo;\n    old_debit := coalesce(old.valor_comprado, 0);\n    -- Si el saldo previo no fue aplicado porque estaba pendiente, no hay nada que revertir\n    if coalesce(old.saldo_compra_aplicado, true) then\n      old_credit := coalesce(old.usdt_comprado, 0);\n    else\n      old_credit := 0;\n    end if;\n    historical := old_dst is null;\n  end if;\n\n  if tg_op <> 'DELETE' then\n    new_dst := new.wallet_destino_id;\n    new_currency := new.divisa_codigo;\n    new_debit := new.valor_comprado;\n\n    if coalesce(new.estado, 'recibido') = 'recibido' then\n      new.estado := 'recibido';\n      new.saldo_compra_aplicado := true;\n    else\n      new.estado := 'pendiente';\n      new.saldo_compra_aplicado := false;\n    end if;\n\n    if new_debit is null or new_debit <= 0 or new_debit >= 'Infinity'::numeric\n       or new_currency is null or new.fecha is null then\n      raise exception 'Ingresa un monto positivo, una divisa y una fecha válida.';\n    end if;\n\n    if new_dst is null and not historical then\n      raise exception 'Selecciona una billetera de destino válida.';\n    end if;\n\n    if tg_op = 'INSERT' or (new_debit, new.usdt_comprado, new.tasa)\n         is distinct from (old_debit, old_credit, old.tasa) then\n      if new.tasa is null or new.tasa < 0 or new.tasa >= 'Infinity'::numeric then\n        raise exception 'Ingresa una tasa de compra válida (mayor o igual a cero).';\n      end if;\n\n      if new.tasa = 0 then\n        new.usdt_comprado := 0;\n        new.costo := 0;\n      else\n        if new.usdt_comprado is null or new.usdt_comprado <= 0 then\n          new.usdt_comprado := round(new_debit / new.tasa, 6);\n        end if;\n\n        if new.usdt_comprado is null or new.usdt_comprado < 0 or new.usdt_comprado >= 'Infinity'::numeric then\n          raise exception 'El monto calculado de USDT debe ser mayor o igual que cero.';\n        end if;\n        new.costo := new.usdt_comprado / new_debit;\n      end if;\n    end if;\n\n    -- Solo sumamos a la billetera digital destino si el estado es 'recibido'\n    if new.saldo_compra_aplicado then\n      new_credit := coalesce(new.usdt_comprado, 0);\n    else\n      new_credit := 0;\n    end if;\n  end if;\n\n  if not historical then\n    for movement in\n      select account_id, sum(delta) amount\n      from (values (old_dst, -old_credit),\n                   (new_dst, new_credit)) m(account_id, delta)\n      where account_id is not null\n      group by account_id having sum(delta) <> 0\n    loop\n      update public.activos_digitales\n      set saldo_usdt = coalesce(saldo_usdt, 0) + movement.amount\n      where id::text = movement.account_id;\n    end loop;\n  end if;\n\n  for movement in\n    select currency, sum(delta) amount\n    from (values (old_currency, -old_debit), (new_currency, new_debit)) m(currency, delta)\n    where currency is not null\n    group by currency\n    order by currency\n  loop\n    update public.divisas\n    set total_comprado = greatest(0, coalesce(total_comprado, 0) + movement.amount),\n        total_pendiente = greatest(0, coalesce(total_recibido, 0)\n          - greatest(0, coalesce(total_comprado, 0) + movement.amount))\n    where codigo = movement.currency;\n  end loop;\n\n  if tg_op = 'DELETE' then return old; end if;\n  return new;\nend;\n$function$\n"
    }
  ],
  "applicationFormulas": {
    "liquidezEsperada": "activos digitales USDT * tasa USDT/COP",
    "totalActivos": "activos líquidos COP + liquidezEsperada",
    "capitalVigente": "CONTRATO monto_cop - RETIRO monto_cop; intereses, dividendos y adelantos no son capital",
    "saldoNetoClientes": "saldoPendienteCOP - porCobrarCOP",
    "gananciaEsperadaFrontend": "líquidos COP + liquidezEsperada + distribuciones pagadas socios - saldo neto clientes - intereses pendientes - capital invertido",
    "gananciaDespuesDividendosFrontend": "gananciaEsperada - max(dividendos, adelantos) por socio",
    "warning": "La fórmula del trigger de Supabase y la del frontend tienen diferencias explícitas: explica cada una y no las confundas. Este catálogo es una instantánea técnica, no introspección en vivo."
  },
  "apis": {
    "supabase": "https://tjuqludeduydarwzhbor.supabase.co",
    "rest": "/rest/v1/{tabla}: GET autenticado y sujeto a RLS; filtros eq, neq, gt, gte, lt, lte, ilike, is; select, order, offset, limit; Prefer count=exact.",
    "usuarios": "/rest/v1/rpc/listar_perfiles_dashboard: directorio seguro sin secretos de autenticación, autorizado por rol.",
    "ai": "/functions/v1/ai-assistant: POST con Bearer de sesión; proveedor Google Gemini generateContent; las herramientas internas son de consulta.",
    "lincoin": "Integración server-side kaupaloki_private.lincoin_request/read_lincoin_balances/sync_lincoin, public.lincoin_balances. Las credenciales se guardan en servidor y no se exponen al modelo.",
    "airtable": "Edge Function data-sync: integración heredada de sincronización Airtable. El asistente no puede ejecutarla ni modificar datos."
  }
};

