"use client";

import Link from "next/link";

export default function EDIPage() {
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
        Integracao EDI (Laboratorio)
      </h2>
      <p
        style={{
          color: "var(--text-secondary)",
          marginBottom: "var(--space-6)",
          fontSize: 14,
        }}
      >
        Envie Ordens de Servico diretamente para o laboratorio no formato
        VCA/OMA quando a fila de expedicao estiver pronta.
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
        O envio em lote ja esta definido no backend. Nesta fase, a operacao deve
        acompanhar o status das OS no kanban e usar esta tela como ponto de
        conferência e disparo quando houver fila pronta.
      </div>

      <div
        style={{
          padding: "var(--space-4)",
          background: "#f8fafc",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          textAlign: "center",
          marginBottom: "var(--space-4)",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: "var(--space-2)" }}>LINK</div>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Nenhuma O.S aguardando empacotamento VCA
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginTop: "var(--space-2)",
          }}
        >
          As ordens no status `LAB_SENT` entram nesta fila. Enquanto a fila
          estiver vazia, acompanhe o andamento operacional pelo kanban de
          logistica.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
        }}
      >
        {[
          { label: "Fila pronta", value: "0 O.S." },
          { label: "Ultimo lote", value: "Aguardando primeiro envio" },
          { label: "Formato", value: "VCA / OMA" },
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
        }}
      >
        <Link
          className="btnSecondary"
          href="/dashboard/logistica/kanban"
          style={{ textAlign: "center", textDecoration: "none" }}
        >
          Abrir Kanban de Logistica
        </Link>
        <Link
          className="btnPrimary"
          href="/dashboard/ordens"
          style={{ textAlign: "center", textDecoration: "none" }}
        >
          Revisar O.S. para Expedicao
        </Link>
      </div>
    </div>
  );
}
