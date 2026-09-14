import { useAuth } from "./hooks/useAuth";
import AuthLayout from "./layouts/AuthLayout/AuthLayout";
import MainLayout from "./layouts/MainLayout/MainLayout";
import Login from "./pages/Login/Login";
import Patients from "./pages/Patients/Patients";
import Button from "./components/Button/Button";

export default function App() {
  const {
    initialLoading, initialCheckFailed, isAuthenticated,
    operationLoading, retrySessionCheck,
  } = useAuth();
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
  return isAuthenticated ? <MainLayout><Patients /></MainLayout> : <Login />;
}
