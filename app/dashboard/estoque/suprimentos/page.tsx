"use client";

import Link from "next/link";

export default function ReposicaoPage() {
  return (
    <div
      style={{
        padding: "var(--space-6)",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: "var(--space-2)",
        }}
      >
        Ponto de Reposicao e Suprimentos
      </h2>
      <p
        style={{
          color: "var(--text-secondary)",
          marginBottom: "var(--space-6)",
          fontSize: 14,
        }}
      >
        Monitoramento de ruptura e giro para apoiar reposicao inteligente de
        estoque.
      </p>

      <div
        style={{
          padding: "var(--space-3)",
          marginBottom: "var(--space-4)",
          borderLeft: "4px solid var(--status-warning)",
          background: "var(--status-warning-bg)",
          color: "var(--status-warning)",
        }}
      >
        Esta tela consolida o radar de ruptura e giro. Nesta fase do piloto, a
        decisao de compra ainda e assistida: acompanhe os indicadores aqui e
        execute a acao a partir do modulo principal de estoque ou da importacao.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-4)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Total em baixa
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>
            0
          </div>
        </div>
        <div
          style={{
            background: "#f8fafc",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Pedidos em transito
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>
            0
          </div>
        </div>
        <div
          style={{
            background: "#f8fafc",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Capital evitado
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>
            R$ 0,00
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          background: "#f1f5f9",
          borderRadius: "var(--radius-md)",
          border: "1px dashed var(--border-color)",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: "var(--space-2)" }}>BOX</div>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>
          Nenhum produto em ponto de ruptura
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          A Curva A e B estao operando dentro do giro ideal. Nenhuma compra
          emergencial e necessaria agora.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-3)",
          marginTop: "var(--space-4)",
        }}
      >
        {[
          { label: "Fila de compra", value: "Assistida" },
          { label: "Pedidos automaticos", value: "Desligados no piloto" },
          { label: "Base atual", value: "Estoque / Giro" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: "var(--space-3)",
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--space-3)",
          marginTop: "var(--space-4)",
        }}
      >
        <Link
          href="/dashboard/estoque"
          className="btnSecondary"
          style={{ textAlign: "center", textDecoration: "none" }}
        >
          Abrir Estoque Operacional
        </Link>
        <Link
          href="/dashboard/estoque/importar"
          className="btnSecondary"
          style={{ textAlign: "center", textDecoration: "none" }}
        >
          Importar XML de Fornecedor
        </Link>
      </div>
    </div>
  );
}
