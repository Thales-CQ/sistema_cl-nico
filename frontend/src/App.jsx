import { useEffect, useState } from "react";
import { healthCheck } from "./services/api";

function App() {
  const [status, setStatus] = useState("Verificando servidor...");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkServer() {
      try {
        const data = await healthCheck();

        if (data.status === "ok") {
          setStatus("Backend online");
        } else {
          setStatus("Resposta inesperada do servidor");
        }
      } catch (err) {
        setStatus("Backend offline");
        setError(err.message);
      }
    }

    checkServer();
  }, []);

  return (
    <main>
      <h1>Sistema Clínico</h1>

      <p>Status da comunicação:</p>

      <strong>{status}</strong>

      {error && <p>{error}</p>}
    </main>
  );
}

export default App;
