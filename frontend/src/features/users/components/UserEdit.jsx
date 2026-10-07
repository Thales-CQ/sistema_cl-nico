import Button from "../../../components/Button/Button";
import "../styles/UserEdit.css";

export default function UserEdit({ loading, loadError, statusError, onCancel, children }) {
  if (loading) return <p className="user-edit__message" role="status">Carregando usuário...</p>;
  if (loadError) return <div className="user-edit__message user-edit__message--error" role="alert">
    <p>{loadError}</p><Button variant="secondary" onClick={onCancel}>Voltar</Button></div>;
  if (!children) return null;
  return <div className="users__edit">
    {statusError && <p className="user-edit__message user-edit__message--error" role="alert">{statusError}</p>}
    {children}
  </div>;
}
