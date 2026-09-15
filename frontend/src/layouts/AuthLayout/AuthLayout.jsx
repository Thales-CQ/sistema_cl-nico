import "./AuthLayout.css";

export default function AuthLayout({ children }) {
  return (
    <main className="auth-layout">
      <section className="auth-layout__panel" aria-labelledby="auth-layout-title">
        <h1 id="auth-layout-title" className="auth-layout__title">Sistema Clínico</h1>
        {children}
      </section>
    </main>
  );
}
