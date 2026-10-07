import { useEffect, useState } from "react";
import { getPermissionCatalog, getProfile } from "../../../services/api";

export default function useProfileEdit({ profileId }) {
  const [profile, setProfile] = useState(null);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getProfile(profileId), getPermissionCatalog()]).then(
      ([profileData, permissionData]) => {
        if (!active) return;
        setProfile(profileData.profile);
        setPermissionCatalog(permissionData.permissions ?? []);
      },
      (failure) => { if (active) setError(failure.message); },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profileId]);

  return { error, loading, permissionCatalog, profile };
}
