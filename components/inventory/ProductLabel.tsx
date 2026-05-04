'use client'

import React from 'react'

interface ProductLabelProps {
    name: string
    sku: string
    price: number
    brand?: string
}

export const ProductLabel: React.FC<ProductLabelProps> = ({ name, sku, price, brand }) => {
    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=400,height=250')
        if (!printWindow) return

        const barcodeUrl = `/api/barcode?text=${encodeURIComponent(sku)}`

        printWindow.document.write(`
            <html>
                <head>
                    <title>Etiqueta - ${sku}</title>
                    <style>
                        @page { size: 40mm 25mm; margin: 0; }
                        body { 
                            margin: 0; 
                            padding: 2mm; 
                            width: 36mm; 
                            height: 21mm; 
                            font-family: 'Inter', sans-serif; 
                            display: flex; 
                            flex-direction: column; 
                            justify-content: space-between;
                            overflow: hidden;
                        }
                        .header { font-size: 7pt; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; }
                        .brand { font-size: 6pt; color: #555; }
                        .barcode { width: 100%; height: 8mm; display: block; object-fit: contain; }
                        .footer { display: flex; justify-content: space-between; align-items: flex-end; }
                        .sku { font-size: 6pt; font-family: monospace; }
                        .price { font-size: 9pt; font-weight: 800; border: 1px solid #000; padding: 1pt 3pt; border-radius: 2pt; }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    <div class="header">${name}</div>
                    <div class="brand">${brand || 'RUPTA OPTICS'}</div>
                    <img class="barcode" src="${barcodeUrl}" />
                    <div class="footer">
                        <span class="sku">${sku}</span>
                        <span class="price">R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </body>
            </html>
        `)
        printWindow.document.close()
    }

    return (
        <button
            onClick={handlePrint}
            title="Imprimir Etiqueta Térmica"
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                padding: '0.2rem',
                opacity: 0.8
            }}
        >
            🏷️
        </button>
    )
}
