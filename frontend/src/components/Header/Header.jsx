import BrandMark from "../BrandMark/BrandMark";
import Button from "../Button/Button";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import { displayUserName } from "../../services/displayUserName";
import "./Header.css";

export default function Header({ user, onLogout, operationLoading = false }) {
  const displayName = displayUserName(user);

  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__brand">
          <span className="header__brand-mark">
            <BrandMark />
          </span>
          <div className="header__brand-copy">
            <p className="header__brand-name">Sistema Clínico</p>
          </div>
        </div>

        <div className="header__account">
          {displayName && (
            <div className="header__identity">
              <span className="header__identity-details">
                <span className="header__identity-label">Usuário</span>
                <strong>{displayName}</strong>
              </span>
            </div>
          )}

          <div className="header__actions">
            <ThemeToggle />

            <Button
              className="header__logout"
              variant="secondary"
              disabled={operationLoading}
              onClick={onLogout}
            >
              Sair
            </Button>
          </div>
        </div>

        <p className="header__status" role="status" aria-live="polite">
          {operationLoading ? "Aguarde, processando solicitação..." : ""}
        </p>
      </div>
    </header>
  );
}
