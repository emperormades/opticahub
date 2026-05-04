import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./dashboard.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  id: string;
  roles?: string[];
};

type NavSection = {
  section: string;
  roles?: string[];
  items: NavItem[];
};

const navItems: NavSection[] = [
  {
    section: "VENDAS & CRM",
    items: [
      {
        href: "/dashboard",
        label: "Panorama",
        icon: "🦅",
        id: "nav-dashboard",
        roles: ["ADMIN", "GERENTE"],
      },
      {
        href: "/dashboard/clinica-hub",
        label: "Hub Clínica & CRM",
        icon: "🩺",
        id: "nav-clinica-hub",
        roles: ["ADMIN", "GERENTE", "VENDEDOR"],
      },
      {
        href: "/dashboard/clientes",
        label: "Clientes",
        icon: "👥",
        id: "nav-clientes",
        roles: ["ADMIN", "GERENTE", "VENDEDOR"],
      },
      {
        href: "/dashboard/ordens",
        label: "Ordens de Serviço",
        icon: "👓",
        id: "nav-ordens",
        roles: ["ADMIN", "GERENTE", "VENDEDOR"],
      },
    ],
  },
  {
    section: "FINANCEIRO & ESTOQUE",
    items: [
      {
        href: "/dashboard/financeiro/caixa",
        label: "Caixa Diário",
        icon: "💵",
        id: "nav-cash",
        roles: ["ADMIN", "GERENTE", "FINANCEIRO"],
      },
      {
        href: "/dashboard/financeiro/carne",
        label: "Carteira de Carnês",
        icon: "💳",
        id: "nav-carne",
        roles: ["ADMIN", "GERENTE", "FINANCEIRO"],
      },
      {
        href: "/dashboard/financeiro-hub",
        label: "Hub Financeiro",
        icon: "🏦",
        id: "nav-financeiro-hub",
        roles: ["ADMIN", "GERENTE", "FINANCEIRO"],
      },
      {
        href: "/dashboard/estoque",
        label: "Estoque & Lentes",
        icon: "📦",
        id: "nav-estoque",
        roles: ["ADMIN", "GERENTE"],
      },
      {
        href: "/dashboard/backoffice",
        label: "Logística & Lab",
        icon: "🔬",
        id: "nav-backoffice",
        roles: ["ADMIN", "GERENTE", "VENDEDOR"],
      },
    ],
  },
  {
    section: "ADMINISTRAÇÃO",
    items: [
      {
        href: "/dashboard/financeiro/comissoes",
        label: "Comissões",
        icon: "🏅",
        id: "nav-commissions",
        roles: ["ADMIN", "GERENTE"],
      },
      {
        href: "/dashboard/analytics",
        label: "Analytics & DRE",
        icon: "📊",
        id: "nav-analytics",
        roles: ["ADMIN"],
      },
      {
        href: "/dashboard/agentes",
        label: "Agentes / Equipe",
        icon: "👤",
        id: "nav-agentes",
        roles: ["ADMIN"],
      },
      {
        href: "/dashboard/financeiro/conciliacao",
        label: "Conciliação Bancária",
        icon: "🔄",
        id: "nav-conciliacao",
        roles: ["ADMIN", "FINANCEIRO"],
      },
      {
        href: "/dashboard/admin",
        label: "Configurações",
        icon: "⚙️",
        id: "nav-admin",
        roles: ["ADMIN"],
      },
    ],
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const roles = user.roles ?? [];

  return (
    <div className={styles.shell}>
      {/* ─── SIDEBAR ─────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div className={styles.sidebarLogoIcon}>👁️</div>
          <div>
            <div className={styles.sidebarLogoText}>VisionCore OS</div>
            <div className={styles.sidebarLogoSub}>Gestão Óptica</div>
          </div>
        </div>

        <nav className={styles.sidebarNav} aria-label="Navegação principal">
          {navItems.map((section) => {
            const visibleItems = section.items.filter(
              (item) =>
                !item.roles ||
                item.roles.some((r) => roles.includes(r)),
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.section} className={styles.navSection}>
                <div className={styles.navSectionLabel}>{section.section}</div>
                {visibleItems.map((item) => (
                  <Link
                    key={item.href}
                    id={item.id}
                    href={item.href}
                    className={styles.navItem}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {getInitials(user.name || "U")}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userRole}>{roles[0] || "Usuário"}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN ──────────────────────────────────────────────── */}
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerTitle}>
              {user.tenantName || "VisionCore OS"}
            </span>
            <span className={styles.headerBreadcrumb}>
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.headerTenantBadge}>
              <div className={styles.headerTenantDot} />
              <span>{user.tenantSlug || "tenant"}</span>
            </div>

            {/* * Botão de notificações — visual, sem lógica nesta fase */}
            <button
              type="button"
              className={styles.headerNotifBtn}
              title="Notificações"
              aria-label="Notificações"
            >
              🔔
              <span className={styles.headerNotifDot} />
            </button>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                id="btn-logout"
                type="submit"
                className={styles.headerBtn}
                title="Sair do sistema"
              >
                Sair →
              </button>
            </form>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
