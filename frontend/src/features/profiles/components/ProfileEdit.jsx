import Button from "../../../components/Button/Button";

export default function ProfileEdit({ loading, error, onCancel, children }) {
  if (loading) return <p className="profiles__load-message" role="status">Carregando perfil...</p>;
  if (error) return <div className="profiles__load-message profiles__load-message--error" role="alert">
    <p>{error}</p><Button variant="secondary" onClick={onCancel}>Voltar</Button>
  </div>;
  return children ?? null;
}
