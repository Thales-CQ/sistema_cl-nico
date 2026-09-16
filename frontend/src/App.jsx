import { useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import { useNavigation } from "./hooks/useNavigation";
import { navigationItems } from "./routes/navigation";
import AuthLayout from "./layouts/AuthLayout/AuthLayout";
import MainLayout from "./layouts/MainLayout/MainLayout";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Patients from "./pages/Patients/Patients";
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
    <MainLayout navigationItems={navigationItems} currentDestination={destination}>
      {destination.id === "pacientes" ? (
        <Patients
          view={destination.view}
          onViewChange={(view) => navigate(`pacientes-${view}`)}
        />
      ) : (
        <Dashboard
          user={user}
        />
      )}
    </MainLayout>
  ) : <Login />;
}
