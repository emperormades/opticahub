"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import bwipjs from "bwip-js";

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
  observation?: string | null;
}

interface ServiceOrder {
  id: string;
  orderNumber: string;
  status: OSStatus;
  customer: { name: string };
  seller: { name: string };
  prescription: PrescriptionData | null;
  items: OSItem[];
  notes: string | null;
  createdAt: string;
  labName: string | null;
  labOrderCode: string | null;
  labDeadline: string | null;
}

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

export default function ImprimirLabPage() {
  const { id } = useParams() as { id: string };
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate barcode directly on canvas
  useEffect(() => {
    if (order) {
      try {
        bwipjs.toCanvas("barcode-canvas", {
          bcid: "code128", // Barcode type
          text: order.orderNumber, // Text to encode
          scale: 2, // 3x scaling factor
          height: 10, // Bar height, in millimeters
          includetext: true, // Show human-readable text
          textxalign: "center", // Always good
        });
      } catch (e) {
        console.error("Barcode generation error", e);
      }
    }
  }, [order]);

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
        Carregando ficha...
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

  // Para laboratório, importam APENAS armações (FRAME) e Lentes (LENS). Não mostramos SERVIÇOS avulsos sem sentido, e NÃO MOSTRAMOS PREÇOS.
  const labItems = order.items.filter(
    (item) => item.itemType === "FRAME" || item.itemType === "LENS",
  );

  return (
    <>
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
          🔬 Imprimir Ficha de Laboratório
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
          onClick={handlePrint}
          style={{
            padding: "7px 20px",
            background: "#ec4899",
            border: "none",
            color: "#fff",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "system-ui",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Imprimir Ficha (Lab)
        </button>
      </div>

      <div className="print-doc" style={{ paddingTop: 60 }}>
        <div className="page thermal-optimized">
          {/* CABEÇALHO LADO A LADO DO BARCODE */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2px solid #000",
              paddingBottom: 16,
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                FICHA DE MONTAGEM
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {" "}
                VisionCore Optics Lab System
              </div>
              <div style={{ fontSize: 13, marginTop: 8, fontWeight: 700 }}>
                OS: {order.orderNumber}
              </div>
              <div style={{ fontSize: 11, marginTop: 2 }}>
                Data Exp.: {fmtDateTime(order.createdAt)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <canvas id="barcode-canvas" style={{ width: 140 }}></canvas>
            </div>
          </div>

          <div className="info-block" style={{ marginBottom: 16 }}>
            <strong>CLIENTE:</strong>{" "}
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {order.customer.name}
            </span>
            <br />
            <span style={{ fontSize: 11 }}>
              Vendedor responsável: {order.seller.name}
            </span>
          </div>

          {/* RECEITA ÓPTICA MACRO */}
          {hasPresc ? (
            <div
              style={{
                border: "2px solid #000",
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  marginBottom: 12,
                  textAlign: "center",
                  background: "#000",
                  color: "#fff",
                  padding: 4,
                }}
              >
                PRESCRIÇÃO ÓPTICA
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "center",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{ borderBottom: "1px solid #000", padding: 8 }}
                    ></th>
                    <th style={{ borderBottom: "1px solid #000", padding: 8 }}>
                      ESF
                    </th>
                    <th style={{ borderBottom: "1px solid #000", padding: 8 }}>
                      CIL
                    </th>
                    <th style={{ borderBottom: "1px solid #000", padding: 8 }}>
                      EIXO
                    </th>
                    <th style={{ borderBottom: "1px solid #000", padding: 8 }}>
                      ADD
                    </th>
                    <th
                      style={{
                        borderBottom: "1px solid #000",
                        padding: 8,
                        borderLeft: "1px solid #ccc",
                      }}
                    >
                      DNP
                    </th>
                    <th style={{ borderBottom: "1px solid #000", padding: 8 }}>
                      ALT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      style={{
                        fontWeight: 900,
                        fontSize: 18,
                        borderBottom: "1px solid #eee",
                        padding: 8,
                      }}
                    >
                      OD
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 8,
                        fontSize: 16,
                      }}
                    >
                      {presc.odSphere ?? "—"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 8,
                        fontSize: 16,
                      }}
                    >
                      {presc.odCylinder ?? "—"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 8,
                        fontSize: 16,
                      }}
                    >
                      {presc.odAxis ?? "—"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 8,
                        fontSize: 16,
                      }}
                    >
                      {presc.odAddition ?? "—"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 8,
                        borderLeft: "1px solid #ccc",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      {presc.odDnpMono ?? "—"}
                    </td>
                    <td
                      rowSpan={2}
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 8,
                        fontSize: 18,
                        fontWeight: 900,
                      }}
                    >
                      {presc.mountingHeight ?? "—"}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        fontWeight: 900,
                        fontSize: 18,
                        borderBottom: "1px solid #eee",
                        padding: 8,
                      }}
                    >
                      OE
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 8,
                        fontSize: 16,
                      }}
                    >
                      {presc.oeSphere ?? "—"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 8,
                        fontSize: 16,
                      }}
                    >
                      {presc.oeCylinder ?? "—"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 8,
                        fontSize: 16,
                      }}
                    >
                      {presc.oeAxis ?? "—"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 8,
                        fontSize: 16,
                      }}
                    >
                      {presc.oeAddition ?? "—"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #eee",
                        padding: 8,
                        borderLeft: "1px solid #ccc",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      {presc.oeDnpMono ?? "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
              {presc.observation && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 8,
                    background: "#f5f5f5",
                    fontSize: 12,
                    borderRadius: 4,
                  }}
                >
                  <strong>Obs Médica:</strong> {presc.observation}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                border: "2px dashed #ccc",
                padding: 20,
                textAlign: "center",
                marginBottom: 20,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              SEM PRESCRIÇÃO ÓPTICA VINCULADA
            </div>
          )}

          {/* ITENS FISICOS */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                textTransform: "uppercase",
                marginBottom: 8,
                borderBottom: "1px solid #000",
                paddingBottom: 4,
              }}
            >
              PRODUTOS ENVIADOS / MONTAGEM
            </div>
            {labItems.length > 0 ? (
              <table
                style={{
                  width: "100%",
                  fontSize: 13,
                  borderCollapse: "collapse",
                }}
              >
                <tbody>
                  {labItems.map((item, idx) => (
                    <tr key={idx}>
                      <td
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px dashed #ccc",
                          width: "30px",
                        }}
                      >
                        <strong>{item.quantity}x</strong>
                      </td>
                      <td
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px dashed #ccc",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            background:
                              item.itemType === "FRAME" ? "#000" : "#ececec",
                            color: item.itemType === "FRAME" ? "#fff" : "#000",
                            padding: "2px 6px",
                            borderRadius: 4,
                            marginRight: 8,
                            fontWeight: 700,
                          }}
                        >
                          {item.itemType}
                        </span>
                        {item.description}
                      </td>
                      <td
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px dashed #ccc",
                          textAlign: "right",
                        }}
                      >
                        [ ] Conferido
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: 12, color: "#555" }}>
                Nenhum produto físico ('LENS' ou 'FRAME') incluído na OS.
              </div>
            )}
          </div>

          {/* DADOS DO LAB EXT / OBS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {order.labName && (
              <div
                style={{
                  border: "1px solid #000",
                  padding: 12,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700 }}>
                  LABORATÓRIO TERCEIRO
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, marginTop: 4 }}>
                  {order.labName}
                </div>
                {order.labOrderCode && (
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Cód: {order.labOrderCode}
                  </div>
                )}
                {order.labDeadline && (
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Prometido: {fmtDate(order.labDeadline)}
                  </div>
                )}
              </div>
            )}
            {order.notes && (
              <div
                style={{
                  border: "1px solid #000",
                  padding: 12,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700 }}>
                  OBSERVAÇÕES DA LOJA
                </div>
                <div
                  style={{ fontSize: 12, marginTop: 4, fontStyle: "italic" }}
                >
                  "{order.notes}"
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: "2px dashed #000",
              paddingTop: 16,
              textAlign: "center",
              fontSize: 10,
              color: "#333",
            }}
          >
            Documento Interno de Laboratório - Não é documento fiscal.
            <br />
            Impresso em {fmtDateTime(new Date().toISOString())}
          </div>
        </div>
      </div>

      {/* ─── ESTILOS ESPECÍFICOS PARA LAB (HIGH CONTRAST / FONTES GRANDES) ─── */}
      <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #e5e7eb; color: #000; }

                .page {
                    max-width: 800px;  /* Pode ser adaptada para impressoras termais de 80mm com media query print */
                    margin: 0 auto;
                    background: #fff;
                    padding: 40px;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }

                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff; }
                    .page {
                        margin: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        padding: 10px !important;
                        max-width: 100% !important;
                    }
                    /* Otimização para thermal ou A4 P&B */
                    .thermal-optimized { filter: contrast(1.2); }
                    @page { margin: 10mm; size: auto; }
                }
            `}</style>
    </>
  );
}
