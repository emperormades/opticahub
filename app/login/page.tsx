"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.fieldGroup}>
        <label htmlFor="tenantSlug" className={styles.fieldLabel}>
          CÓDIGO DA EMPRESA
        </label>
        <input
          id="tenantSlug"
          name="tenantSlug"
          type="text"
          placeholder="opcional — modo offline"
          className={styles.fieldInput}
          autoComplete="organization"
        />
      </div>

      <div className={styles.divider} />

      <div className={styles.fieldGroup}>
        <label htmlFor="email" className={styles.fieldLabel}>
          EMAIL
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="opcional — modo offline"
          className={styles.fieldInput}
          autoComplete="email"
        />
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="password" className={styles.fieldLabel}>
          SENHA
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          className={styles.fieldInput}
          autoComplete="current-password"
        />
      </div>

      <button
        id="btn-login-submit"
        type="submit"
        className={styles.submitButton}
      >
        Entrar
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.loginPage}>
      <div className={styles.gridPattern} />

      <div className={styles.loginCard}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>🛰️</div>
          <div>
            <h1 className={styles.logoTitle}>Mades OS</h1>
          </div>
        </div>

        <p className={styles.formTitle}>Acesso ao Painel de Comando</p>
        <p className={styles.formSubtitle}>
          Modo offline — use Entrar para abrir o painel (sem banco de dados).
        </p>

        <Suspense fallback={<div className={styles.loadingSpinner} />}>
          <LoginForm />
        </Suspense>

        <p className={styles.footer}>
          Rupta OS • UI demonstrativa sem persistência
        </p>
      </div>
    </div>
  );
}
