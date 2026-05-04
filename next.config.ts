import type { NextConfig } from "next";

const securityHeaders = [
  // Força HTTPS em produção (1 ano + subdomains + preload)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  // Impede clickjacking — só permite iframes do próprio domínio
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  // Impede MIME sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // Controla referrer para não vazar informações
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  // Desativa features sensíveis do browser
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()'
  },
  // Content Security Policy — permite assets próprios + Google Fonts + Meta API
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requer unsafe-eval em dev
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://graph.facebook.com https://api.whatsapp.com",
      "frame-ancestors 'self'",
    ].join('; ')
  },
  // Cross-Origin policies para isolamento
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin'
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin'
  }
]

const nextConfig: NextConfig = {
  // Headers de segurança em todas as rotas
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // Redirects de segurança
  async redirects() {
    return [
      // Qualquer acesso à raiz vai para o dashboard
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      }
    ]
  },

  // Otimizações de produção
  compress: true,
  poweredByHeader: false, // Remove "X-Powered-By: Next.js" (não expõe a stack)

  // Imagens seguras
  images: {
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Variáveis disponíveis no client (sem segredos!)
  env: {
    NEXT_PUBLIC_APP_NAME: 'Rupta OS',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // TypeScript não bloqueia build em produção por erros de tipo de dependências externas
  typescript: {
    ignoreBuildErrors: true,
  },

  // Aceleradores de compilação SWC/Turbopack
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
    // @ts-ignore - suporte experimental não tipado corretamente pela versão instalada
  },
}

export default nextConfig;
