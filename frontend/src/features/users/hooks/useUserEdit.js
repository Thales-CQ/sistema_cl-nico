import { useEffect, useState } from "react";
import { getAssignableProfiles, getUser, updateUserStatus } from "../../../services/api";
import { statusChanged } from "../state/userEditState";

export async function completeUserEditStatus(updatedUser, {
  originalIsActive,
  desiredStatus,
  statusIncluded = false,
}) {
  if (statusChanged(originalIsActive, desiredStatus) && !statusIncluded) {
    const status = await updateUserStatus(updatedUser.id, desiredStatus);
    return status.user;
  }
  return updatedUser;
}

export default function useUserEdit({ userId, onSaved, onFailure, canAssignProfiles = false, passwordButton }) {
  const [user, setUser] = useState(null);
  const [originalIsActive, setOriginalIsActive] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [working, setWorking] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    let active = true;
    const request = canAssignProfiles
      ? Promise.all([getUser(userId), getAssignableProfiles()])
      : getUser(userId).then((userData) => [userData, { profiles: [] }]);
    request.then(
      ([userData, profilesData]) => {
        if (!active) return;
        setUser(userData.user);
        setOriginalIsActive(userData.user.is_active);
        setProfiles(profilesData.profiles.length ? profilesData.profiles : (userData.user.profiles ?? []));
      },
      (failure) => {
        if (!active) return;
        setLoadError(failure.message);
        onFailure(failure);
      },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, onFailure, canAssignProfiles]);

  async function changeStatus() {
    const action = user.is_active ? "inativar" : "reativar";
    if (!window.confirm(`Deseja ${action} o usuário ${user.full_name || user.username}?`)) return;
    setStatusError("");
    setUser((current) => ({ ...current, is_active: !current.is_active }));
  }

  async function handleFormSaved(updatedUser, { statusIncluded = false } = {}) {
    const desiredStatus = user.is_active;
    try {
      const savedUser = await completeUserEditStatus(updatedUser, {
        originalIsActive,
        desiredStatus,
        statusIncluded,
      });
      setUser(savedUser);
      setOriginalIsActive(savedUser.is_active);
      onSaved(savedUser);
    } catch (failure) {
      setStatusError(failure.message);
      throw failure;
    }
  }

  function cancelPasswordReset() {
    setResettingPassword(false);
    // The trigger becomes enabled after React commits the close.
    requestAnimationFrame(() => passwordButton.current?.focus());
  }

  return {
    cancelPasswordReset, changeStatus, handleFormSaved, loadError, loading,
    profiles, resettingPassword, setResettingPassword, setWorking, statusError, user, working,
  };
}
