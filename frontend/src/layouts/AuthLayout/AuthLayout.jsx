import "./AuthLayout.css";

export default function AuthLayout({ children }) {
  return (
    <main className="auth-layout">
      <div className="auth-layout__panel">
        <h1 className="auth-layout__title">Sistema Clínico</h1>
        {children}
      </div>
    </main>
  );
}
