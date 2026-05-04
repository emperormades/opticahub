import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import BookingForm from "./BookingForm";
import { Metadata } from "next";

interface PageProps {
  params: {
    tenantSlug: string;
  };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const tenant = await prisma.tenant.findFirst({
    where: { slug: params.tenantSlug, isActive: true },
    select: { name: true },
  });

  return {
    title: `Agende seu Exame - ${tenant?.name || "Ótica"}`,
    description: "Agendamento online rápido e prático para o seu exame visual.",
  };
}

export default async function AgendamentoPublicoPage(props: PageProps) {
  const params = await props.params;
  const tenant = await prisma.tenant.findFirst({
    where: { slug: params.tenantSlug, isActive: true },
    select: { name: true, slug: true },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        padding: "40px 20px",
        fontFamily: "var(--font-sans)",
        color: "var(--text-primary)",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: "var(--brand-primary-light)",
              color: "var(--brand-primary)",
              borderRadius: "var(--radius-full)",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            👁️
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: 8,
              letterSpacing: "-0.4px",
            }}
          >
            {tenant.name}
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Agendamento de Consulta Optométrica
          </p>
        </header>
        <div
          style={{
            background: "var(--bg-elevated)",
            padding: 20,
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            border: "1px solid var(--border-subtle)",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Jornada Guiada
          </div>
          <div
            style={{
              marginTop: 8,
              display: "grid",
              gap: 6,
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            <div>1. Escolha um horario preferencial.</div>
            <div>2. Informe seu WhatsApp principal.</div>
            <div>
              3. Nossa equipe confirma a disponibilidade antes de fechar a
              agenda.
            </div>
          </div>
        </div>

        <BookingForm tenantSlug={tenant.slug} />
      </div>
    </div>
  );
}
