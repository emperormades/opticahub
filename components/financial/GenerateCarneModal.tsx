'use client'

import React, { useState } from 'react'
import s from '@/app/dashboard/shared.module.css'

interface GenerateCarneModalProps {
    transactionId: string
    totalAmount: number
    onClose: () => void
    onSuccess: () => void
}

export function GenerateCarneModal({ transactionId, totalAmount, onClose, onSuccess }: GenerateCarneModalProps) {
    const [installmentsCount, setInstallmentsCount] = useState(3)
    const [firstDueDate, setFirstDueDate] = useState(() => {
        const nextMonth = new Date()
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        nextMonth.setDate(10) // Padrão dia 10
        return nextMonth.toISOString().split('T')[0]
    })
    const [penaltyPct, setPenaltyPct] = useState(2)
    const [interestPct, setInterestPct] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleGenerate = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/financial/carne', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId,
                    installmentsCount,
                    firstDueDate,
                    penaltyPct,
                    interestPctMonth: interestPct
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Erro ao gerar carnê')
            }

            onSuccess()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao gerar carne')
        } finally {
            setLoading(false)
        }
    }

    const installmentValue = totalAmount / installmentsCount

    return (
        <div className={s.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={s.modal} style={{ maxWidth: 480 }}>
                <div className={s.modalHeader}>
                    <h2 className={s.modalTitle}>💳 Configurar Crediário (Carnê)</h2>
                    <button className={s.modalClose} onClick={onClose}>×</button>
                </div>

                <div className={s.modalBody}>
                    <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-2)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Valor Total do Crediário</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: 'var(--space-3)', background: 'var(--status-error-bg)', color: 'var(--status-error)', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500 }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div className={s.formGrid}>
                        <div className={s.fieldGroup}>
                            <label className={s.fieldLabel}>Nº de Parcelas</label>
                            <select
                                className={s.fieldSelect}
                                value={installmentsCount}
                                onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                    <option key={n} value={n}>{n}x {n === 1 ? 'parcela' : 'parcelas'}</option>
                                ))}
                            </select>
                        </div>
                        <div className={s.fieldGroup}>
                            <label className={s.fieldLabel}>1º Vencimento</label>
                            <input
                                type="date"
                                className={s.fieldInput}
                                value={firstDueDate}
                                onChange={(e) => setFirstDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={s.formGrid}>
                        <div className={s.fieldGroup}>
                            <label className={s.fieldLabel}>Multa Atraso (%)</label>
                            <input
                                type="number"
                                className={s.fieldInput}
                                value={penaltyPct}
                                onChange={(e) => setPenaltyPct(Number(e.target.value))}
                                step="0.1"
                            />
                        </div>
                        <div className={s.fieldGroup}>
                            <label className={s.fieldLabel}>Juros Mês (%)</label>
                            <input
                                type="number"
                                className={s.fieldInput}
                                value={interestPct}
                                onChange={(e) => setInterestPct(Number(e.target.value))}
                                step="0.1"
                            />
                        </div>
                    </div>

                    <div style={{ padding: 'var(--space-4)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Prévia do Parcelamento:</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{installmentsCount}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installmentValue)}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Sem juros na geração inicial</span>
                        </div>
                    </div>
                </div>

                <div className={s.modalFooter}>
                    <button className={s.btnSecondary} onClick={onClose} disabled={loading}>Cancelar</button>
                    <button
                        className={s.btnPrimary}
                        onClick={handleGenerate}
                        disabled={loading}
                        style={{ minWidth: 140 }}
                    >
                        {loading ? 'Gerando...' : '✅ Gerar Carnê'}
                    </button>
                </div>
            </div>
        </div>
    )
}
