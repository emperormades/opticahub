"use client";

import { useState, useEffect, useCallback } from "react";
import s from "../shared.module.css";
import Link from "next/link";
import { AdvancedFilters } from "@/components/inventory/AdvancedFilters";
import { ProductLabel } from "@/components/inventory/ProductLabel";

interface StockProduct {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  barcode: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  salePrice: number;
  costPrice: number;
  quantity: number;
  minStock: number;
  stockStatus: "OK" | "LOW" | "OUT";
  category: { name: string; type: string };
  subcategory?: { name: string } | null;
  lensIndex: string | null;
  lensTreatment: string | null;
  lensDesign: string | null;
  isArchivedOption?: boolean;
  isArchived?: boolean;
}

interface StockHistoryEntry {
  id: string;
  timestamp: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  reason: string | null;
  user: { name: string } | null;
}

type StockFilters = Record<string, string>;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );

const STOCK_STATUS = {
  OK: { label: "Normal", color: "#16a34a", bg: "#dcfce7", icon: "✓" },
  LOW: { label: "Crítico", color: "#b45309", bg: "#fef9c3", icon: "⚠" },
  OUT: { label: "Zerado", color: "#dc2626", bg: "#fee2e2", icon: "✕" },
};

const TYPE_ICON: Record<string, string> = {
  LENTES: "🔬",
  ARMACOES: "👓",
  ACESSORIOS: "💎",
  SERVICOS: "🔧",
};

// ─── MODAL DE AJUSTE ─────────────────────────────────────────────────────────

function AdjustModal({
  product,
  onClose,
  onSaved,
}: {
  product: StockProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"add" | "remove">("add");

  const handleSave = async () => {
    if (delta === 0) return;
    setSaving(true);
    const finalDelta = mode === "remove" ? -Math.abs(delta) : Math.abs(delta);
    await fetch(`/api/stock/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta: finalDelta, reason }),
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  const newQty = Math.max(
    0,
    product.quantity + (mode === "remove" ? -Math.abs(delta) : Math.abs(delta)),
  );

  return (
    <div
      className={s.modalOverlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={s.modal} style={{ maxWidth: 460 }}>
        <div className={s.modalHeader}>
          <h2 className={s.modalTitle}>📦 Ajustar Estoque</h2>
          <button className={s.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={s.modalBody}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
              marginBottom: "var(--space-4)",
            }}
          >
            <span className={s.cellName}>{product.name}</span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              SKU: {product.sku}
            </span>
          </div>

          {/* Seletor Entrada/Saída */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--space-2)",
              marginBottom: "var(--space-4)",
            }}
          >
            {(["add", "remove"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: `2px solid ${mode === m ? (m === "add" ? "var(--status-success)" : "var(--status-error)") : "var(--border-subtle)"}`,
                  background:
                    mode === m
                      ? m === "add"
                        ? "var(--status-success-bg)"
                        : "var(--status-error-bg)"
                      : "var(--bg-elevated)",
                  color:
                    mode === m
                      ? m === "add"
                        ? "var(--status-success)"
                        : "var(--status-error)"
                      : "var(--text-secondary)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                {m === "add" ? "➕ Entrada" : "➖ Saída"}
              </button>
            ))}
          </div>

          <div className={s.formSection}>
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>Quantidade</label>
              <input
                className={s.fieldInput}
                type="number"
                min={0}
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>Motivo (opcional)</label>
              <input
                className={s.fieldInput}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Compra NF 1234, Ajuste Inventário..."
              />
            </div>
          </div>

          {/* Preview */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "var(--space-3)",
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
              marginTop: "var(--space-3)",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              Saldo atual: <strong>{product.quantity}</strong>
            </span>
            <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              →
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 900,
                color:
                  newQty === 0
                    ? "var(--status-error)"
                    : newQty <= product.minStock
                      ? "var(--status-warning)"
                      : "var(--status-success)",
              }}
            >
              Novo saldo: {newQty}
            </span>
          </div>
        </div>
        <div className={s.modalFooter}>
          <button className={s.btnSecondary} onClick={onClose}>
            Cancelar
          </button>
          <button
            id="btn-salvar-ajuste"
            className={s.btnPrimary}
            onClick={handleSave}
            disabled={saving || delta === 0}
          >
            {saving ? "Salvando..." : "✓ Confirmar Ajuste"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL DE HISTÓRICO (AUDITORIA) ──────────────────────────────────────────

function HistoryModal({
  product,
  onClose,
}: {
  product: StockProduct;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/stock/${product.id}/history`)
      .then(async (res) => {
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          setError("Nao foi possivel carregar a auditoria deste item.");
          setHistory([]);
          return;
        }
        setHistory(Array.isArray(data) ? data : []);
        setError("");
      })
      .finally(() => setLoading(false));
  }, [product.id]);

  return (
    <div
      className={s.modalOverlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={s.modal} style={{ maxWidth: 650 }}>
        <div className={s.modalHeader}>
          <h2 className={s.modalTitle}>📜 Histórico de Movimentação</h2>
          <button className={s.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={s.modalBody} style={{ padding: 0 }}>
          <div
            style={{
              padding: "var(--space-4)",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-elevated)",
            }}
          >
            <div className={s.cellName}>{product.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              Rastreabilidade Total — VisionCore OS
            </div>
          </div>

          {loading ? (
            <div
              style={{
                padding: "var(--space-10)",
                textAlign: "center",
                color: "var(--text-tertiary)",
              }}
            >
              Carregando auditoria...
            </div>
          ) : error ? (
            <div
              style={{
                padding: "var(--space-10)",
                textAlign: "center",
                color: "var(--status-error)",
              }}
            >
              {error}
            </div>
          ) : history.length === 0 ? (
            <div
              style={{
                padding: "var(--space-10)",
                textAlign: "center",
                color: "var(--text-tertiary)",
              }}
            >
              Nenhuma movimentação registrada.
            </div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              <table className={s.table} style={{ border: "none" }}>
                <thead className={s.tableHead}>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Usuário</th>
                    <th style={{ textAlign: "center" }}>De → Para</th>
                    <th>Motivo / Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => (
                    <tr key={log.id} className={s.tableRow}>
                      <td style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                        {new Date(log.timestamp).toLocaleString("pt-BR")}
                      </td>
                      <td style={{ fontSize: 12, fontWeight: 600 }}>
                        {log.user?.name || "Sistema"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {log.oldValue}
                          </span>
                          <span>→</span>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 900,
                              color: "var(--brand-primary)",
                            }}
                          >
                            {log.newValue}
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          fontStyle: "italic",
                        }}
                      >
                        {log.reason || "S/ motivo"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className={s.modalFooter}>
          <button className={s.btnSecondary} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function EstoquePage() {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StockFilters>({ archived: "false" });
  const [adjustProduct, setAdjustProduct] = useState<StockProduct | null>(null);
  const [historyProduct, setHistoryProduct] = useState<StockProduct | null>(
    null,
  );
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      Object.keys(filters).forEach((key) => {
        if (filters[key]) {
          params.set(key, filters[key]);
        }
      });

      const res = await fetch(`/api/stock?${params}`);
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setUiMessage({
          type: "error",
          text: "Nao foi possivel carregar o estoque.",
        });
        setProducts([]);
        return;
      }
      setProducts(Array.isArray(data) ? data : []);
      setUiMessage(null);
    } catch {
      setUiMessage({ type: "error", text: "Falha ao carregar o estoque." });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilter = (newFilters: StockFilters) => {
    setFilters(newFilters);
  };

  const handleArchive = async (id: string, isArchived: boolean) => {
    if (
      !confirm(
        `Deseja realmente ${isArchived ? "restaurar" : "arquivar"} este produto?`,
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !isArchived }),
      });
      if (!res.ok) {
        setUiMessage({
          type: "error",
          text: "Nao foi possivel atualizar o status do produto.",
        });
        setLoading(false);
        return;
      }
      setUiMessage({
        type: "success",
        text: `Produto ${isArchived ? "restaurado" : "arquivado"} com sucesso.`,
      });
      load();
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao atualizar o status do produto.",
      });
      setLoading(false);
    }
  };

  // KPIs
  const totalSKUs = products.length;
  const totalItems = products.reduce((s, p) => s + p.quantity, 0);
  const lowStock = products.filter((p) => p.stockStatus === "LOW").length;
  const outOfStock = products.filter((p) => p.stockStatus === "OUT").length;
  const stockValue = products.reduce(
    (s, p) => s + Number(p.costPrice) * p.quantity,
    0,
  );

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>
            📦 Catálogo Inteligente (Estoque Smart)
          </h1>
          <p className={s.pageSubtitle}>
            Gerenciamento de produtos, taxonomias e auditoria de ruptura
          </p>
        </div>
        <div className={s.pageActionArea}>
          <Link href="/dashboard/estoque/importar" className={s.btnPrimary}>
            📥 Importar NF-e (XML)
          </Link>
        </div>
      </div>

      {uiMessage && (
        <div
          className={s.card}
          style={{
            marginBottom: "var(--space-3)",
            borderLeft: `4px solid ${uiMessage.type === "error" ? "var(--status-error)" : "var(--status-success)"}`,
            color:
              uiMessage.type === "error"
                ? "var(--status-error)"
                : "var(--status-success)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {uiMessage.text}
            </span>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => setUiMessage(null)}
              style={{ padding: "4px 10px" }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className={s.nextActionBanner}>
        <div>
          <div className={s.nextActionLabel}>⚡ Próxima Ação</div>
          <div className={s.nextActionText}>
            Corrija itens críticos, ajuste saldos e importe NF-e para repor o catálogo.
          </div>
        </div>
        <div className={s.nextActionActions}>
          <Link href="/dashboard/estoque/importar" className={s.btnSecondary} style={{ textDecoration: "none" }}>
            Importar XML →
          </Link>
          <Link href="/dashboard/estoque/suprimentos" className={s.btnSecondary} style={{ textDecoration: "none" }}>
            Suprimentos →
          </Link>
        </div>
      </div>


      {/* KPIs ... (mesma estrutura) ... */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "var(--space-4)",
          marginBottom: "var(--space-5)",
        }}
      >
        {[
          {
            label: "Total SKUs",
            value: totalSKUs,
            icon: "📋",
            color: "var(--brand-primary)",
            bg: "#eef2ff",
          },
          {
            label: "Total Itens",
            value: totalItems,
            icon: "📦",
            color: "#0ea5e9",
            bg: "#e0f2fe",
          },
          {
            label: "Valor em Estoque",
            value: fmt(stockValue),
            icon: "💰",
            color: "#16a34a",
            bg: "#dcfce7",
          },
          {
            label: "Estoque Crítico",
            value: lowStock,
            icon: "⚠️",
            color: "#b45309",
            bg: "#fef9c3",
          },
          {
            label: "Zerados",
            value: outOfStock,
            icon: "🔴",
            color: "#dc2626",
            bg: "#fee2e2",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={s.card}
            style={{ padding: "var(--space-4)" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: card.color,
                    marginTop: 4,
                  }}
                >
                  {card.value}
                </div>
              </div>
              <div
                style={{
                  fontSize: 22,
                  background: card.bg,
                  borderRadius: "50%",
                  width: 42,
                  height: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros Avançados (Anexo) */}
      <AdvancedFilters onFilter={handleFilter} />

      {/* Tabela */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <span className={s.cardTitle}>🗃️ Produtos em Estoque</span>
          <span className={s.cardCount}>{products.length} produtos</span>
        </div>

        {loading ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>⏳</div>
            <p className={s.emptyText}>Carregando estoque...</p>
          </div>
        ) : products.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>📦</div>
            <p className={s.emptyTitle}>Estoque vazio</p>
            <p className={s.emptyText}>
              Cadastre produtos no catálogo ou importe uma NF-e em XML.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={s.table}>
              <thead className={s.tableHead}>
                <tr>
                  <th>Referência (SKU)</th>
                  <th>Descrição / Produto</th>
                  <th>Grupo</th>
                  <th>Subgrupo</th>
                  <th>Grife</th>
                  <th>Fornecedor</th>
                  <th style={{ textAlign: "right" }}>Venda</th>
                  <th style={{ textAlign: "center" }}>Saldo</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const st = STOCK_STATUS[p.stockStatus];
                  return (
                    <tr key={p.id} className={s.tableRow}>
                      <td
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {p.sku}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>
                            {TYPE_ICON[p.category.type] || "📦"}
                          </span>
                          <div className={s.cellName}>{p.name}</div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={s.badge}
                          style={{
                            fontSize: 11,
                            background: "#eee",
                            color: "#666",
                          }}
                        >
                          {p.category.name}
                        </span>
                      </td>
                      <td>
                        {p.subcategory ? (
                          <span
                            className={s.badge}
                            style={{
                              fontSize: 11,
                              background: "#e0f2fe",
                              color: "#0369a1",
                            }}
                          >
                            {p.subcategory.name}
                          </span>
                        ) : (
                          <span style={{ color: "#ccc", fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td
                        style={{ fontSize: 13, color: "#444", fontWeight: 500 }}
                      >
                        {p.brand || "—"}
                      </td>
                      <td style={{ fontSize: 12, color: "#666" }}>
                        {p.supplierName || "—"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 800,
                          color: "var(--brand-primary)",
                        }}
                      >
                        {fmt(Number(p.salePrice))}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 900,
                            color:
                              p.stockStatus === "OUT"
                                ? "#dc2626"
                                : p.stockStatus === "LOW"
                                  ? "#b45309"
                                  : "#16a34a",
                          }}
                        >
                          {p.quantity}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontWeight: 700,
                            fontSize: 11,
                            background: st.bg,
                            color: st.color,
                          }}
                        >
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            justifyContent: "center",
                          }}
                        >
                          <ProductLabel
                            name={p.name}
                            sku={p.sku}
                            price={Number(p.salePrice)}
                            brand={p.brand || "RUPTA"}
                          />
                          <button
                            title="Histórico de Auditoria"
                            className={s.btnSecondary}
                            onClick={() => setHistoryProduct(p)}
                            style={{ fontSize: 11, padding: "4px 8px" }}
                          >
                            🕒
                          </button>
                          <button
                            id={`btn-ajustar-${p.id}`}
                            className={s.btnSecondary}
                            onClick={() => setAdjustProduct(p)}
                            style={{ fontSize: 11, padding: "4px 8px" }}
                          >
                            ⚙️
                          </button>
                          <button
                            title={p.isArchived ? "Restaurar" : "Arquivar"}
                            className={s.btnSecondary}
                            onClick={() => handleArchive(p.id, !!p.isArchived)}
                            style={{ fontSize: 11, padding: "4px 8px" }}
                          >
                            {p.isArchived ? "🔄" : "🗄️"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de ajuste */}
      {adjustProduct && (
        <AdjustModal
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
          onSaved={load}
        />
      )}

      {/* Modal de histórico (Hardening) */}
      {historyProduct && (
        <HistoryModal
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
        />
      )}
    </div>
  );
}
