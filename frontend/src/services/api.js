const API_URL = "/api/v1";

export async function healthCheck() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error("Erro ao comunicar com o servidor.");
  }

  return response.json();
}
