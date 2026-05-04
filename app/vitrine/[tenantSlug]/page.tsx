import type { Metadata } from "next";
import PublicTrackingView from "./PublicTrackingView";

type PageProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

function toStoreName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const storeName = toStoreName(params.tenantSlug);

  return {
    title: `Acompanhe seu Óculos | ${storeName}`,
    description:
      "Acompanhe o status do seu pedido em tempo real de forma simples e mobile.",
  };
}

export default async function VitrinePublicaPage(props: PageProps) {
  const params = await props.params;

  return <PublicTrackingView tenantSlug={params.tenantSlug} />;
}
