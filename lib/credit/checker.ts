// lib/credit/checker.ts
// Análise de Crédito Smart — Pilar 8.2
// Camada de abstração: hoje usa mock, amanhã troca por Serasa/Boa Vista sem mudar as rotas

export interface CreditCheckResult {
    score: number           // 0-1000 (Serasa style)
    limit: Decimal
    status: 'APROVADO' | 'RESTRITO' | 'PENDENTE'
    reason: string
    source: 'MOCK' | 'SERASA' | 'BOA_VISTA'
    checkedAt: Date
}

type Decimal = number

// Configuração de faixas de score
const SCORE_CONFIG = {
    APROVADO: { min: 500, color: '#16a34a', label: 'Crédito Aprovado' },
    RESTRITO: { min: 0, color: '#dc2626', label: 'Crédito Restrito' },
}

export class CreditChecker {

    /**
     * Verifica o crédito de um cliente.
     * Em produção: substituir o bloco MOCK pelo SDK do Serasa/Boa Vista.
     */
    static async check(cpf: string, requestedAmount: number): Promise<CreditCheckResult> {
        const cleanCpf = cpf.replace(/\D/g, '')

        if (!cleanCpf || cleanCpf.length !== 11) {
            throw new Error('CPF inválido para análise de crédito. O CPF deve ter 11 dígitos.')
        }

        // ─── MODO REAL (DESCOMENTAR PARA PRODUÇÃO) ───────────────────────────
        /*
        const response = await fetch('https://api.serasaexperian.com.br/score/v1/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SERASA_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cpf: cleanCpf })
        })
        const data = await response.json()
        return {
            score: data.score,
            limit: data.creditLimit,
            status: data.score >= 500 ? 'APROVADO' : 'RESTRITO',
            reason: data.reason || '',
            source: 'SERASA',
            checkedAt: new Date()
        }
        */

        // ─── MODO MOCK (Simulação realista para desenvolvimento) ─────────────
        await new Promise(r => setTimeout(r, 800)) // Simula latência real da API

        // Algoritmo deterministico baseado no CPF para resultados consistentes
        const cpfSum = cleanCpf.split('').reduce((sum, d) => sum + parseInt(d), 0)
        const score = ((cpfSum * 37) % 1000)

        let limit = 0
        let status: CreditCheckResult['status'] = 'RESTRITO'
        let reason = ''

        if (score >= 700) {
            limit = Math.min(requestedAmount * 3, 15000)
            status = 'APROVADO'
            reason = 'Excelente histórico de pagamentos. Limite generoso disponível.'
        } else if (score >= 500) {
            limit = Math.min(requestedAmount * 1.5, 5000)
            status = 'APROVADO'
            reason = 'Bom histórico. Limite moderado aprovado para este CPF.'
        } else if (score >= 300) {
            limit = Math.min(requestedAmount * 0.5, 1500)
            status = 'APROVADO'
            reason = 'Crédito aprovado com limite reduzido. Recomenda-se entrada maior.'
        } else {
            limit = 0
            status = 'RESTRITO'
            reason = 'CPF com restrição no bureau de crédito. Crediário não disponível.'
        }

        return {
            score,
            limit,
            status,
            reason,
            source: 'MOCK',
            checkedAt: new Date()
        }
    }

    /**
     * Retorna a configuração visual para exibir o score no dashboard
     */
    static getScoreVisual(score: number) {
        if (score >= 700) return { label: 'Excelente', color: '#16a34a', bg: '#dcfce7', bars: 5 }
        if (score >= 500) return { label: 'Bom', color: '#65a30d', bg: '#f0fdf4', bars: 4 }
        if (score >= 300) return { label: 'Regular', color: '#b45309', bg: '#fef9c3', bars: 3 }
        if (score >= 150) return { label: 'Ruim', color: '#ea580c', bg: '#ffedd5', bars: 2 }
        return { label: 'Péssimo', color: '#dc2626', bg: '#fee2e2', bars: 1 }
    }
}
