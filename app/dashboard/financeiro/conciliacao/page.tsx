"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import shared from "../../shared.module.css";
import styles from "./conciliacao.module.css";

type UiMessage = {
  type: "success" | "error";
  text: string;
};

type ReviewStatus = "imported" | "duplicate" | "error" | "pending";

type ReviewRow = {
  id: string;
  date: string;
  documentNumber: string;
  description: string;
  amount: number;
  kind: "ENTRADA" | "SAIDA";
  status: ReviewStatus;
};

type ParsedOfxTransaction = {
  trnamt: string;
  fitid: string;
  memo: string;
  dtposted: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  const normalized = value.includes("T") ? value : `${value}T12:00:00`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return "Data invalida";
  }

  return date.toLocaleDateString("pt-BR");
}

function normalizeOfxText(text: string) {
  const ofxParts = text.split("<OFX>");
  if (ofxParts.length < 2) {
    throw new Error("Arquivo OFX invalido.");
  }

  let xml = `<OFX>${ofxParts[1]}`;
  const tagsToClose = [
    "TRNTYPE",
    "DTPOSTED",
    "TRNAMT",
    "FITID",
    "MEMO",
    "CHECKNUM",
    "BANKID",
    "ACCTID",
    "ACCTTYPE",
    "DESC",
    "CODE",
    "STATUS",
    "DTSTART",
    "DTEND",
    "BALAMT",
    "DTASOF",
  ];

  for (const tag of tagsToClose) {
    const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, "g");
    xml = xml.replace(regex, `<${tag}>$1</${tag}>`);
  }

  return xml;
}

function readTagValue(source: string, tag: string) {
  const match = source.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "i"));
  return match?.[1]?.trim() || "";
}

function parseClientOfx(fileText: string): ReviewRow[] {
  const normalized = normalizeOfxText(fileText);
  const statementMatches = normalized.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) || [];

  if (statementMatches.length === 0) {
    throw new Error("Nenhuma transacao encontrada no arquivo.");
  }

  const parsedTransactions: ParsedOfxTransaction[] = statementMatches.map((block) => ({
    trnamt: readTagValue(block, "TRNAMT"),
    fitid: readTagValue(block, "FITID"),
    memo: readTagValue(block, "MEMO"),
    dtposted: readTagValue(block, "DTPOSTED"),
  }));

  return parsedTransactions.map((transaction, index) => {
    const amount = Number(transaction.trnamt || 0);
    const rawDate = transaction.dtposted.slice(0, 8);
    const parsedDate =
      rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : "";

    return {
      id: transaction.fitid || `row-${index + 1}`,
      date: parsedDate,
      documentNumber: transaction.fitid || `DOC-${index + 1}`,
      description: transaction.memo || "Lancamento sem descricao",
      amount: Math.abs(amount),
      kind: amount >= 0 ? "ENTRADA" : "SAIDA",
      status: parsedDate ? "pending" : "error",
    };
  });
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function ConciliacaoDashboard() {
  const { status } = useSession();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [globalMessage, setGlobalMessage] = useState<UiMessage | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [router, status]);

  const summary = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        if (row.status === "imported") {
          accumulator.imported += 1;
        } else if (row.status === "duplicate") {
          accumulator.ignored += 1;
        } else if (row.status === "error") {
          accumulator.errors += 1;
        }

        return accumulator;
      },
      { imported: 0, ignored: 0, errors: 0 },
    );
  }, [rows]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setGlobalMessage(null);

    if (!file) {
      setRows([]);
      return;
    }

    setParsingFile(true);

    try {
      const fileText = await file.text();
      const parsedRows = parseClientOfx(fileText);
      setRows(parsedRows);
    } catch (error) {
      setRows([]);
      setGlobalMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Nao foi possivel ler o arquivo selecionado.",
      });
    } finally {
      setParsingFile(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      return;
    }

    setUploading(true);
    setGlobalMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/financial/ofx/import", {
        method: "POST",
        body: formData,
      });

      const body = await readJson(response);

      if (response.ok) {
        setRows((current) =>
          current.map((row) => ({
            ...row,
            status: row.status === "error" ? "error" : "imported",
          })),
        );
        setGlobalMessage({
          type: "success",
          text: `${String(body?.transacoesImportadas || rows.length)} transacao(oes) processada(s) com sucesso.`,
        });
        return;
      }

      if (response.status === 409) {
        setRows((current) =>
          current.map((row) => ({
            ...row,
            status: row.status === "error" ? "error" : "duplicate",
          })),
        );
        setGlobalMessage({
          type: "error",
          text: String(body?.error || "Arquivo ja importado anteriormente."),
        });
        return;
      }

      setRows((current) =>
        current.map((row) => ({
          ...row,
          status: "error",
        })),
      );
      setGlobalMessage({
        type: "error",
        text: String(body?.error || "Erro ao processar arquivo OFX."),
      });
    } catch {
      setRows((current) =>
        current.map((row) => ({
          ...row,
          status: "error",
        })),
      );
      setGlobalMessage({
        type: "error",
        text: "Falha de rede ao enviar o arquivo.",
      });
    } finally {
      setUploading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className={shared.page}>
        <div className={styles.loadingCard}>Carregando conciliacao OFX...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Conciliacao OFX Visual</h1>
          <p className={shared.pageSubtitle}>
            Importe o extrato e confira o resultado linha a linha antes da
            conciliacao manual.
          </p>
        </div>
      </div>

      {globalMessage ? (
        <div
          className={`${styles.feedbackBanner} ${
            globalMessage.type === "error"
              ? styles.feedbackError
              : styles.feedbackSuccess
          }`}
        >
          <span>{globalMessage.text}</span>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setGlobalMessage(null)}
          >
            Fechar
          </button>
        </div>
      ) : null}

      <section className={styles.uploadCard}>
        <div>
          <span className={styles.cardEyebrow}>Upload de Arquivo .ofx</span>
          <h2 className={styles.cardTitle}>Enviar extrato bancario</h2>
          <p className={styles.cardText}>
            Selecione o arquivo OFX para gerar a conferencia visual imediata da
            importacao.
          </p>
        </div>

        <div className={styles.uploadControls}>
          <label className={styles.fileDropzone}>
            <span className={styles.fileDropLabel}>
              {selectedFile ? selectedFile.name : "Selecionar arquivo .ofx"}
            </span>
            <span className={styles.fileDropMeta}>
              {parsingFile ? "Lendo arquivo..." : "Clique para escolher um arquivo local"}
            </span>
            <input
              type="file"
              accept=".ofx"
              onChange={handleFileChange}
              className={styles.hiddenInput}
            />
          </label>

          <button
            type="button"
            className={styles.btnPrimary}
            disabled={!selectedFile || uploading || parsingFile}
            onClick={() => void handleUpload()}
          >
            {uploading ? "Enviando..." : "Importar OFX"}
          </button>
        </div>
      </section>

      <section className={styles.summaryStrip}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Novas</span>
          <strong className={styles.summaryValue}>{summary.imported}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Ignoradas</span>
          <strong className={styles.summaryValue}>{summary.ignored}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Erros</span>
          <strong className={styles.summaryValue}>{summary.errors}</strong>
        </div>
        <div className={styles.summarySentence}>
          {summary.imported} transações novas. {summary.ignored} ignoradas.{" "}
          {summary.errors} erros.
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <h2 className={styles.tableTitle}>Tabela de Conferencia</h2>
            <p className={styles.tableSubtitle}>
              Feedback visual classico por linha com base no resultado do upload.
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Nenhum arquivo conferido ainda.</p>
            <p className={styles.emptyText}>
              Selecione um OFX para montar a tabela de conferencia da importacao.
            </p>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Documento</th>
                  <th>Descricao</th>
                  <th>Tipo</th>
                  <th className={styles.moneyHead}>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.id}-${row.documentNumber}`}>
                    <td>{formatDate(row.date)}</td>
                    <td className={styles.codeCell}>{row.documentNumber}</td>
                    <td>{row.description}</td>
                    <td>{row.kind}</td>
                    <td className={styles.moneyCell}>{formatCurrency(row.amount)}</td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${
                          row.status === "imported"
                            ? styles.statusImported
                            : row.status === "duplicate"
                              ? styles.statusDuplicate
                              : row.status === "error"
                                ? styles.statusError
                                : styles.statusPending
                        }`}
                      >
                        {row.status === "imported"
                          ? "✅ Importado"
                          : row.status === "duplicate"
                            ? "⚠️ Duplicado / Ja Importado"
                            : row.status === "error"
                              ? "❌ Erro"
                              : "Aguardando envio"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
