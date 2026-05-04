'use client'

import { FormEvent, useState } from 'react'

interface OrderTrackingWidgetProps {
    tenantSlug: string
}

interface TrackingResult {
    tenant: { name: string; slug: string }
    order: {
        orderNumber: string
        status: string
        statusLabel: string
        isPaid: boolean
        customerName: string
        labDeadline: string | null
        deliveredAt: string | null
        updatedAt: string
    }
    timeline: Array<{
        id: string
        status: string
        label: string
        notes: string | null
        createdAt: string
    }>
}

function formatDate(value: string | null) {
    if (!value) return 'Nao informado'
    return new Date(value).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

export default function OrderTrackingWidget({ tenantSlug }: OrderTrackingWidgetProps) {
    const [orderNumber, setOrderNumber] = useState('')
    const [identifier, setIdentifier] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<TrackingResult | null>(null)
    const [uiMessage, setUiMessage] = useState<string | null>(null)

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault()
        setLoading(true)
        setUiMessage(null)

        try {
            const res = await fetch('/api/orders/public/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantSlug,
                    orderNumber,
                    identifier,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setResult(null)
                setUiMessage(data.error || 'Nao foi possivel localizar a OS.')
                return
            }

            setResult(data)
        } catch {
            setResult(null)
            setUiMessage('Falha ao consultar o acompanhamento da OS.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section
            style={{
                maxWidth: 1200,
                margin: '32px auto 0',
                padding: '0 24px',
            }}
        >
            <div
                style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-glass)',
                    padding: 24,
                }}
            >
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Acompanhamento da OS
                    </div>
                    <h2 style={{ margin: '8px 0 6px', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                        Consulte o status do pedido
                    </h2>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Informe o numero da OS e um dado de confirmacao do cliente (telefone, WhatsApp ou CPF) para acompanhar a linha do tempo.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Numero da OS</span>
                        <input
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            placeholder="Ex: OS-2026-000123"
                            style={{
                                border: '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-md)',
                                padding: '12px 14px',
                                fontSize: 14,
                                background: 'var(--bg-base)',
                                color: 'var(--text-primary)',
                            }}
                            required
                        />
                    </label>

                    <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Telefone, WhatsApp ou CPF</span>
                        <input
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Somente para confirmar o pedido"
                            style={{
                                border: '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-md)',
                                padding: '12px 14px',
                                fontSize: 14,
                                background: 'var(--bg-base)',
                                color: 'var(--text-primary)',
                            }}
                            required
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 18px',
                            background: 'var(--brand-primary)',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: loading ? 'wait' : 'pointer',
                            minWidth: 160,
                        }}
                    >
                        {loading ? 'Consultando...' : 'Consultar OS'}
                    </button>
                </form>

                {uiMessage && (
                    <div
                        style={{
                            marginTop: 16,
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            fontSize: 13,
                            fontWeight: 700,
                        }}
                    >
                        {uiMessage}
                    </div>
                )}

                {result && (
                    <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                                gap: 12,
                            }}
                        >
                            {[
                                { label: 'OS', value: result.order.orderNumber },
                                { label: 'Status Atual', value: result.order.statusLabel },
                                { label: 'Prazo do Lab', value: formatDate(result.order.labDeadline) },
                                { label: 'Atualizado em', value: formatDate(result.order.updatedAt) },
                            ].map((card) => (
                                <div
                                    key={card.label}
                                    style={{
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: '14px 16px',
                                        background: 'var(--bg-base)',
                                    }}
                                >
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>{card.label}</div>
                                    <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{card.value}</div>
                                </div>
                            ))}
                        </div>

                        <div
                            style={{
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 16,
                                background: 'var(--bg-base)',
                            }}
                        >
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
                                Linha do tempo do pedido
                            </div>
                            <div style={{ display: 'grid', gap: 12 }}>
                                {result.timeline.map((entry, index) => (
                                    <div
                                        key={entry.id}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '24px 1fr',
                                            gap: 12,
                                            alignItems: 'start',
                                        }}
                                    >
                                        <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
                                            <div
                                                style={{
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: 999,
                                                    background: index === result.timeline.length - 1 ? 'var(--brand-primary)' : 'var(--brand-primary-light)',
                                                }}
                                            />
                                            {index < result.timeline.length - 1 && (
                                                <div style={{ width: 2, minHeight: 28, background: 'var(--border-subtle)' }} />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{entry.label}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                {formatDate(entry.createdAt)}
                                            </div>
                                            {entry.notes && (
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                                                    {entry.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
