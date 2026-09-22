import { useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import { useNavigation } from "./hooks/useNavigation";
import { navigationForUser } from "./routes/navigation";
import AuthLayout from "./layouts/AuthLayout/AuthLayout";
import MainLayout from "./layouts/MainLayout/MainLayout";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Patients from "./pages/Patients/Patients";
import Users from "./pages/Users/Users";
import Profiles from "./pages/Profiles/Profiles";
import ChangePassword from "./pages/ChangePassword/ChangePassword";
import Button from "./components/Button/Button";

export default function App() {
  const {
    initialLoading, initialCheckFailed, isAuthenticated,
    operationLoading, retrySessionCheck, user,
  } = useAuth();
  const { destination, navigate } = useNavigation();
  const awaitingLogin = useRef(false);

  useEffect(() => {
    if (initialLoading || initialCheckFailed) return;
    if (isAuthenticated && awaitingLogin.current) navigate("inicio");
    awaitingLogin.current = !isAuthenticated;
  }, [initialLoading, initialCheckFailed, isAuthenticated, navigate]);

  if (initialLoading) {
    return <AuthLayout><p role="status">Carregando...</p></AuthLayout>;
  }
  if (initialCheckFailed) {
    return (
      <AuthLayout>
        <p role="alert">Não foi possível conectar ao sistema. Tente novamente.</p>
        {operationLoading && <p role="status">Carregando...</p>}
        <Button disabled={operationLoading} onClick={retrySessionCheck}>
          Tentar novamente
        </Button>
      </AuthLayout>
    );
  }
  return isAuthenticated ? (
    <MainLayout navigationItems={navigationForUser(user)} currentDestination={destination}>
      {destination.id === "pacientes" ? (
        <Patients
          view={destination.view}
          onViewChange={(view) => navigate(`pacientes-${view}`)}
        />
      ) : destination.id === "usuarios" ? (
        user?.is_admin === true ? <Users
          key={destination.routeId}
          view={destination.view}
          onViewChange={(view) => navigate(`usuarios-${view}`)}
        /> : <p role="alert">Acesso restrito a administradores.</p>
      ) : destination.id === "perfis" ? (
        user?.is_admin === true ? <Profiles
          view={destination.view}
          onViewChange={(view) => navigate(`perfis-${view}`)}
        />
          : <p role="alert">Acesso restrito a administradores.</p>
      ) : destination.id === "alterar-senha" ? (
        <ChangePassword />
      ) : (
        <Dashboard
          user={user}
        />
      )}
    </MainLayout>
  ) : <Login />;
}
