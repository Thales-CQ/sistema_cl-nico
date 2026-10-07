import { useEffect, useMemo, useRef, useState } from "react";
import { getUsers, updateUserStatus } from "../../../services/api";
import { normalizeUserSearch, selectUsers } from "../state/userListQuery";

export async function updateStatusFromList(user, { onStatusUpdated, onFailure }) {
  try {
    const data = await updateUserStatus(user.id, !user.is_active);
    onStatusUpdated(data.user);
    return "";
  } catch (failure) {
    onFailure?.(failure);
    return failure.message;
  }
}

export default function useUserList({ onFailure, initialUsers = [], initialLoading = true }) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const searchInput = useRef(null);
  const normalizedSearch = normalizeUserSearch(search);
  const updating = loading || normalizedSearch !== appliedSearch;
  const visibleUsers = useMemo(() => selectUsers(users, appliedSearch), [users, appliedSearch]);

  async function changeStatus(user) {
    if (updatingStatusId !== null) return;
    const action = user.is_active ? "inativar" : "reativar";
    if (!window.confirm(`Deseja ${action} o usuário ${user.full_name || user.username}?`)) return;
    setUpdatingStatusId(user.id);
    setStatusError("");
    try {
      const statusError = await updateStatusFromList(user, {
        onStatusUpdated(updatedUser) {
          setUsers((current) => current.map((item) => item.id === user.id ? updatedUser : item));
        },
        onFailure,
      });
      setStatusError(statusError);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => setAppliedSearch(normalizedSearch), 300);
    return () => clearTimeout(timeoutId);
  }, [normalizedSearch]);

  useEffect(() => {
    searchInput.current?.focus();
    let active = true;
    getUsers().then(
      (data) => { if (active) setUsers(data.users); },
      (failure) => {
        if (!active) return;
        setError(failure.message);
        onFailure(failure);
      },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [onFailure]);

  return {
    appliedSearch, changeStatus, error, loading, onSearchChange: (event) => setSearch(event.target.value),
    search, searchInput, updating, updatingStatusId, visibleUsers,
    statusError,
  };
}
