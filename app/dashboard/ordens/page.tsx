"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import s from "../shared.module.css";
import k from "./ordens.module.css";

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

interface OrderItem {
  id: string;
  description: string;
  total: number;
  itemType: string;
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
  };
  seller: { id: string; name: string };
  items: OrderItem[];
  total: number;
  isPaid: boolean;
  reworkCount: number;
  labName: string | null;
  labDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  _count: { events: number };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  salePrice: number;
  category: { type: string };
  barcode?: string | null;
  stockItems: { quantity: number }[];
}

interface UniversalSearchOrder {
  id: string;
  orderNumber: string;
  status: OSStatus;
  total: number;
  isPaid: boolean;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    whatsapp: string | null;
  };
}

interface UniversalSearchCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  matchedByCpf: boolean;
}

interface UniversalSearchProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: number;
  itemType: string;
  stock: number;
}

interface UniversalSearchResults {
  orders: UniversalSearchOrder[];
  customers: UniversalSearchCustomer[];
  products: UniversalSearchProduct[];
}

interface OpticalValidationResult {
  diameterCalc?: { diameterMin?: number; dpa?: number; decentration?: number };
  thicknessCalc?: {
    estimatedThickness?: number;
    recommendEdgeThickening?: boolean;
  };
  curveWarning?: string | null;
}

// ─── KANBAN CONFIG ────────────────────────────────────────────────────────────

const COLUMNS: {
  status: OSStatus;
  label: string;
  icon: string;
  color: string;
}[] = [
  { status: "DRAFT", label: "Orçamento", icon: "📝", color: "#6366f1" },
  { status: "VALIDATING", label: "Validação", icon: "🔍", color: "#f59e0b" },
  { status: "LAB_SENT", label: "No Lab", icon: "📦", color: "#3b82f6" },
  { status: "IN_PRODUCTION", label: "Produção", icon: "⚙️", color: "#8b5cf6" },
  {
    status: "QUALITY_CHECK",
    label: "Conferência",
    icon: "🔬",
    color: "#ec4899",
  },
  { status: "DELIVERY_READY", label: "Pronto", icon: "✅", color: "#10b981" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const paymentMethodLabel = (method: string) =>
  ({
    DINHEIRO: "Dinheiro",
    PIX: "PIX",
    CARTAO_CREDITO: "Cartao de Credito",
    CARTAO_DEBITO: "Cartao de Debito",
    CREDIARIO: "Crediario",
  })[method] || method.replaceAll("_", " ");

function getSLAColor(labDeadline: string | null): string {
  if (!labDeadline) return "var(--text-tertiary)";
  const diff = new Date(labDeadline).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "var(--status-error)";
  if (days < 1) return "var(--status-warning)";
  if (days < 3) return "var(--status-warning)";
  return "var(--status-success)";
}

// ─── OS CARD ─────────────────────────────────────────────────────────────────

function OSCard({
  order,
  onClick,
}: {
  order: ServiceOrder;
  onClick: () => void;
}) {
  const slaColor = getSLAColor(order.labDeadline);
  const isOverdue =
    order.labDeadline && new Date(order.labDeadline) < new Date();

  return (
    <div
      className={k.card}
      onClick={onClick}
      id={`os-card-${order.orderNumber}`}
    >
      <div className={k.cardTop}>
        <span className={k.orderNum}>{order.orderNumber}</span>
        {order.reworkCount > 0 && (
          <span className={k.reworkBadge}>↩ {order.reworkCount}x</span>
        )}
        {order.isPaid && <span className={k.paidBadge}>✓ Pago</span>}
      </div>
      <div className={k.customerName}>{order.customer.name}</div>
      {order.items.length > 0 && (
        <div className={k.itemPreview}>
          {order.items[0].description}
          {order.items.length > 1 && ` +${order.items.length - 1}`}
        </div>
      )}
      <div className={k.cardBottom}>
        <span className={k.total}>{formatCurrency(Number(order.total))}</span>
        <div className={k.cardMeta}>
          {order.labDeadline && (
            <span className={k.sla} style={{ color: slaColor }}>
              {isOverdue ? "⚠️ Atrasado" : `⏱ ${formatDate(order.labDeadline)}`}
            </span>
          )}
          <span className={k.date}>{formatDate(order.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

const defaultItem = {
  productId: "",
  description: "",
  quantity: 1,
  unitPrice: "",
  discount: "0",
  itemType: "LENTES",
};

const defaultForm = {
  customerId: "",
  prescriptionId: "",
  notes: "",
  labName: "",
  labDeadline: "",
  items: [{ ...defaultItem }],
  transactions: [] as {
    method: string;
    amount: string;
    installmentsCount: number;
  }[],
  opticalParams: {
    dma: "",
    aro: "",
    ponte: "",
    lensIndex: "",
    lensBaseCurve: "",
    isFrameCurved: false,
  },
  opticalResults: null as OpticalValidationResult | null,
};

export default function OrdensPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<
    {
      id: string;
      name: string;
      prescriptions: { id: string; version: number }[];
    }[]
  >([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<
    "ALL" | "OPEN" | "READY" | "OVERDUE"
  >("ALL");

  // UI states
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [scannerInput, setScannerInput] = useState("");
  const [formMessage, setFormMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [universalResults, setUniversalResults] =
    useState<UniversalSearchResults>({
      orders: [],
      customers: [],
      products: [],
    });
  const [loadingUniversal, setLoadingUniversal] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, limit: "200" });
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetch("/api/customers?limit=200")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers || []));
    fetch("/api/products?limit=500")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));
  }, []);

  useEffect(() => {
    const normalizedSearch = search.trim();

    if (normalizedSearch.length < 2) {
      setUniversalResults({ orders: [], customers: [], products: [] });
      setLoadingUniversal(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoadingUniversal(true);
      try {
        const params = new URLSearchParams({ q: normalizedSearch, limit: "5" });
        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) {
          setUniversalResults({ orders: [], customers: [], products: [] });
          return;
        }
        const data = await res.json();
        setUniversalResults({
          orders: Array.isArray(data?.orders) ? data.orders : [],
          customers: Array.isArray(data?.customers) ? data.customers : [],
          products: Array.isArray(data?.products) ? data.products : [],
        });
      } catch {
        setUniversalResults({ orders: [], customers: [], products: [] });
      } finally {
        setLoadingUniversal(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [search]);

  const ordersForStatus = (status: OSStatus) =>
    orders.filter((o) => o.status === status);

  // ─── FORM ITENS (CARRINHO) ───
  const handleItemChange = (
    idx: number,
    field: string,
    value: string | number,
  ) => {
    setForm((prev) => {
      const newItems = [...prev.items];
      newItems[idx] = { ...newItems[idx], [field]: value };

      // Se selecionar um produto, auto-preencher valores
      if (field === "productId" && value) {
        const p = products.find((prod) => prod.id === value);
        if (p) {
          newItems[idx].description = p.name;
          newItems[idx].unitPrice = String(p.salePrice);
          newItems[idx].itemType = p.category?.type || "LENTES";
        }
      }
      return { ...prev, items: newItems };
    });
  };

  const addItem = () =>
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...defaultItem }],
    }));
  const removeItem = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));

  const appendProductToCart = (product: {
    id: string;
    name: string;
    salePrice: number;
    itemType: string;
  }) => {
    const newItem = {
      productId: product.id,
      description: product.name,
      quantity: 1,
      unitPrice: String(product.salePrice),
      discount: "0",
      itemType: product.itemType || "LENTES",
    };

    setForm((prev) => {
      const isFirstEmpty =
        prev.items.length === 1 &&
        !prev.items[0].productId &&
        !prev.items[0].description;
      if (isFirstEmpty) {
        return { ...prev, items: [newItem] };
      }
      return { ...prev, items: [...prev.items, newItem] };
    });
  };

  const handleBarcodeScan = (code: string) => {
    const normalizedCode = code.trim();
    if (!normalizedCode) return;
    const p = products.find(
      (prod) => prod.sku === normalizedCode || prod.barcode === normalizedCode,
    );
    if (p) {
      const newItem = {
        productId: p.id,
        description: p.name,
        quantity: 1,
        unitPrice: String(p.salePrice),
        discount: "0",
        itemType: p.category?.type || "LENTES",
      };
      // Se o primeiro item for vazio, substitui. Senão, adiciona.
      setForm((prev) => {
        const isFirstEmpty =
          prev.items.length === 1 &&
          !prev.items[0].productId &&
          !prev.items[0].description;
        if (isFirstEmpty) {
          return { ...prev, items: [newItem] };
        }
        return { ...prev, items: [...prev.items, newItem] };
      });
      setScannerInput("");
      setFormMessage(null);
    } else {
      setFormMessage({
        type: "error",
        text: `Nenhum produto encontrado para o codigo "${normalizedCode}".`,
      });
    }
  };

  const calcTotal = () =>
    form.items.reduce((sum, i) => {
      const price = parseFloat(String(i.unitPrice) || "0");
      const disc = parseFloat(String(i.discount) || "0");
      return sum + (price * i.quantity - disc);
    }, 0);

  // ─── FORM TRANSAÇÕES (PAGAMENTO) ───
  const calcPaid = () =>
    form.transactions.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);
  const calcBalance = () => calcTotal() - calcPaid();
  const calcRemaining = () => Math.max(0, calcBalance());
  const calcOverpayment = () => Math.max(0, calcPaid() - calcTotal());

  const addTransaction = () => {
    const remaining = calcRemaining();
    setForm((prev) => ({
      ...prev,
      transactions: [
        ...prev.transactions,
        { method: "PIX", amount: String(remaining), installmentsCount: 1 },
      ],
    }));
  };
  const updateTransaction = (
    idx: number,
    field: string,
    val: string | number,
  ) => {
    const newTx = [...form.transactions];
    newTx[idx] = { ...newTx[idx], [field]: val };
    setForm((prev) => ({ ...prev, transactions: newTx }));
  };
  const removeTransaction = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((_, i) => i !== idx),
    }));
  };

  const validateOptical = async () => {
    if (
      !form.prescriptionId ||
      !form.opticalParams.dma ||
      !form.opticalParams.aro ||
      !form.opticalParams.ponte
    ) {
      setFormMessage({
        type: "error",
        text: "Preencha DMA, Aro e Ponte na ficha tecnica antes de validar.",
      });
      return;
    }
    try {
      const res = await fetch("/api/optical/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId: form.prescriptionId,
          ...form.opticalParams,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setForm((prev) => ({ ...prev, opticalResults: data }));
        setFormMessage({
          type: "success",
          text: "Validacao optica concluida com sucesso.",
        });
      } else {
        setFormMessage({
          type: "error",
          text: data.error || "Erro na validacao optica.",
        });
      }
    } catch (e) {
      setFormMessage({
        type: "error",
        text: "Falha na conexao com a Engine Optica.",
      });
    }
  };

  const nextStep = () => {
    if (
      !form.customerId ||
      form.items.some((i) => !i.description || !i.unitPrice)
    ) {
      setFormMessage({
        type: "error",
        text: "Preencha os itens e selecione o cliente antes de continuar.",
      });
      return;
    }
    setModalStep(2);
    // Auto add primeira transacao com o valor total
    if (form.transactions.length === 0) {
      setForm((prev) => ({
        ...prev,
        transactions: [
          { method: "PIX", amount: String(calcTotal()), installmentsCount: 1 },
        ],
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = calcTotal();
    const paidAmount = calcPaid();

    if (
      Math.abs(totalAmount - paidAmount) > 0.01 &&
      form.transactions.length > 0
    ) {
      setFormMessage({
        type: "error",
        text: `O valor dos pagamentos (${formatCurrency(paidAmount)}) nao bate com o valor da venda (${formatCurrency(totalAmount)}).`,
      });
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        items: form.items.map((i) => ({
          ...i,
          unitPrice: parseFloat(String(i.unitPrice) || "0"),
          discount: parseFloat(String(i.discount) || "0"),
        })),
        transactions: form.transactions.map((t) => ({
          ...t,
          amount: parseFloat(t.amount || "0"),
        })),
      };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowModal(false);
        setForm(defaultForm);
        setModalStep(1);
        setFormMessage({ type: "success", text: "OS criada com sucesso." });
        fetchOrders();
      } else {
        const err = await res.json();
        setFormMessage({
          type: "error",
          text: err.error || "Erro ao criar OS.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const primaryItem =
    form.items.find((item) => item.description.trim()) || form.items[0];
  const checkoutReady =
    form.transactions.length > 0 && Math.abs(calcBalance()) <= 0.01;
  const totalOS = orders.length;
  const totalAtivas = orders.filter(
    (o) => !["DELIVERED", "CANCELLED"].includes(o.status),
  ).length;
  const totalProntas = ordersForStatus("DELIVERY_READY").length;

  // Aplicar quickFilter
  const filteredOrders = orders.filter((o) => {
    if (quickFilter === "OPEN")
      return !["DELIVERED", "CANCELLED", "DELIVERY_READY"].includes(o.status);
    if (quickFilter === "READY") return o.status === "DELIVERY_READY";
    if (quickFilter === "OVERDUE")
      return (
        o.labDeadline &&
        new Date(o.labDeadline) < new Date() &&
        !["DELIVERED", "CANCELLED"].includes(o.status)
      );
    return true;
  });

  const filteredOrdersForStatus = (status: OSStatus) =>
    filteredOrders.filter((o) => o.status === status);
  const quickFilterTabs: Array<{
    id: "ALL" | "OPEN" | "READY" | "OVERDUE";
    label: string;
  }> = [
    { id: "ALL", label: "Todas as OS" },
    { id: "OPEN", label: "Em Andamento" },
    { id: "READY", label: "Prontas (Entrega)" },
    { id: "OVERDUE", label: "Atrasadas (SLA Lab)" },
  ];

  return (
    <div className={k.page}>
      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <div className={k.pageHeader}>
        <div>
          <h1 className={k.pageTitle}>Ordens de Serviço</h1>
          <p className={k.pageSubtitle}>
            Venda assistida, acompanhamento de laboratório e entrega ao cliente.
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button
            className={viewMode === "kanban" ? s.btnPrimary : s.btnSecondary}
            onClick={() => setViewMode("kanban")}
          >
            ⊞ Kanban
          </button>
          <button
            className={viewMode === "list" ? s.btnPrimary : s.btnSecondary}
            onClick={() => setViewMode("list")}
          >
            ☰ Lista
          </button>
        </div>
      </div>

      {/* ─── STATS BAR ──────────────────────────────────────────────────── */}
      <div className={k.statsBar}>
        <div className={k.statItem}>
          <span className={k.statLabel}>Total de OS</span>
          <strong className={k.statValue}>{totalOS}</strong>
        </div>
        <div className={k.statDivider} />
        <div className={k.statItem}>
          <span className={k.statLabel}>Em andamento</span>
          <strong className={k.statValue}>{totalAtivas}</strong>
        </div>
        <div className={k.statDivider} />
        <div className={k.statItem}>
          <span className={k.statLabel}>Prontas p/ entrega</span>
          <strong className={k.statValue} style={{ color: "var(--status-success)" }}>{totalProntas}</strong>
        </div>
        <div className={k.statDivider} />
        <div className={k.statItem}>
          <span className={k.statLabel}>Atrasadas (Lab)</span>
          <strong className={k.statValue} style={{ color: "var(--status-error)" }}>
            {filteredOrdersForStatus("IN_PRODUCTION").filter((o) => o.labDeadline && new Date(o.labDeadline) < new Date()).length}
          </strong>
        </div>
      </div>

        {/* 4 Quick Action Buttons */}
        <div className={s.card} style={{ marginBottom: "var(--space-4)" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "var(--space-3)",
              alignItems: "stretch",
            }}
          >
            <button
              type="button"
              className={s.btnPrimary}
              onClick={() => {
                setModalStep(1);
                setShowModal(true);
              }}
              style={{
                display: "grid",
                gap: 4,
                textAlign: "left",
                justifyContent: "flex-start",
                minHeight: 72,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800 }}>+ Nova O.S. (PDV)</span>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255, 255, 255, 0.8)",
                  lineHeight: 1.35,
                }}
              >
                Ir direto para vendas, carrinho e checkout.
              </span>
            </button>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => router.push("/dashboard/ordens/orcamentos-abandonados")}
              style={{
                display: "grid",
                gap: 4,
                textAlign: "left",
                justifyContent: "flex-start",
                minHeight: 72,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800 }}>Orçamentos Abandonados</span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  lineHeight: 1.35,
                }}
              >
                Voltar para propostas não concluídas e resgatar a venda.
              </span>
            </button>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => setQuickFilter("OVERDUE")}
              style={{
                display: "grid",
                gap: 4,
                textAlign: "left",
                justifyContent: "flex-start",
                minHeight: 72,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800 }}>OS em Atraso (Lab)</span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  lineHeight: 1.35,
                }}
              >
                Ordens cujo prazo do laboratório já estourou.
              </span>
            </button>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => setQuickFilter("READY")}
              style={{
                display: "grid",
                gap: 4,
                textAlign: "left",
                justifyContent: "flex-start",
                minHeight: 72,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800 }}>Entregar OS ao Cliente</span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  lineHeight: 1.35,
                }}
              >
                Ordens prontas no estoque da loja esperando retirada.
              </span>
            </button>
          </div>
        </div>


      <div
        className={s.card}
        style={{
          marginBottom: "var(--space-4)",
          borderLeft: "4px solid var(--status-warning)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: "var(--space-4)",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--status-warning)",
              }}
            >
              Fluxo de Estorno e Ajuste
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              Cancelamentos e desfazimentos comerciais devem ser tratados pelo
              detalhe da OS, onde o sistema mostra impacto em estoque, parcelas
              e estorno financeiro antes da confirmação.
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => setViewMode("list")}
            >
              Abrir Lista Operacional
            </button>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              Use a ação <strong>Estorno / Ajuste</strong> nas OS ativas para ir
              direto ao fluxo correto.
            </div>
          </div>
        </div>
      </div>

      {search.trim().length >= 2 && (
        <div className={s.card} style={{ marginBottom: "var(--space-4)" }}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Busca Universal</span>
            <span className={s.cardCount}>
              {loadingUniversal
                ? "Buscando..."
                : `${universalResults.orders.length + universalResults.customers.length + universalResults.products.length} resultados rápidos`}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                }}
              >
                Ordens
              </div>
              {universalResults.orders.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  Nenhuma OS encontrada.
                </div>
              ) : (
                universalResults.orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    className={s.btnSecondary}
                    onClick={() => router.push(`/dashboard/ordens/${order.id}`)}
                    style={{
                      display: "grid",
                      gap: 2,
                      textAlign: "left",
                      justifyContent: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800 }}>
                      {order.orderNumber}
                    </span>
                    <span
                      style={{ fontSize: 11, color: "var(--text-secondary)" }}
                    >
                      {order.customer.name} • {formatCurrency(order.total)}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                }}
              >
                Clientes
              </div>
              {universalResults.customers.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  Nenhum cliente encontrado.
                </div>
              ) : (
                universalResults.customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className={s.btnSecondary}
                    onClick={() =>
                      router.push(`/dashboard/clientes/${customer.id}`)
                    }
                    style={{
                      display: "grid",
                      gap: 2,
                      textAlign: "left",
                      justifyContent: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800 }}>
                      {customer.name} {customer.matchedByCpf ? "• CPF" : ""}
                    </span>
                    <span
                      style={{ fontSize: 11, color: "var(--text-secondary)" }}
                    >
                      {customer.whatsapp ||
                        customer.phone ||
                        customer.email ||
                        "Sem contato principal"}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                }}
              >
                Produtos
              </div>
              {universalResults.products.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  Nenhum produto encontrado.
                </div>
              ) : (
                universalResults.products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className={s.btnSecondary}
                    onClick={() => {
                      appendProductToCart({
                        id: product.id,
                        name: product.name,
                        salePrice: product.salePrice,
                        itemType: product.itemType,
                      });
                      setShowModal(true);
                      setModalStep(1);
                      setFormMessage({
                        type: "success",
                        text: `Produto "${product.name}" adicionado ao carrinho da OS.`,
                      });
                    }}
                    style={{
                      display: "grid",
                      gap: 2,
                      textAlign: "left",
                      justifyContent: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800 }}>
                      {product.sku} • {product.name}
                    </span>
                    <span
                      style={{ fontSize: 11, color: "var(--text-secondary)" }}
                    >
                      {formatCurrency(product.salePrice)} • Estoque{" "}
                      {product.stock}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {formMessage && (
        <div
          className={s.card}
          style={{
            marginBottom: "var(--space-3)",
            borderLeft: `4px solid ${formMessage.type === "error" ? "var(--status-error)" : "var(--status-success)"}`,
            color:
              formMessage.type === "error"
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
              {formMessage.text}
            </span>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => setFormMessage(null)}
              style={{ padding: "4px 10px" }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Fitas de Filtro (Tabs) e Busca */}
      <div className={s.toolbar}>
        <div style={{ display: "flex", gap: 8 }}>
          {quickFilterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setQuickFilter(tab.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background:
                  quickFilter === tab.id
                    ? "var(--brand-primary)"
                    : "var(--bg-elevated)",
                color:
                  quickFilter === tab.id ? "#fff" : "var(--text-secondary)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div
          className={s.toolbarLeft}
          style={{ marginLeft: "auto", minWidth: 320 }}
        >
          <div className={s.searchBox}>
            <span className={s.searchIcon}>🔍</span>
            <input
              className={s.searchInput}
              placeholder="Buscar por número ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ─── KANBAN VIEW ─────────────────────────────────────────── */}
      {viewMode === "kanban" && (
        <div className={k.kanban}>
          {COLUMNS.map((col) => {
            const colOrders = filteredOrdersForStatus(col.status);
            return (
              <div key={col.status} className={k.column}>
                <div
                  className={k.columnHeader}
                  style={{ borderTopColor: col.color }}
                >
                  <div className={k.columnTitle}>
                    <span>{col.icon}</span>
                    <span>{col.label}</span>
                  </div>
                  <span
                    className={k.columnCount}
                    style={{ background: col.color + "22", color: col.color }}
                  >
                    {colOrders.length}
                  </span>
                </div>
                <div className={k.columnBody}>
                  {loading ? (
                    <div className={k.colEmpty}>Carregando...</div>
                  ) : colOrders.length === 0 ? (
                    <div className={k.colEmpty}>Nenhuma OS</div>
                  ) : (
                    colOrders.map((order) => (
                      <OSCard
                        key={order.id}
                        order={order}
                        onClick={() =>
                          router.push(`/dashboard/ordens/${order.id}`)
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── LIST VIEW ────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className={s.card}>
          <table className={s.table}>
            <thead className={s.tableHead}>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Laboratório</th>
                <th>Total</th>
                <th>Criado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={s.loadingRow}>
                  <td colSpan={6}>Carregando...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className={s.emptyState}>
                      <div className={s.emptyIcon}>📋</div>
                      <p className={s.emptyTitle}>Nenhuma OS encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const col = COLUMNS.find((c) => c.status === order.status);
                  return (
                    <tr
                      key={order.id}
                      className={s.tableRow}
                      onClick={() =>
                        router.push(`/dashboard/ordens/${order.id}`)
                      }
                    >
                      <td>
                        <span className={s.cellName}>{order.orderNumber}</span>
                      </td>
                      <td>{order.customer.name}</td>
                      <td>
                        <span
                          className={s.badge}
                          style={{
                            background: (col?.color || "#666") + "22",
                            color: col?.color || "#666",
                            border: `1px solid ${col?.color || "#666"}44`,
                          }}
                        >
                          {col?.icon} {col?.label || order.status}
                        </span>
                      </td>
                      <td>{order.labName || "—"}</td>
                      <td style={{ fontWeight: 600 }}>
                        {formatCurrency(Number(order.total))}
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {["DELIVERED", "CANCELLED"].includes(order.status) ? (
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-tertiary)",
                            }}
                          >
                            Concluida
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={s.btnSecondary}
                            style={{ padding: "6px 10px", fontSize: 12 }}
                            onClick={() =>
                              router.push(`/dashboard/ordens/${order.id}`)
                            }
                          >
                            Estorno / Ajuste
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── MODAL: NOVA OS (PDV) ──────────────────────────────────────── */}
      {showModal && (
        <div
          className={s.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className={s.modal} style={{ maxWidth: 900 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                PDV — Nova Venda (Etapa {modalStep}/2)
              </h2>
              <button
                className={s.modalClose}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            {/* ETAPA 1: O CARRINHO */}
            {modalStep === 1 && (
              <div className={s.modalBody}>
                <div className={s.formGrid}>
                  {/* Cliente */}
                  <div className={`${s.fieldGroup} ${s.formFull}`}>
                    <label className={s.fieldLabel}>
                      Selecionar Cliente{" "}
                      <span className={s.fieldRequired}>*</span>
                    </label>
                    <select
                      className={s.fieldSelect}
                      value={form.customerId}
                      required
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          customerId: e.target.value,
                          prescriptionId: "",
                        }))
                      }
                    >
                      <option value="">Buscar cliente...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCustomer &&
                    selectedCustomer.prescriptions?.length > 0 && (
                      <div className={`${s.fieldGroup} ${s.formFull}`}>
                        <label className={s.fieldLabel}>Vincular Receita</label>
                        <select
                          className={s.fieldSelect}
                          value={form.prescriptionId}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              prescriptionId: e.target.value,
                              opticalResults: null,
                            }))
                          }
                        >
                          <option value="">Sem receita atrelada</option>
                          {selectedCustomer.prescriptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              Receita v{p.version}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                </div>

                {form.prescriptionId && (
                  <div
                    className={s.card}
                    style={{
                      marginBottom: 20,
                      padding: 16,
                      background: "var(--bg-secondary)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div className={s.formSectionTitle} style={{ margin: 0 }}>
                        Engenharia Óptica (Ficha Técnica)
                      </div>
                      <button
                        type="button"
                        className={s.btnSecondary}
                        onClick={validateOptical}
                        style={{
                          padding: "6px 12px",
                          fontSize: 0,
                          background: "#e0e7ff",
                          color: "var(--brand-primary)",
                        }}
                        title="Validar Ficha Tecnica"
                      >
                        <span style={{ fontSize: 13 }}>
                          Validar Ficha Tecnica
                        </span>
                      </button>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        marginBottom: 16,
                      }}
                    >
                      Preencha os dados da armação escolhida e lente para que a
                      inteligência cruze com o Prontuário Médico e valide a DNP
                      e Espessuras.
                    </p>

                    <div
                      className={s.formGrid}
                      style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}
                    >
                      <div className={s.fieldGroup}>
                        <label className={s.fieldLabel}>DMA (mm)</label>
                        <input
                          className={s.fieldInput}
                          type="number"
                          placeholder="Ex: 58"
                          value={form.opticalParams.dma}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              opticalParams: {
                                ...prev.opticalParams,
                                dma: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className={s.fieldGroup}>
                        <label className={s.fieldLabel}>Aro (mm)</label>
                        <input
                          className={s.fieldInput}
                          type="number"
                          placeholder="Ex: 50"
                          value={form.opticalParams.aro}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              opticalParams: {
                                ...prev.opticalParams,
                                aro: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className={s.fieldGroup}>
                        <label className={s.fieldLabel}>Ponte (mm)</label>
                        <input
                          className={s.fieldInput}
                          type="number"
                          placeholder="Ex: 18"
                          value={form.opticalParams.ponte}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              opticalParams: {
                                ...prev.opticalParams,
                                ponte: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div
                        className={s.fieldGroup}
                        style={{ display: "flex", alignItems: "flex-end" }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13,
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            height: "40px",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={form.opticalParams.isFrameCurved}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                opticalParams: {
                                  ...prev.opticalParams,
                                  isFrameCurved: e.target.checked,
                                },
                              }))
                            }
                          />{" "}
                          Armação Curva
                        </label>
                      </div>
                      <div className={s.fieldGroup}>
                        <label className={s.fieldLabel}>
                          Índice Refração (Lente)
                        </label>
                        <input
                          className={s.fieldInput}
                          type="number"
                          step="0.01"
                          placeholder="Ex: 1.67"
                          value={form.opticalParams.lensIndex}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              opticalParams: {
                                ...prev.opticalParams,
                                lensIndex: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className={s.fieldGroup}>
                        <label className={s.fieldLabel}>
                          Curva Base (Lente)
                        </label>
                        <input
                          className={s.fieldInput}
                          type="number"
                          step="0.1"
                          placeholder="Ex: 4.0"
                          value={form.opticalParams.lensBaseCurve}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              opticalParams: {
                                ...prev.opticalParams,
                                lensBaseCurve: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    {form.opticalResults && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 12,
                          borderRadius: 8,
                          background: "#fff",
                          border: "1px solid var(--border-color)",
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{ fontSize: 13, color: "var(--text-primary)" }}
                        >
                          <strong>Ø Diâmetro Mínimo Calculado:</strong>{" "}
                          <span
                            style={{
                              color: "var(--brand-primary)",
                              fontWeight: 800,
                            }}
                          >
                            {form.opticalResults.diameterCalc?.diameterMin} mm
                          </span>
                          <span style={{ color: "var(--text-tertiary)" }}>
                            {" "}
                            (DPA: {form.opticalResults.diameterCalc?.dpa},
                            Desc.:{" "}
                            {form.opticalResults.diameterCalc?.decentration})
                          </span>
                        </div>

                        {form.opticalResults.thicknessCalc && (
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--text-primary)",
                            }}
                          >
                            <strong>Espessura de Borda (Estimada):</strong>{" "}
                            <span
                              style={{
                                color: form.opticalResults.thicknessCalc
                                  ?.recommendEdgeThickening
                                  ? "#dc2626"
                                  : "#16a34a",
                                fontWeight: 800,
                              }}
                            >
                              {
                                form.opticalResults.thicknessCalc
                                  ?.estimatedThickness
                              }{" "}
                              mm
                            </span>
                            {form.opticalResults.thicknessCalc
                              ?.recommendEdgeThickening && (
                              <span style={{ marginLeft: 8, color: "#dc2626" }}>
                                ⚠️ ALERTA: Considere Adicionar Rebaixamento de
                                Borda ou Subir Índice.
                              </span>
                            )}
                          </div>
                        )}

                        {form.opticalResults.curveWarning && (
                          <div
                            style={{
                              padding: "8px 12px",
                              background: "#fee2e2",
                              color: "#dc2626",
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            🛑 CONFLITO GRAVE:{" "}
                            {form.opticalResults.curveWarning}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className={s.formSection}>
                  <div className={s.formSectionTitle}>Carrinho de Produtos</div>
                  <div style={{ marginBottom: 12 }}>
                    <div
                      className={s.searchBox}
                      style={{
                        background: "#fefce8",
                        border: "1px solid #fde047",
                      }}
                    >
                      <span className={s.searchIcon}>🏷️</span>
                      <input
                        className={s.searchInput}
                        placeholder="BIPAR CÓDIGO DE BARRAS OU SKU..."
                        autoFocus
                        value={scannerInput}
                        onChange={(e) => setScannerInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBarcodeScan(scannerInput);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className={k.itemsTable}>
                    <div className={k.itemsHeader}>
                      <span style={{ flex: 1.5 }}>Produto (Estoque)</span>
                      <span>Descrição Avulsa</span>
                      <span>Qtd</span>
                      <span>Preço Un.</span>
                      <span>Desc R$</span>
                      <span>Total</span>
                      <span></span>
                    </div>
                    {form.items.map((item, idx) => (
                      <div key={idx} className={k.itemRow}>
                        <select
                          className={s.fieldSelect}
                          style={{ flex: 1.5 }}
                          value={item.productId}
                          onChange={(e) =>
                            handleItemChange(idx, "productId", e.target.value)
                          }
                        >
                          <option value="">
                            Produto Avulso (Sem Baixa)...
                          </option>
                          {products.map((p) => {
                            const stock = p.stockItems.reduce(
                              (acc, s) => acc + s.quantity,
                              0,
                            );
                            return (
                              <option
                                key={p.id}
                                value={p.id}
                                disabled={stock <= 0}
                              >
                                {p.sku} — {p.name} (
                                {stock > 0 ? `${stock} em estoque` : "Esgotado"}
                                )
                              </option>
                            );
                          })}
                        </select>

                        <input
                          className={s.fieldInput}
                          placeholder="Lente Zeiss..."
                          required
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(idx, "description", e.target.value)
                          }
                        />
                        <input
                          className={s.fieldInput}
                          type="number"
                          min="1"
                          style={{ width: 60 }}
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "quantity",
                              parseInt(e.target.value) || 1,
                            )
                          }
                        />
                        <input
                          className={s.fieldInput}
                          type="number"
                          step="0.01"
                          style={{ width: 90 }}
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(idx, "unitPrice", e.target.value)
                          }
                        />
                        <input
                          className={s.fieldInput}
                          type="number"
                          step="0.01"
                          style={{ width: 80 }}
                          value={item.discount}
                          onChange={(e) =>
                            handleItemChange(idx, "discount", e.target.value)
                          }
                        />
                        <span
                          className={k.itemTotal}
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 600,
                          }}
                        >
                          {formatCurrency(
                            parseFloat(String(item.unitPrice) || "0") *
                              item.quantity -
                              parseFloat(String(item.discount) || "0"),
                          )}
                        </span>
                        <button
                          type="button"
                          className={k.removeItem}
                          onClick={() => removeItem(idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className={k.addItemBtn}
                      onClick={addItem}
                    >
                      + Adicionar item
                    </button>
                  </div>
                  <div className={k.totalRow} style={{ marginTop: 16 }}>
                    <span>Total a Pagar: </span>
                    <span className={k.totalValue}>
                      {formatCurrency(calcTotal())}
                    </span>
                  </div>
                </div>

                <div className={s.formGrid} style={{ marginTop: 16 }}>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel}>Laboratório Destino</label>
                    <input
                      className={s.fieldInput}
                      placeholder="Ex: Lab Center"
                      value={form.labName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          labName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel}>Previsão (SLA)</label>
                    <input
                      type="date"
                      className={s.fieldInput}
                      value={form.labDeadline}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          labDeadline: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div
                  className={s.modalFooter}
                  style={{ marginTop: 24, padding: 0 }}
                >
                  <button
                    type="button"
                    className={s.btnPrimary}
                    style={{
                      width: "100%",
                      fontSize: 15,
                      padding: "14px 20px",
                      display: "flex",
                      justifyContent: "center",
                    }}
                    onClick={nextStep}
                  >
                    Ir Para o Pagamento (Passo 2) →
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 2: SPLIT FINANCEIRO */}
            {modalStep === 2 && (
              <form onSubmit={handleSave}>
                <div className={s.modalBody} style={{ minHeight: 300 }}>
                  <div
                    className={s.card}
                    style={{
                      marginBottom: 16,
                      padding: 16,
                      background: "var(--bg-primary)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          Fechamento Operacional
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {selectedCustomer?.name || "Cliente nao selecionado"}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {primaryItem?.description || "Sem item principal"}
                          {form.items.length > 1
                            ? ` +${form.items.length - 1} item(ns)`
                            : ""}
                        </div>
                      </div>
                      <div
                        style={{ display: "grid", gap: 4, textAlign: "right" }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            textTransform: "uppercase",
                            fontWeight: 800,
                          }}
                        >
                          Status do checkout
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: checkoutReady
                              ? "var(--status-success)"
                              : "var(--status-warning)",
                          }}
                        >
                          {checkoutReady
                            ? "Pronto para concluir"
                            : "Aguardando fechamento do split"}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {checkoutReady
                            ? "Venda equilibrada entre itens e pagamentos."
                            : `Ajuste ${calcBalance() > 0 ? "o faltante" : "o excedente"} para liberar a confirmacao.`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={s.statsGrid}
                    style={{
                      marginBottom: 24,
                      border: "none",
                      background: "var(--bg-secondary)",
                    }}
                  >
                    <div className={s.statCard}>
                      <div className={s.statLabel}>Valor da Venda</div>
                      <div className={s.statValue}>
                        {formatCurrency(calcTotal())}
                      </div>
                    </div>
                    <div className={s.statCard}>
                      <div className={s.statLabel}>Pagamentos Informados</div>
                      <div
                        className={s.statValue}
                        style={{
                          color:
                            calcPaid() === calcTotal()
                              ? "var(--status-success)"
                              : "var(--text-primary)",
                        }}
                      >
                        {formatCurrency(calcPaid())}
                      </div>
                    </div>
                    <div className={s.statCard}>
                      <div className={s.statLabel}>Falta Pagar</div>
                      <div
                        className={s.statValue}
                        style={{
                          color:
                            calcRemaining() > 0
                              ? "var(--status-error)"
                              : "var(--text-primary)",
                        }}
                      >
                        {formatCurrency(calcRemaining())}
                      </div>
                    </div>
                    <div className={s.statCard}>
                      <div className={s.statLabel}>Excedente</div>
                      <div
                        className={s.statValue}
                        style={{
                          color:
                            calcOverpayment() > 0
                              ? "var(--status-warning)"
                              : "var(--text-primary)",
                        }}
                      >
                        {formatCurrency(calcOverpayment())}
                      </div>
                    </div>
                  </div>

                  <div className={s.formSectionTitle}>Definir Pagamentos</div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      marginBottom: 16,
                    }}
                  >
                    Adicione como o cliente efetuará o pagamento. O valor
                    informado entrará no Caixa diário. Contratos de Crediário
                    gerarão Carnês automáticos na entrega da OS.
                  </p>

                  <div
                    className={s.card}
                    style={{
                      marginBottom: 16,
                      padding: 12,
                      borderLeft: `4px solid ${checkoutReady ? "var(--status-success)" : "var(--status-warning)"}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: checkoutReady
                          ? "var(--status-success)"
                          : "var(--status-warning)",
                      }}
                    >
                      {checkoutReady
                        ? "Checkout coerente: o valor da venda bate com o total informado nas formas de pagamento."
                        : `Checkout pendente: falta ajustar ${formatCurrency(Math.abs(calcBalance()))} para concluir a OS.`}
                    </div>
                  </div>

                  {form.transactions.length > 1 && (
                    <div
                      className={s.card}
                      style={{
                        marginBottom: 16,
                        padding: 12,
                        background: "var(--bg-secondary)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-tertiary)",
                          textTransform: "uppercase",
                          marginBottom: 8,
                        }}
                      >
                        Split de Pagamento
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {form.transactions.map((tx, idx) => (
                          <div
                            key={`split-preview-${idx}`}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 13,
                            }}
                          >
                            <span style={{ color: "var(--text-secondary)" }}>
                              {paymentMethodLabel(tx.method)}
                            </span>
                            <strong style={{ color: "var(--text-primary)" }}>
                              {formatCurrency(parseFloat(tx.amount || "0"))}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.transactions.map((tx, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: 12,
                        marginBottom: 12,
                        alignItems: "flex-end",
                        background: "var(--bg-primary)",
                        padding: 12,
                        borderRadius: 8,
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div
                        className={s.fieldGroup}
                        style={{ flex: 1, margin: 0 }}
                      >
                        <label className={s.fieldLabel}>
                          Forma de Pagamento
                        </label>
                        <select
                          className={s.fieldSelect}
                          value={tx.method}
                          onChange={(e) =>
                            updateTransaction(idx, "method", e.target.value)
                          }
                        >
                          <option value="DINHEIRO">Dinheiro</option>
                          <option value="PIX">PIX (Chave/QR Code)</option>
                          <option value="CARTAO_CREDITO">
                            Cartão de Crédito
                          </option>
                          <option value="CARTAO_DEBITO">
                            Cartão de Débito
                          </option>
                          <option value="CREDIARIO">Crediario Proprio</option>
                        </select>
                      </div>

                      <div
                        className={s.fieldGroup}
                        style={{ flex: 1, margin: 0 }}
                      >
                        <label className={s.fieldLabel}>
                          Valor Declarado (R$)
                        </label>
                        <input
                          className={s.fieldInput}
                          type="number"
                          step="0.01"
                          value={tx.amount}
                          onChange={(e) =>
                            updateTransaction(idx, "amount", e.target.value)
                          }
                          required
                        />
                      </div>

                      {tx.method === "CREDIARIO" && (
                        <div
                          className={s.fieldGroup}
                          style={{ flex: 1, margin: 0 }}
                        >
                          <label className={s.fieldLabel}>
                            Parcelas do Crediario
                          </label>
                          <select
                            className={s.fieldSelect}
                            value={tx.installmentsCount}
                            onChange={(e) =>
                              updateTransaction(
                                idx,
                                "installmentsCount",
                                parseInt(e.target.value),
                              )
                            }
                          >
                            {[...Array(11)].map((_, i) => (
                              <option key={i + 2} value={i + 2}>
                                {i + 2}x
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {tx.method === "CARTAO_CREDITO" && (
                        <div
                          className={s.fieldGroup}
                          style={{ flex: 1, margin: 0 }}
                        >
                          <label className={s.fieldLabel}>Parcelas</label>
                          <input
                            className={s.fieldInput}
                            type="number"
                            min="1"
                            max="12"
                            value={tx.installmentsCount}
                            onChange={(e) =>
                              updateTransaction(
                                idx,
                                "installmentsCount",
                                parseInt(e.target.value),
                              )
                            }
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        className={s.btnSecondary}
                        onClick={() => removeTransaction(idx)}
                        style={{ color: "var(--status-error)" }}
                      >
                        Remover
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className={k.addItemBtn}
                    onClick={addTransaction}
                    disabled={calcRemaining() <= 0}
                  >
                    + Adicionar Outra Forma
                  </button>
                  {!checkoutReady && calcBalance() > 0.01 && (
                    <button
                      type="button"
                      className={s.btnSecondary}
                      style={{ marginTop: 12 }}
                      onClick={() => addTransaction()}
                    >
                      Completar com o valor restante (
                      {formatCurrency(calcRemaining())})
                    </button>
                  )}
                  {calcOverpayment() > 0.01 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 8,
                        background: "var(--status-warning-bg)",
                        color: "var(--status-warning)",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      O split informado excede o valor da venda em{" "}
                      {formatCurrency(calcOverpayment())}. Ajuste os valores
                      antes de confirmar.
                    </div>
                  )}



                </div>

                <div className={s.modalFooter}>
                  <button
                    type="button"
                    className={s.btnSecondary}
                    onClick={() => setModalStep(1)}
                  >
                    Voltar para Itens
                  </button>
                  <button
                    type="submit"
                    className={s.btnPrimary}
                    style={{ background: "var(--status-success)" }}
                    disabled={saving || !checkoutReady}
                  >
                    {saving ? "Concluindo Venda..." : "Confirmar Venda"}
                  </button>
                </div>
              </form>
            )}

            {/* FOOTER DA ETAPA 1 */}
            {modalStep === 1 && (
              <div className={s.modalFooter}>
                <button
                  className={s.btnSecondary}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  className={s.btnPrimary}
                  onClick={nextStep}
                  disabled={
                    !form.customerId || form.items.some((i) => !i.description)
                  }
                >
                  Revisar Pagamento
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
