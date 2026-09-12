import Button from "../../components/Button/Button";
import { useAuth } from "../../hooks/useAuth";
import "./MainLayout.css";

export default function MainLayout() {
  const { user, logout, operationLoading, error } = useAuth();
  return (
    <main className="main-layout">
      <section className="main-layout__panel" aria-labelledby="main-title">
        <h1 id="main-title">Sistema Clínico</h1>
        <div className="main-layout__identity">
          <h2>Área autenticada</h2>
          <p>Usuário: <strong>{user.username}</strong></p>
        </div>
        {error && <p className="main-layout__error" role="alert">{error}</p>}
        {operationLoading && (
          <p className="main-layout__status" role="status">Aguarde, processando solicitação...</p>
        )}
        <div className="main-layout__actions">
          <Button disabled={operationLoading} onClick={logout}>Sair</Button>
        </div>
      </section>
    </main>
  );
}
