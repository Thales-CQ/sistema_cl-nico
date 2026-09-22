import { useEffect, useState } from "react";
import Button from "../../../components/Button/Button";
import { getProfile } from "../../../services/api";
import ProfileCreate from "../ProfileCreate/ProfileCreate";

export default function ProfileEdit({ profileId, onSaved, onCancel }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getProfile(profileId).then(
      (data) => { if (active) setProfile(data.profile); },
      (failure) => { if (active) setError(failure.message); },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profileId]);

  if (loading) return <p className="profiles__load-message" role="status">Carregando perfil...</p>;
  if (error) return <div className="profiles__load-message profiles__load-message--error" role="alert">
    <p>{error}</p><Button variant="secondary" onClick={onCancel}>Voltar</Button>
  </div>;
  if (!profile) return null;

  return <ProfileCreate profile={profile} onSaved={onSaved} onCancel={onCancel} />;
}
