import { useState } from "react";
import Button from "../../components/Button/Button";
import { useAuth } from "../../hooks/useAuth";
import AuthLayout from "../../layouts/AuthLayout/AuthLayout";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, operationLoading, error } = useAuth();

  function handleSubmit(event) {
    event.preventDefault();
    if (operationLoading) return;
    void login(username, password);
    setPassword("");
  }

  return (
    <AuthLayout>
      <div className="login__intro">
        <h2 id="login-title">Entrar</h2>
        <p className="login__description">Informe suas credenciais para acessar o sistema.</p>
      </div>
      <form className="login__form" onSubmit={handleSubmit} aria-busy={operationLoading}
        aria-labelledby="login-title" aria-describedby={error ? "login-error" : undefined}>
        <div className="login__field">
          <label className="login__label" htmlFor="username">Nome de usuário</label>
          <input className="login__input" id="username" name="username" autoComplete="username"
            autoCapitalize="none" spellCheck={false}
            required value={username} disabled={operationLoading}
            onChange={(event) => setUsername(event.target.value)} />
        </div>
        <div className="login__field">
          <label className="login__label" htmlFor="password">Senha</label>
          <input className="login__input" id="password" name="password" type="password"
            autoComplete="current-password" required value={password}
            disabled={operationLoading}
            onChange={(event) => setPassword(event.target.value)} />
        </div>
        {error && <p className="login__error" id="login-error" role="alert">{error}</p>}
        {operationLoading && (
          <p className="login__status" role="status">Aguarde, processando solicitação...</p>
        )}
        <Button type="submit" disabled={operationLoading}>Entrar</Button>
      </form>
    </AuthLayout>
  );
}
