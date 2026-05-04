'use client'

import { useState, useEffect } from 'react'
import s from './AdvancedFilters.module.css'

interface Category {
    id: string
    name: string
}

interface Subcategory {
    id: string
    name: string
    categoryId: string
}

interface InventoryFilters extends Record<string, string> {
    search: string
    categoryId: string
    subcategoryId: string
    brand: string
    frameColor: string
    frameSize: string
    frameModel: string
    supplierName: string
    archived: string
    startDate: string
    endDate: string
    orderBy: string
}

interface FilterProps {
    onFilter: (filters: InventoryFilters) => void
}

export function AdvancedFilters({ onFilter }: FilterProps) {
    const [categories, setCategories] = useState<Category[]>([])
    const [subcategories, setSubcategories] = useState<Subcategory[]>([])
    const [allSubcategories, setAllSubcategories] = useState<Subcategory[]>([])

    // States do filtro
    const [search, setSearch] = useState('')
    const [periodType, setPeriodType] = useState('Nenhum')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [catId, setCatId] = useState('')
    const [subId, setSubId] = useState('')
    const [brand, setBrand] = useState('')
    const [color, setColor] = useState('')
    const [size, setSize] = useState('')
    const [model, setModel] = useState('')
    const [supplier, setSupplier] = useState('')
    const [archivedMode, setArchivedMode] = useState('false')
    const [order, setOrder] = useState('name')

    useEffect(() => {
        fetch('/api/products/categories').then(r => r.json()).then(d => setCategories(d.categories || []))
        fetch('/api/products/subcategories').then(r => r.json()).then(d => {
            setAllSubcategories(d.subcategories || [])
        })
    }, [])

    useEffect(() => {
        if (catId) {
            setSubcategories(allSubcategories.filter(s => s.categoryId === catId))
        } else {
            setSubcategories([])
        }
        setSubId('')
    }, [catId, allSubcategories])

    const handleSearch = () => {
        onFilter({
            search,
            categoryId: catId,
            subcategoryId: subId,
            brand,
            frameColor: color,
            frameSize: size,
            frameModel: model,
            supplierName: supplier,
            archived: archivedMode,
            startDate,
            endDate,
            orderBy: order
        })
    }

    return (
        <div className={s.container}>
            <div className={s.header}>
                <button className={s.btnPrimary}>+ Novo Produto</button>
                <button className={s.btnSecondary}>☁ Importar produtos ▾</button>
            </div>

            <div className={s.grid}>
                {/* Linha 1 */}
                <div className={s.fieldGroup} style={{ gridColumn: 'span 2' }}>
                    <label className={s.label}>Busca ℹ</label>
                    <div className={s.searchWrapper}>
                        <span className={s.searchIcon}>🔍</span>
                        <input
                            className={s.input}
                            placeholder="Busque pela descrição do produto, referência, código de barras..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className={s.fieldGroup}>
                    <label className={s.label}>Tipo de período</label>
                    <select className={s.select} value={periodType} onChange={e => setPeriodType(e.target.value)}>
                        <option>Nenhum</option>
                        <option>Cadastro</option>
                    </select>
                </div>

                <div className={s.fieldGroup}>
                    <label className={s.label}>Período</label>
                    <div className={s.dateRange}>
                        <input type="date" className={s.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <span>a</span>
                        <input type="date" className={s.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>

                {/* Linha 2 */}
                <div className={s.fieldGroup}>
                    <label className={s.label}>📁 Grupos</label>
                    <select className={s.select} value={catId} onChange={e => setCatId(e.target.value)}>
                        <option value="">Escolha uma opção</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className={s.fieldGroup}>
                    <label className={s.label}>▤ Subgrupos</label>
                    <select className={s.select} value={subId} onChange={e => setSubId(e.target.value)} disabled={!catId}>
                        <option value="">Escolha uma opção</option>
                        {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                <div className={s.fieldGroup}>
                    <label className={s.label}>🕶 Grifes</label>
                    <input className={s.input} placeholder="Marca/Grife" value={brand} onChange={e => setBrand(e.target.value)} />
                </div>

                {/* Linha 3 */}
                <div className={s.fieldGroup}>
                    <label className={s.label}>💧 Cores</label>
                    <input className={s.input} placeholder="Escolha uma opção" value={color} onChange={e => setColor(e.target.value)} />
                </div>

                <div className={s.fieldGroup}>
                    <label className={s.label}>✢ Tamanhos</label>
                    <input className={s.input} placeholder="Escolha uma opção" value={size} onChange={e => setSize(e.target.value)} />
                </div>

                <div className={s.fieldGroup}>
                    <label className={s.label}>■ Formatos</label>
                    <input className={s.input} placeholder="Escolha uma opção" value={model} onChange={e => setModel(e.target.value)} />
                </div>

                {/* Linha 4 */}
                <div className={s.fieldGroup}>
                    <label className={s.label}>🚚 Fornecedores</label>
                    <input className={s.input} placeholder="Escolha uma opção" value={supplier} onChange={e => setSupplier(e.target.value)} />
                </div>

                <div className={s.fieldGroup}>
                    <label className={s.label}>Mostrar somente produtos</label>
                    <select className={s.select} value={archivedMode} onChange={e => setArchivedMode(e.target.value)}>
                        <option value="false">Não arquivados</option>
                        <option value="true">Arquivados</option>
                        <option value="all">Todos</option>
                    </select>
                </div>

                <div className={s.fieldGroup}>
                    <label className={s.label}>Ordenar por</label>
                    <select className={s.select} value={order} onChange={e => setOrder(e.target.value)}>
                        <option value="name">Referência/Nome</option>
                        <option value="salePrice">Preço de Venda</option>
                        <option value="createdAt">Data de Cadastro</option>
                    </select>
                </div>

                <div className={s.actions}>
                    <button className={s.btnSearch} onClick={handleSearch}>
                        🔍 Buscar
                    </button>
                </div>
            </div>
        </div>
    )
}
