"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../../shared.module.css";
import i from "./importar.module.css";

interface ParsedImportItem {
  xProd: string;
  cProd: string;
  cEAN: string;
  qCom: number;
  uCom: string;
  vUnCom: number;
  suggestedPrice: number;
  matchStatus: "FOUND" | "NEW";
}

interface ParsedImportData {
  supplier: { xNome: string; CNPJ: string };
  nNF: string;
  dhEmi: string;
  totals: { vNF: number };
  items: ParsedImportItem[];
}

export default function ImportXmlPage() {
  const router = useRouter();
  const [xmlContent, setXmlContent] = useState("");
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const importSummary = useMemo(() => {
    if (!parsedData) return null;

    const matchedItems = parsedData.items.filter(
      (item) => item.matchStatus === "FOUND",
    ).length;
    const newItems = parsedData.items.length - matchedItems;
    const totalQuantity = parsedData.items.reduce(
      (sum, item) => sum + Number(item.qCom),
      0,
    );

    return { matchedItems, newItems, totalQuantity };
  }, [parsedData]);

  const reviewQueue = useMemo(() => {
    if (!parsedData) return [];

    return [...parsedData.items].sort((a, b) => {
      if (a.matchStatus === b.matchStatus)
        return a.xProd.localeCompare(b.xProd);
      return a.matchStatus === "NEW" ? -1 : 1;
    });
  }, [parsedData]);

  const criticalReviewItems = useMemo(() => {
    return reviewQueue.filter((item) => item.matchStatus === "NEW").slice(0, 5);
  }, [reviewQueue]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setXmlContent(content);
    };
    reader.readAsText(file);
  };

  const processXml = async () => {
    if (!xmlContent) return;
    setLoading(true);
    setError("");
    setUiMessage(null);
    try {
      const res = await fetch("/api/stock/import-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml: xmlContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao processar XML");
      setParsedData(data);
      setUiMessage({
        type: "success",
        text: "Nota fiscal analisada com sucesso. Confira os itens antes de confirmar.",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao processar XML");
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!parsedData) return;
    setConfirming(true);
    setError("");
    try {
      const res = await fetch("/api/stock/import-xml/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsedData: parsedData,
          itemsToImport: parsedData.items,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Erro ao confirmar importação");

      router.push("/dashboard/estoque?imported=true");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erro ao confirmar importacao",
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>Importar NF-e (XML)</h1>
          <p className={s.pageSubtitle}>
            Povoamento automático de estoque via Nota Fiscal da Sefaz
          </p>
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

      {error && (
        <div
          className={s.card}
          style={{
            marginBottom: "var(--space-3)",
            borderLeft: "4px solid var(--status-error)",
            color: "var(--status-error)",
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
            <span style={{ fontSize: 13, fontWeight: 700 }}>{error}</span>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => setError("")}
              style={{ padding: "4px 10px" }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <div
        className={s.card}
        style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)" }}
      >
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text-tertiary)",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Fluxo Operacional
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            fontWeight: 800,
            color: "var(--text-primary)",
          }}
        >
          Analise a NF-e, confira correspondencias e confirme a entrada so
          depois de validar o que ja existe e o que sera criado.
        </div>
        <div
          style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)" }}
        >
          A importacao acelera o estoque, mas a ultima palavra continua sendo da
          conferencia humana.
        </div>
      </div>

      {!parsedData ? (
        <div
          className={s.card}
          style={{
            maxWidth: 600,
            margin: "2rem auto",
            textAlign: "center",
            padding: "3rem",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</div>
          <h3 style={{ marginBottom: "1rem" }}>
            Arraste seu arquivo XML ou cole o conteúdo
          </h3>
          <input
            type="file"
            accept=".xml"
            onChange={handleFileUpload}
            style={{ marginBottom: "1.5rem", display: "block", width: "100%" }}
          />
          <div style={{ margin: "1rem 0" }}>ou cole o texto do XML abaixo:</div>
          <textarea
            className={s.fieldInput}
            rows={6}
            placeholder="Cole o conteúdo do XML aqui..."
            value={xmlContent}
            onChange={(e) => setXmlContent(e.target.value)}
            style={{ marginBottom: "1.5rem" }}
          />
          <button
            className={s.btnPrimary}
            onClick={processXml}
            disabled={!xmlContent || loading}
            style={{ width: "100%" }}
          >
            {loading ? "Processando..." : "Analisar Nota Fiscal →"}
          </button>
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {importSummary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {[
                {
                  label: "Itens",
                  value: String(parsedData.items.length),
                  color: "#0f172a",
                  bg: "#e2e8f0",
                },
                {
                  label: "Correspondidos",
                  value: String(importSummary.matchedItems),
                  color: "#16a34a",
                  bg: "#dcfce7",
                },
                {
                  label: "Novos",
                  value: String(importSummary.newItems),
                  color: "#b45309",
                  bg: "#fef3c7",
                },
                {
                  label: "Qtd. Total",
                  value: String(importSummary.totalQuantity),
                  color: "#6366f1",
                  bg: "#eef2ff",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className={s.card}
                  style={{ padding: "var(--space-4)" }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
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
                      marginTop: 6,
                      fontSize: 22,
                      fontWeight: 900,
                      color: card.color,
                    }}
                  >
                    {card.value}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      height: 8,
                      borderRadius: 999,
                      background: card.bg,
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className={s.card} style={{ padding: "var(--space-4)" }}>
            <div
              className={s.cardHeader}
              style={{ marginBottom: "var(--space-3)" }}
            >
              <span className={s.cardTitle}>Prioridade de Conferencia</span>
              <span className={s.cardCount}>
                {criticalReviewItems.length > 0
                  ? `${criticalReviewItems.length} item(ns) pedem decisao`
                  : "Tudo corresponde ao catalogo"}
              </span>
            </div>

            {criticalReviewItems.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                Nenhum item novo exige criacao de cadastro neste XML.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "var(--space-2)" }}>
                {criticalReviewItems.map((item) => (
                  <div
                    key={`${item.cProd}-${item.xProd}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr auto auto",
                      gap: "var(--space-3)",
                      alignItems: "center",
                      border: "1px solid #fed7aa",
                      borderRadius: "var(--radius-md)",
                      background: "#fff7ed",
                      padding: "10px 12px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "var(--text-primary)",
                        }}
                      >
                        {item.xProd}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "var(--text-secondary)" }}
                      >
                        Cod. {item.cProd} • EAN {item.cEAN || "sem EAN"}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#b45309",
                        fontWeight: 700,
                      }}
                    >
                      {item.qCom} {item.uCom}
                    </div>
                    <span className={`${s.badge} ${s.badgeWarning}`}>
                      Novo cadastro
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo da Nota */}
          <div
            className={s.card}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <div>
              <div
                style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
              >
                Fornecedor
              </div>
              <div style={{ fontWeight: 600 }}>{parsedData.supplier.xNome}</div>
              <div style={{ fontSize: "0.75rem" }}>
                CNPJ: {parsedData.supplier.CNPJ}
              </div>
            </div>
            <div>
              <div
                style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
              >
                Nota Fiscal
              </div>
              <div style={{ fontWeight: 600 }}>Nº {parsedData.nNF}</div>
              <div style={{ fontSize: "0.75rem" }}>
                Emissão: {new Date(parsedData.dhEmi).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div
                style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
              >
                Valor Total
              </div>
              <div style={{ fontWeight: 600, color: "var(--brand-primary)" }}>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(parsedData.totals.vNF)}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <button
                className={s.btnSecondary}
                onClick={() => setParsedData(null)}
                style={{ marginRight: "1rem" }}
              >
                Cancelar
              </button>
              <button
                className={s.btnPrimary}
                onClick={confirmImport}
                disabled={confirming}
              >
                {confirming ? "Confirmando..." : "Confirmar Entrada no Estoque"}
              </button>
            </div>
          </div>

          {/* Tabela de Itens */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <h3 className={s.cardTitle}>
                Conferência de Itens ({parsedData.items.length})
              </h3>
            </div>
            <table className={s.table}>
              <thead className={s.tableHead}>
                <tr>
                  <th>Item / Descrição</th>
                  <th>Status</th>
                  <th>Quantidade</th>
                  <th>Custo Unit.</th>
                  <th style={{ textAlign: "right" }}>Venda Sugerida</th>
                </tr>
              </thead>
              <tbody>
                {reviewQueue.map((item, idx: number) => (
                  <tr key={idx} className={s.tableRow}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.xProd}</div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Cód: {item.cProd} | EAN: {item.cEAN}
                      </div>
                    </td>
                    <td>
                      {item.matchStatus === "FOUND" ? (
                        <span
                          className={`${s.badge} ${s.badgeSuccess}`}
                          title="Produto já cadastrado"
                        >
                          ✓ Correspondido
                        </span>
                      ) : (
                        <span
                          className={`${s.badge} ${s.badgeWarning}`}
                          title="Será criado um novo registro"
                        >
                          ★ Novo Produto
                        </span>
                      )}
                    </td>
                    <td>
                      {item.qCom} <small>{item.uCom}</small>
                    </td>
                    <td>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(item.vUnCom)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(item.suggestedPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
