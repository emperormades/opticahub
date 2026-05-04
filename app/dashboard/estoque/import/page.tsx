"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import s from "../../shared.module.css";

interface ImportPreviewItem {
  cProd: string;
  cEAN: string | null;
  xProd: string;
  qCom: number;
  vUnCom: number;
  uCom: string;
  productId: string | null;
  matchStatus: "FOUND" | "NEW";
  currentStock: number;
  suggestedPrice: number;
}

interface ImportPreviewResult {
  nNF: string;
  dhEmi: string;
  supplier: { xNome: string; CNPJ: string };
  totals: { vNF: number };
  items: ImportPreviewItem[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(String(event.target?.result || ""));
    reader.onerror = () =>
      reject(new Error("Nao foi possivel ler o arquivo XML."));
    reader.readAsText(file);
  });
}

export default function ImportarXMLCompatPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [xmlContent, setXmlContent] = useState("");
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [success, setSuccess] = useState(false);

  const processXmlContent = useCallback(async (content: string) => {
    if (!content.trim()) {
      setUiMessage({
        type: "error",
        text: "Cole ou selecione um XML valido antes de continuar.",
      });
      return;
    }

    setLoading(true);
    setUiMessage(null);
    setPreview(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/stock/import-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml: content }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        setUiMessage({
          type: "error",
          text: data?.error || "Nao foi possivel analisar a NF-e.",
        });
        return;
      }

      setXmlContent(content);
      setPreview(data);
      setUiMessage({
        type: "success",
        text: "NF-e analisada com sucesso. Revise os itens antes de confirmar.",
      });
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao processar o XML da nota fiscal.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".xml")) {
        setUiMessage({
          type: "error",
          text: "Envie um arquivo .xml valido de NF-e.",
        });
        return;
      }

      try {
        const content = await readFileAsText(file);
        await processXmlContent(content);
      } catch (error) {
        setUiMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Falha ao abrir o arquivo XML.",
        });
      }
    },
    [processXmlContent],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    e.target.value = "";
  };

  const handleConfirm = async () => {
    if (!preview) return;

    setConfirming(true);
    setUiMessage(null);

    try {
      const itemsToImport = preview.items.map((item) => ({
        productId: item.productId,
        cProd: item.cProd,
        cEAN: item.cEAN,
        xProd: item.xProd,
        qCom: item.qCom,
        vUnCom: item.vUnCom,
        salePrice: item.suggestedPrice,
      }));

      const res = await fetch("/api/stock/import-xml/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsedData: {
            nNF: preview.nNF,
            dhEmi: preview.dhEmi,
            supplier: preview.supplier,
            totals: preview.totals,
            items: preview.items,
          },
          itemsToImport,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUiMessage({
          type: "error",
          text:
            data?.error || "Nao foi possivel confirmar a entrada no estoque.",
        });
        return;
      }

      setPreview(null);
      setXmlContent("");
      setSuccess(true);
      setUiMessage({
        type: "success",
        text: "Entrada de estoque aplicada com sucesso.",
      });
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao confirmar a importacao da NF-e.",
      });
    } finally {
      setConfirming(false);
    }
  };

  const matched =
    preview?.items.filter((item) => item.matchStatus === "FOUND").length || 0;
  const newItems =
    preview?.items.filter((item) => item.matchStatus === "NEW").length || 0;

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <button
            className={s.btnGhost}
            onClick={() => router.push("/dashboard/estoque")}
          >
            {"<-"} Estoque
          </button>
          <h1 className={s.pageTitle} style={{ marginTop: 4 }}>
            Importar NF-e (XML)
          </h1>
          <p className={s.pageSubtitle}>
            Entrada assistida de estoque alinhada ao motor atual de importacao.
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

      {success && (
        <div
          className={s.card}
          style={{
            padding: "var(--space-5)",
            textAlign: "center",
            borderColor: "var(--status-success)",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "var(--status-success)",
            }}
          >
            Estoque atualizado com sucesso
          </div>
          <div
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              marginTop: 8,
            }}
          >
            A nota foi aplicada ao estoque e a conta a pagar vinculada ao
            fornecedor foi registrada.
          </div>
          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              justifyContent: "center",
              marginTop: 20,
            }}
          >
            <button
              className={s.btnSecondary}
              onClick={() => setSuccess(false)}
            >
              Importar outra NF-e
            </button>
            <button
              className={s.btnPrimary}
              onClick={() => router.push("/dashboard/estoque")}
            >
              Ver estoque
            </button>
          </div>
        </div>
      )}

      {!success && !preview && (
        <>
          <div
            className={s.card}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              padding: "var(--space-8)",
              textAlign: "center",
              border: `2px dashed ${dragging ? "var(--brand-primary)" : "var(--border-subtle)"}`,
              background: dragging ? "#eef2ff" : "var(--bg-card)",
              transition: "all 0.2s",
              cursor: "pointer",
            }}
            onClick={() => document.getElementById("xml-file-input")?.click()}
          >
            <input
              id="xml-file-input"
              type="file"
              accept=".xml"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />
            <div style={{ fontSize: 56, marginBottom: 16 }}>FILE</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              {loading ? "Processando NF-e..." : "Arraste o XML da NF-e aqui"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              {loading
                ? "Analisando itens e correspondencias..."
                : "ou clique para selecionar o arquivo .xml"}
            </div>
          </div>

          <div className={s.card} style={{ marginTop: "var(--space-4)" }}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Colar XML manualmente</span>
            </div>
            <div style={{ padding: "var(--space-4)" }}>
              <textarea
                className={s.fieldTextarea}
                rows={10}
                placeholder="Cole o conteudo do XML da NF-e aqui..."
                value={xmlContent}
                onChange={(e) => setXmlContent(e.target.value)}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "var(--space-3)",
                }}
              >
                <button
                  className={s.btnPrimary}
                  onClick={() => processXmlContent(xmlContent)}
                  disabled={loading || !xmlContent.trim()}
                >
                  {loading ? "Analisando..." : "Analisar XML"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {!success && preview && (
        <>
          <div
            className={s.card}
            style={{
              marginBottom: "var(--space-4)",
              borderLeft: "4px solid var(--brand-primary)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1fr",
                gap: "var(--space-3)",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Entrada de estoque
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  Conferencia antes da aplicacao
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginTop: 4,
                  }}
                >
                  Revise a nota, os matches do catalogo e os novos saldos antes
                  de confirmar a entrada.
                </div>
              </div>
              <div
                style={{
                  padding: "var(--space-3)",
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-md)",
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
                  Encontrados
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {matched}
                </div>
              </div>
              <div
                style={{
                  padding: "var(--space-3)",
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-md)",
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
                  Novos produtos
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color:
                      newItems > 0
                        ? "var(--status-warning)"
                        : "var(--text-primary)",
                  }}
                >
                  {newItems}
                </div>
              </div>
            </div>
          </div>

          <div
            className={s.card}
            style={{
              padding: "var(--space-4)",
              marginBottom: "var(--space-4)",
            }}
          >
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Informacoes da nota fiscal</span>
            </div>
            <div
              style={{
                padding: "var(--space-4)",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "var(--space-4)",
              }}
            >
              {[
                ["NF-e", preview.nNF],
                ["Emitente", preview.supplier.xNome],
                ["CNPJ", preview.supplier.CNPJ],
                ["Total", fmt(preview.totals.vNF)],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginTop: 2,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={s.card} style={{ marginBottom: "var(--space-4)" }}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Itens da nota</span>
              <span className={s.cardCount}>{preview.items.length} itens</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className={s.table}>
                <thead className={s.tableHead}>
                  <tr>
                    <th>Descricao</th>
                    <th>Cod. forn.</th>
                    <th style={{ textAlign: "center" }}>Qtd</th>
                    <th style={{ textAlign: "right" }}>Unit.</th>
                    <th>Produto no sistema</th>
                    <th style={{ textAlign: "center" }}>Atual</th>
                    <th style={{ textAlign: "center" }}>Novo saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((item, idx) => (
                    <tr
                      key={`${item.cProd}-${idx}`}
                      className={s.tableRow}
                      style={{
                        opacity: item.matchStatus === "FOUND" ? 1 : 0.75,
                      }}
                    >
                      <td>
                        <div className={s.cellName}>{item.xProd}</div>
                        {item.cEAN && (
                          <div
                            style={{
                              fontSize: 10,
                              fontFamily: "monospace",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            EAN: {item.cEAN}
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                        {item.cProd}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {item.qCom} {item.uCom}
                      </td>
                      <td style={{ textAlign: "right", fontSize: 12 }}>
                        {fmt(item.vUnCom)}
                      </td>
                      <td>
                        {item.matchStatus === "FOUND" ? (
                          <span
                            style={{
                              color: "var(--status-success)",
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            OK produto encontrado
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "var(--status-warning)",
                              fontSize: 12,
                            }}
                          >
                            Novo produto sera criado
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {item.matchStatus === "FOUND" ? item.currentStock : "-"}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: 900,
                          color:
                            item.matchStatus === "FOUND"
                              ? "var(--status-success)"
                              : "var(--text-primary)",
                        }}
                      >
                        {item.matchStatus === "FOUND"
                          ? item.currentStock + item.qCom
                          : item.qCom}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              justifyContent: "flex-end",
            }}
          >
            <button
              className={s.btnSecondary}
              onClick={() => {
                setPreview(null);
                setSuccess(false);
                setUiMessage(null);
              }}
            >
              {"<-"} Cancelar e revisar
            </button>
            <button
              id="btn-confirmar-xml"
              className={s.btnPrimary}
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming ? "Aplicando..." : "Confirmar entrada no estoque"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
