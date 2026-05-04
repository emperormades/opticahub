'use client'

import React from 'react'
import styles from './Tabs.module.css'

interface Tab {
    id: string
    label: string
    icon?: string
}

interface TabsProps {
    tabs: Tab[]
    activeTab: string
    onChange: (id: string) => void
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
    return (
        <div className={styles.tabsContainer}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`${styles.tabItem} ${activeTab === tab.id ? styles.active : ''}`}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.icon && <span className={styles.tabIcon}>{tab.icon}</span>}
                    <span className={styles.tabLabel}>{tab.label}</span>
                </button>
            ))}
        </div>
    )
}
