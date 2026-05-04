"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import s from "./clientes.module.css";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  addressCity: string | null;
  addressState: string | null;
  consentWhatsapp: boolean;
  createdAt: string;
  prescriptions: Array<{ version: number; prescribedAt: string }>;
}

const GENDER_OPTIONS = [
  { value: "", label: "Não informado" },
  { value: "MASCULINO", label: "Masculino" },
  { value: "FEMININO", label: "Feminino" },
  { value: "OUTRO", label: "Outro" },
];

const STATE_OPTIONS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const defaultForm = {
  name: "",
  cpf: "",
  rg: "",
  email: "",
  phone: "",
  whatsapp: "",
  birthDate: "",
  gender: "",
  addressStreet: "",
  addressNumber: "",
  addressComp: "",
  addressNeigh: "",
  addressCity: "",
  addressState: "",
  addressZip: "",
  consentEmail: false,
  consentSms: false,
  consentWhatsapp: false,
  notes: "",
};

export default function ClientesPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: "20",
      });
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setUiMessage({
          type: "error",
          text: data?.error || "Nao foi possivel carregar os clientes.",
        });
        setCustomers([]);
        setTotal(0);
        return;
      }
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
      setUiMessage(null);
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao carregar a lista de clientes.",
      });
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchCustomers();
    }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line

  const handleFieldChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === "checkbox" ? target.checked : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  };

  const toggleConsent = (
    field: "consentEmail" | "consentSms" | "consentWhatsapp",
  ) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm(defaultForm);
        setUiMessage({
          type: "success",
          text: "Cliente cadastrado com sucesso.",
        });
        fetchCustomers();
      } else {
        const data = await res.json().catch(() => null);
        setUiMessage({
          type: "error",
          text: data?.error || "Nao foi possivel salvar o cliente.",
        });
      }
    } catch {
      setUiMessage({ type: "error", text: "Falha ao salvar o cliente." });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const totalPages = Math.ceil(total / 20);

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>Clientes</h1>
          <p className={s.pageSubtitle}>
            {total > 0
              ? `${total} clientes cadastrados`
              : "Nenhum cliente ainda"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() =>
              router.push("/dashboard/clientes/receitas-expirando")
            }
          >
            Receitas a Expirar
          </button>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() =>
              router.push("/dashboard/ordens/orcamentos-abandonados")
            }
          >
            Orcamentos Parados
          </button>
          <button
            id="btn-novo-cliente"
            className={s.btnPrimary}
            onClick={() => setShowModal(true)}
          >
            <span>+</span> Novo Cliente
          </button>
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

      <div className={s.card} style={{ marginBottom: "var(--space-3)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() => setShowModal(true)}
            style={{
              display: "grid",
              gap: 4,
              textAlign: "left",
              justifyContent: "flex-start",
              minHeight: 72,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800 }}>Novo Cadastro</span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.35,
              }}
            >
              Abrir o cadastro completo sem depender da tabela.
            </span>
          </button>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() =>
              router.push("/dashboard/clientes/receitas-expirando")
            }
            style={{
              display: "grid",
              gap: 4,
              textAlign: "left",
              justifyContent: "flex-start",
              minHeight: 72,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800 }}>
              Fila de Reativacao
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.35,
              }}
            >
              Entrar direto nas receitas a expirar e no contato manual.
            </span>
          </button>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() => router.push("/dashboard/ordens")}
            style={{
              display: "grid",
              gap: 4,
              textAlign: "left",
              justifyContent: "flex-start",
              minHeight: 72,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800 }}>
              Abrir Frente de Loja
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.35,
              }}
            >
              Ir para venda, caixa e abertura de O.S. com menos troca de
              contexto.
            </span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.toolbarLeft}>
          <div className={s.searchBox}>
            <span className={s.searchIcon}>🔍</span>
            <input
              id="input-busca-cliente"
              className={s.searchInput}
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <span className={s.cardTitle}>Lista de Clientes</span>
          <span className={s.cardCount}>{total} total</span>
        </div>

        <table className={s.table}>
          <thead className={s.tableHead}>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Cidade</th>
              <th>WhatsApp</th>
              <th>Última Receita</th>
              <th>Cadastro</th>
              <th>Abrir</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={s.loadingRow}>
                <td colSpan={7}>Carregando clientes...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}>👤</div>
                    <p className={s.emptyTitle}>Nenhum cliente encontrado</p>
                    <p className={s.emptyText}>
                      {search
                        ? `Nenhum resultado para "${search}". Tente outro termo.`
                        : 'Cadastre o primeiro cliente clicando em "Novo Cliente".'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c.id}
                  className={s.tableRow}
                  onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
                >
                  <td>
                    <div className={s.cellName}>{c.name}</div>
                    {c.email && <div className={s.cellMeta}>{c.email}</div>}
                  </td>
                  <td>{c.phone || c.whatsapp || "—"}</td>
                  <td>
                    {c.addressCity && c.addressState
                      ? `${c.addressCity}/${c.addressState}`
                      : "—"}
                  </td>
                  <td>
                    {c.consentWhatsapp ? (
                      <span className={`${s.badge} ${s.badgeSuccess}`}>
                        ✓ Ativo
                      </span>
                    ) : (
                      <span className={`${s.badge} ${s.badgeDefault}`}>
                        Não
                      </span>
                    )}
                  </td>
                  <td>
                    {c.prescriptions[0] ? (
                      <div>
                        <span className={`${s.badge} ${s.badgeInfo}`}>
                          v{c.prescriptions[0].version}
                        </span>
                        <div className={s.cellMeta}>
                          {formatDate(c.prescriptions[0].prescribedAt)}
                        </div>
                      </div>
                    ) : (
                      <span className={`${s.badge} ${s.badgeWarning}`}>
                        Sem receita
                      </span>
                    )}
                  </td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={s.btnSecondary}
                        onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
                        style={{ padding: "6px 10px", fontSize: 12 }}
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        className={s.btnSecondary}
                        onClick={() => router.push("/dashboard/ordens")}
                        style={{ padding: "6px 10px", fontSize: 12 }}
                      >
                        Nova O.S.
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className={s.pagination}>
            <span className={s.paginationInfo}>
              Página {page} de {totalPages} ({total} clientes)
            </span>
            <div className={s.paginationBtns}>
              <button
                className={s.paginationBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ←
              </button>
              <button
                className={s.paginationBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: NOVO CLIENTE ─────────────────────────────────── */}
      {showModal && (
        <div
          className={s.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className={s.modal}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Cadastrar Novo Cliente</h2>
              <button
                className={s.modalClose}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={s.modalBody}>
                {/* Dados Pessoais */}
                <div className={s.formSection}>
                  <div className={s.formSectionTitle}>Dados Pessoais</div>
                  <div className={s.formGrid}>
                    <div className={`${s.fieldGroup} ${s.formFull}`}>
                      <label className={s.fieldLabel}>
                        Nome Completo <span className={s.fieldRequired}>*</span>
                      </label>
                      <input
                        id="field-nome"
                        name="name"
                        className={s.fieldInput}
                        placeholder="Nome completo do cliente"
                        value={form.name}
                        onChange={handleFieldChange}
                        required
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>CPF</label>
                      <input
                        name="cpf"
                        className={s.fieldInput}
                        placeholder="000.000.000-00"
                        value={form.cpf}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>RG</label>
                      <input
                        name="rg"
                        className={s.fieldInput}
                        placeholder="00.000.000-0"
                        value={form.rg}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>Data de Nascimento</label>
                      <input
                        name="birthDate"
                        type="date"
                        className={s.fieldInput}
                        value={form.birthDate}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>Gênero</label>
                      <select
                        name="gender"
                        className={s.fieldSelect}
                        value={form.gender}
                        onChange={handleFieldChange}
                      >
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div className={s.formSection}>
                  <div className={s.formSectionTitle}>Contato</div>
                  <div className={s.formGrid}>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>Email</label>
                      <input
                        name="email"
                        type="email"
                        className={s.fieldInput}
                        placeholder="email@exemplo.com"
                        value={form.email}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>Telefone</label>
                      <input
                        name="phone"
                        className={s.fieldInput}
                        placeholder="(00) 0000-0000"
                        value={form.phone}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={`${s.fieldGroup} ${s.formFull}`}>
                      <label className={s.fieldLabel}>WhatsApp</label>
                      <input
                        name="whatsapp"
                        className={s.fieldInput}
                        placeholder="(00) 00000-0000"
                        value={form.whatsapp}
                        onChange={handleFieldChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className={s.formSection}>
                  <div className={s.formSectionTitle}>Endereço</div>
                  <div className={s.formGrid}>
                    <div className={`${s.fieldGroup} ${s.formFull}`}>
                      <label className={s.fieldLabel}>Logradouro</label>
                      <input
                        name="addressStreet"
                        className={s.fieldInput}
                        placeholder="Rua, Avenida..."
                        value={form.addressStreet}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>Número</label>
                      <input
                        name="addressNumber"
                        className={s.fieldInput}
                        placeholder="123"
                        value={form.addressNumber}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>Complemento</label>
                      <input
                        name="addressComp"
                        className={s.fieldInput}
                        placeholder="Apto, Bloco..."
                        value={form.addressComp}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>Bairro</label>
                      <input
                        name="addressNeigh"
                        className={s.fieldInput}
                        placeholder="Bairro"
                        value={form.addressNeigh}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>CEP</label>
                      <input
                        name="addressZip"
                        className={s.fieldInput}
                        placeholder="00000-000"
                        value={form.addressZip}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>Cidade</label>
                      <input
                        name="addressCity"
                        className={s.fieldInput}
                        placeholder="Cidade"
                        value={form.addressCity}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>Estado</label>
                      <select
                        name="addressState"
                        className={s.fieldSelect}
                        value={form.addressState}
                        onChange={handleFieldChange}
                      >
                        <option value="">Selecione...</option>
                        {STATE_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* LGPD */}
                <div className={s.formSection}>
                  <div className={s.formSectionTitle}>Consentimento LGPD</div>
                  <div className={s.consentGroup}>
                    {[
                      {
                        key: "consentEmail" as const,
                        icon: "📧",
                        title: "Email",
                        sub: "Notificações e promoções por e-mail",
                      },
                      {
                        key: "consentSms" as const,
                        icon: "💬",
                        title: "SMS",
                        sub: "Mensagens de texto para avisos",
                      },
                      {
                        key: "consentWhatsapp" as const,
                        icon: "📱",
                        title: "WhatsApp",
                        sub: "Comunicação via WhatsApp Business",
                      },
                    ].map(({ key, icon, title, sub }) => (
                      <label
                        key={key}
                        className={`${s.consentItem} ${form[key] ? s.active : ""}`}
                        onClick={() => toggleConsent(key)}
                      >
                        <div className={s.consentCheck}>
                          {form[key] ? "✓" : ""}
                        </div>
                        <div className={s.consentLabel}>
                          <div className={s.consentLabelTitle}>
                            {icon} {title}
                          </div>
                          <div className={s.consentLabelSub}>{sub}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Observações */}
                <div className={s.formSection}>
                  <div className={s.formSectionTitle}>Observações</div>
                  <div className={s.fieldGroup}>
                    <textarea
                      name="notes"
                      className={s.fieldTextarea}
                      placeholder="Informações adicionais sobre o cliente..."
                      value={form.notes}
                      onChange={handleFieldChange}
                    />
                  </div>
                </div>
              </div>

              <div className={s.modalFooter}>
                <button
                  type="button"
                  className={s.btnSecondary}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-cliente"
                  type="submit"
                  className={s.btnPrimary}
                  disabled={saving || !form.name}
                >
                  {saving ? "Salvando..." : "✓ Salvar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
