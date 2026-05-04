"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import PanoramaPage from "./panorama/page";
import AnalyticsPage from "./panorama/analytics-page";
import DrePage from "./analytics/dre/page";
import s from "./shared.module.css";

const UI_TABS = [
  { id: "PANORAMA", label: "Visão Integrada", icon: "PAN" },
  { id: "ANALYTICS", label: "Monitor de Vendas", icon: "MON" },
  { id: "DRE", label: "DRE e Metas", icon: "DRE" },
];

export default function DashboardHubPage() {
  const [activeTab, setActiveTab] = useState("PANORAMA");

  return (
    <div className={s.page} style={{ paddingTop: 0 }}>
      {/* ─── Tab Bar ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "14px 24px",
          background: "#ffffff",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <h1
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#111827",
            margin: 0,
            letterSpacing: "-0.3px",
          }}
        >
          Panorama Estratégico
        </h1>
        <Tabs tabs={UI_TABS} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === "PANORAMA" && <PanoramaPage />}
      {activeTab === "ANALYTICS" && <AnalyticsPage />}
      {activeTab === "DRE" && <DrePage />}
    </div>
  );
}
