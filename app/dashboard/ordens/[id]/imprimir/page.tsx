"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type OSStatus =
  | "DRAFT"
  | "VALIDATING"
  | "LAB_SENT"
  | "IN_PRODUCTION"
  | "QUALITY_CHECK"
  | "DELIVERY_READY"
  | "DELIVERED"
  | "CANCELLED";

interface OSItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  itemType: string;
}

interface PrescriptionData {
  odSphere?: number | null;
  odCylinder?: number | null;
  odAxis?: number | null;
  odAddition?: number | null;
  odDnpMono?: number | null;
  oeSphere?: number | null;
  oeCylinder?: number | null;
  oeAxis?: number | null;
  oeAddition?: number | null;
  oeDnpMono?: number | null;
  mountingHeight?: number | null;
  dnpBinocular?: number | null;
  prescribedBy?: string | null;
}

interface OrderEvent {
  id: string;
}

interface OrderInstallment {
  number: number;
  dueDate: string;
  amount: string;
}

interface OrderTransaction {
  method: string;
  amount: string;
  installments: OrderInstallment[];
}

interface ServiceOrder {
  id: string;
  orderNumber: string;
  status: OSStatus;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    cpf?: string | null;
  };
  seller: { id: string; name: string; email: string };
  prescription: PrescriptionData | null;
  items: OSItem[];
  events: OrderEvent[];
  total: number;
  subtotal: number;
  discount: number;
  isPaid: boolean;
  labName: string | null;
  labOrderCode: string | null;
  labSentAt: string | null;
  labDeadline: string | null;
  labDeliveredAt: string | null;
  deliveredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  transactions?: OrderTransaction[];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const maskCpfForDisplay = (value: string | null | undefined) => {
  if (!value) return null;

  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return value;

  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
};

const STATUS_LABEL: Record<OSStatus, string> = {
  DRAFT: "Orçamento",
  VALIDATING: "Validação Técnica",
  LAB_SENT: "Enviado ao Lab",
  IN_PRODUCTION: "Em Produção",
  QUALITY_CHECK: "Conferência",
  DELIVERY_READY: "Pronto p/ Entrega",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
};

// ─── PRINT PAGE ───────────────────────────────────────────────────────────────

export default function ImprimirOSPage() {
  const { id } = useParams() as { id: string };
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setOrder(d);
        setLoading(false);
      });
  }, [id]);

  const handlePrint = () => window.print();

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Carregando...
      </div>
    );
  if (!order)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "Arial, sans-serif",
        }}
      >
        OS não encontrada.
      </div>
    );

  const presc = order.prescription;
  const hasPresc = !!presc;
  const maskedCustomerCpf = maskCpfForDisplay(order.customer.cpf);

  const crediarios =
    order.transactions?.filter((t) => t.method === "CREDIARIO") || [];
  const hasCrediario = crediarios.length > 0;

  return (
    <>
      {/* ─── CONTROLES DE UI (não aparecem na impressão) ─── */}
      <div
        className="no-print"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "#1e1e2f",
          padding: "12px 24px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          zIndex: 9999,
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontFamily: "system-ui",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          🖨️ Imprimir OS {order.orderNumber}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => window.history.back()}
          style={{
            padding: "7px 16px",
            background: "transparent",
            border: "1px solid #555",
            color: "#ccc",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "system-ui",
            fontSize: 13,
          }}
        >
          ← Voltar
        </button>
        <button
          id="btn-imprimir-os"
          onClick={handlePrint}
          style={{
            padding: "7px 20px",
            background: "#6366f1",
            border: "none",
            color: "#fff",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "system-ui",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* ─── DOCUMENTO IMPRESSO ─── */}
      <div ref={printRef} className="print-doc" style={{ paddingTop: 60 }}>
        <div className="page">
          {/* CABEÇALHO */}
          <div className="header">
            <div className="header-left">
              <div className="brand">🔷 VisionCore OS</div>
              <div className="brand-sub">Sistema de Gestão Óptica</div>
            </div>
            <div className="header-right">
              <div className="os-number">{order.orderNumber}</div>
              <div className="os-status">{STATUS_LABEL[order.status]}</div>
              <div className="os-date">
                Emitida em: {fmtDateTime(order.createdAt)}
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* CLIENTE E ATENDIMENTO */}
          <div className="section-title">👤 Cliente e Atendimento</div>
          <div className="grid-2">
            <div className="info-block">
              <div className="info-label">Cliente</div>
              <div className="info-value">{order.customer.name}</div>
            </div>
            <div className="info-block">
              <div className="info-label">CPF</div>
              <div className="info-value">{maskedCustomerCpf || "—"}</div>
            </div>
            <div className="info-block">
              <div className="info-label">Telefone / WhatsApp</div>
              <div className="info-value">
                {order.customer.phone || order.customer.whatsapp || "—"}
              </div>
            </div>
            <div className="info-block">
              <div className="info-label">Vendedor / Atendente</div>
              <div className="info-value">{order.seller.name}</div>
            </div>
          </div>

          {/* RECEITA ÓPTICA */}
          {hasPresc && (
            <>
              <div className="section-title" style={{ marginTop: 16 }}>
                👁️ Receita Óptica
              </div>
              <table className="presc-table">
                <thead>
                  <tr>
                    <th>Olho</th>
                    <th>Esférico</th>
                    <th>Cilíndrico</th>
                    <th>Eixo</th>
                    <th>Adição</th>
                    <th>DnpMono</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>OD</strong>
                    </td>
                    <td>{presc.odSphere ?? "—"}</td>
                    <td>{presc.odCylinder ?? "—"}</td>
                    <td>{presc.odAxis ?? "—"}</td>
                    <td>{presc.odAddition ?? "—"}</td>
                    <td>{presc.odDnpMono ?? "—"}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>OE</strong>
                    </td>
                    <td>{presc.oeSphere ?? "—"}</td>
                    <td>{presc.oeCylinder ?? "—"}</td>
                    <td>{presc.oeAxis ?? "—"}</td>
                    <td>{presc.oeAddition ?? "—"}</td>
                    <td>{presc.oeDnpMono ?? "—"}</td>
                  </tr>
                </tbody>
              </table>
              {presc.mountingHeight && (
                <div style={{ fontSize: 11, marginTop: 4, color: "#555" }}>
                  Altura de Montagem: <strong>{presc.mountingHeight}mm</strong>
                  {presc.dnpBinocular
                    ? ` · DNP Binocular: ${presc.dnpBinocular}mm`
                    : ""}
                  {presc.prescribedBy ? ` · Dr(a). ${presc.prescribedBy}` : ""}
                </div>
              )}
            </>
          )}

          {/* ITENS DA OS */}
          <div className="section-title" style={{ marginTop: 16 }}>
            📋 Itens da Ordem de Serviço
          </div>
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left", width: "50%" }}>Descrição</th>
                <th>Qtd</th>
                <th>Unit.</th>
                <th>Desc.</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: "center" }}>{item.quantity}x</td>
                  <td>{fmt(Number(item.unitPrice))}</td>
                  <td
                    style={{
                      color: Number(item.discount) > 0 ? "#b45309" : "#999",
                    }}
                  >
                    {Number(item.discount) > 0
                      ? `-${fmt(Number(item.discount))}`
                      : "—"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    {fmt(Number(item.total))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {Number(order.discount) > 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "right",
                      fontSize: 11,
                      color: "#b45309",
                    }}
                  >
                    Desconto total:
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      color: "#b45309",
                      fontWeight: 700,
                    }}
                  >
                    -{fmt(Number(order.discount))}
                  </td>
                </tr>
              )}
              <tr className="total-row">
                <td colSpan={4} style={{ textAlign: "right" }}>
                  <strong>TOTAL</strong>
                </td>
                <td style={{ textAlign: "right" }}>
                  <strong>{fmt(Number(order.total))}</strong>
                </td>
              </tr>
            </tfoot>
          </table>

          {/* LABORATÓRIO */}
          {order.labName && (
            <>
              <div className="section-title" style={{ marginTop: 16 }}>
                🔬 Laboratório
              </div>
              <div className="grid-2">
                <div className="info-block">
                  <div className="info-label">Laboratório</div>
                  <div className="info-value">{order.labName}</div>
                </div>
                <div className="info-block">
                  <div className="info-label">Pedido no Lab</div>
                  <div className="info-value">{order.labOrderCode || "—"}</div>
                </div>
                <div className="info-block">
                  <div className="info-label">Enviado em</div>
                  <div className="info-value">
                    {order.labSentAt ? fmtDate(order.labSentAt) : "—"}
                  </div>
                </div>
                <div className="info-block">
                  <div className="info-label">Prazo Prometido</div>
                  <div className="info-value">
                    {order.labDeadline ? fmtDate(order.labDeadline) : "—"}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* OBSERVAÇÕES */}
          {order.notes && (
            <>
              <div className="section-title" style={{ marginTop: 16 }}>
                📝 Observações
              </div>
              <div className="notes-box">{order.notes}</div>
            </>
          )}

          {/* RODAPÉ COM ASSINATURAS */}
          <div className="divider" style={{ marginTop: 32 }} />
          <div className="sign-area">
            <div className="sign-block">
              <div className="sign-line" />
              <div className="sign-label">Assinatura do Cliente</div>
              <div className="sign-label">{order.customer.name}</div>
            </div>
            <div className="sign-block">
              <div className="sign-line" />
              <div className="sign-label">Responsável pela Loja</div>
            </div>
          </div>

          <div className="footer-note">
            {order.isPaid ? "✓ Pagamento registrado" : "★ Pagamento pendente"} ·
            Gerado em {fmtDateTime(new Date().toISOString())} · VisionCore OS
          </div>
        </div>

        {hasCrediario &&
          crediarios.map((crediario, cIdx) => (
            <div
              className="page"
              key={`crediario-${cIdx}`}
              style={{ pageBreakBefore: "always", marginTop: 40 }}
            >
              <div
                className="header"
                style={{
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 8,
                  marginBottom: 24,
                }}
              >
                <div className="brand">
                  TERMO DE CONFISSÃO DE DÍVIDA E COMPROMISSO DE PAGAMENTO
                </div>
                <div className="brand-sub">
                  ANEXO À ORDEM DE SERVIÇO Nº {order.orderNumber}
                </div>
              </div>

              <div
                className="notes-box"
                style={{
                  fontSize: 13,
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                <p
                  style={{
                    marginBottom: 12,
                    textAlign: "justify",
                    lineHeight: 1.8,
                  }}
                >
                  Pelo presente instrumento, eu,{" "}
                  <strong>{order.customer.name}</strong>, inscrito(a) no
                  CPF/CNPJ sob o nº{" "}
                  <strong>{order.customer.cpf || "_______________"}</strong>,
                  doravante designado(a) DEVEDOR(A), reconheço e confesso dever
                  à <strong>VisionCore Optica (Sua Empresa)</strong>, a quantia
                  principal de <strong>{fmt(Number(crediario.amount))}</strong>,
                  decorrente da aquisição de produtos/serviços detalhados na OS
                  supramencionada.
                </p>

                <p
                  style={{
                    marginBottom: 12,
                    textAlign: "justify",
                    lineHeight: 1.8,
                  }}
                >
                  O DEVEDOR(A) compromete-se a pagar o valor total confessado em{" "}
                  <strong>{crediario.installments.length} parcelas</strong>,
                  através de boletos ou carnê, conforme o cronograma de
                  vencimentos detalhado abaixo:
                </p>

                <table
                  className="items-table"
                  style={{
                    width: "80%",
                    margin: "20px auto",
                    border: "1px solid #ccc",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: "center", width: "20%" }}>
                        Parcela
                      </th>
                      <th style={{ textAlign: "center", width: "40%" }}>
                        Vencimento
                      </th>
                      <th style={{ textAlign: "center", width: "40%" }}>
                        Valor (R$)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {crediario.installments.map((inst) => (
                      <tr key={inst.number}>
                        <td style={{ textAlign: "center" }}>
                          <strong>{inst.number}ª</strong>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {fmtDate(inst.dueDate)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {fmt(Number(inst.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p
                  style={{
                    marginBottom: 16,
                    textAlign: "justify",
                    lineHeight: 1.8,
                  }}
                >
                  <strong>Das Penalidades Financeiras:</strong> Fica
                  expressamente acordado que, no caso de atraso superior a 05
                  (cinco) dias no pagamento de qualquer prestação, incidirá
                  multa penal não compensatória de{" "}
                  <strong>2% (dois por cento)</strong> sobre o valor da parcela
                  em atraso, além de juros moratórios pró-rata die.
                </p>
                <p
                  style={{
                    marginBottom: 24,
                    textAlign: "justify",
                    lineHeight: 1.8,
                  }}
                >
                  O não pagamento das parcelas autoriza imediatamente o credor a
                  promover o apontamento e a inscrição do nome do DEVEDOR(A)
                  junto aos órgãos de proteção ao crédito (SPC/Serasa), bem como
                  executar judicialmente o presente título extrajudicial.
                </p>

                <div
                  style={{
                    textAlign: "center",
                    marginTop: 40,
                    marginBottom: 40,
                    fontSize: 13,
                  }}
                >
                  _______________________, _____ de ____________________ de
                  ______
                </div>

                <div className="sign-area" style={{ marginTop: 20 }}>
                  <div className="sign-block">
                    <div className="sign-line" />
                    <div className="sign-label">
                      DEVEDOR(A): {order.customer.name}
                    </div>
                    {maskedCustomerCpf && (
                      <div className="sign-label" style={{ fontSize: 9 }}>
                        CPF/MF: {maskedCustomerCpf}
                      </div>
                    )}
                  </div>
                  <div className="sign-block">
                    <div className="sign-line" />
                    <div className="sign-label">TESTEMUNHA 1 (Credor)</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* ─── ESTILOS ─── */}
      <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Arial', sans-serif; background: #f5f5f5; color: #111; font-size: 13px; }

                .page {
                    max-width: 800px;
                    margin: 20px auto;
                    background: #fff;
                    padding: 36px 40px;
                    border-radius: 8px;
                    box-shadow: 0 2px 20px rgba(0,0,0,0.12);
                }

                /* CABEÇALHO */
                .header { display: flex; justify-content: space-between; align-items: flex-start; }
                .brand { font-size: 22px; font-weight: 900; color: #6366f1; letter-spacing: -0.5px; }
                .brand-sub { font-size: 11px; color: #888; margin-top: 2px; }
                .header-right { text-align: right; }
                .os-number { font-size: 20px; font-weight: 900; color: #111; }
                .os-status { font-size: 12px; color: #6366f1; font-weight: 700; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
                .os-date { font-size: 11px; color: #888; margin-top: 4px; }

                .divider { height: 1px; background: #e5e5e5; margin: 16px 0; }

                /* SEÇÕES */
                .section-title {
                    font-size: 11px; font-weight: 800; text-transform: uppercase;
                    letter-spacing: 0.06em; color: #6366f1; margin-bottom: 8px;
                    border-left: 3px solid #6366f1; padding-left: 8px;
                }

                /* GRID DE INFO */
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .info-block { }
                .info-label { font-size: 10px; color: #888; text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
                .info-value { font-size: 13px; font-weight: 600; color: #111; margin-top: 1px; }

                /* TABELA DE RECEITA */
                .presc-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                .presc-table th { background: #f3f4f6; padding: 6px 10px; text-align: center; font-weight: 700; font-size: 10px; text-transform: uppercase; color: #555; }
                .presc-table td { padding: 6px 10px; text-align: center; border-bottom: 1px solid #f0f0f0; }

                /* TABELA DE ITENS */
                .items-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                .items-table th { background: #f3f4f6; padding: 7px 10px; font-size: 10px; text-transform: uppercase; color: #555; font-weight: 700; border-bottom: 2px solid #e5e5e5; }
                .items-table td { padding: 7px 10px; border-bottom: 1px solid #f5f5f5; }
                .items-table tfoot td { padding: 8px 10px; background: #fafafa; }
                .total-row td { font-size: 15px; color: #6366f1; background: #eef2ff !important; }

                /* OBSERVAÇÕES */
                .notes-box { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px; font-size: 12px; color: #555; line-height: 1.6; }

                /* ASSINATURAS */
                .sign-area { display: flex; gap: 48px; justify-content: center; margin-top: 24px; }
                .sign-block { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
                .sign-line { width: 200px; height: 1px; background: #333; }
                .sign-label { font-size: 11px; color: #555; text-align: center; }

                /* RODAPÉ */
                .footer-note { font-size: 10px; color: #aaa; text-align: center; margin-top: 20px; }

                /* ─── MEDIA PRINT ─── */
                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff; }
                    .page {
                        margin: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        padding: 20px 24px !important;
                        max-width: 100% !important;
                    }
                    @page {
                        margin: 1cm;
                        size: A4;
                    }
                }
            `}</style>
    </>
  );
}
