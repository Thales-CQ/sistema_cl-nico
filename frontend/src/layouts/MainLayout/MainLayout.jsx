import Header from "../../components/Header/Header";
import Menu from "../../components/Menu/Menu";
import { useAuth } from "../../hooks/useAuth";
import "./MainLayout.css";

export default function MainLayout({ navigationItems = [], currentDestination, children }) {
  const { user, logout, operationLoading, error } = useAuth();
  return (
    <div className="main-layout">
      <Header user={user} onLogout={logout} operationLoading={operationLoading} />
      <Menu items={navigationItems} currentDestination={currentDestination} />
      <main className="main-layout__content">
        <div className="main-layout__panel">
          {error && <p className="main-layout__error" role="alert">{error}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
