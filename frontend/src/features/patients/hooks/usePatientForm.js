import { useEffect, useRef, useState } from "react";
import { createPatient, updatePatient } from "../../../services/api";

export default function usePatientForm({
  patient = null,
  mode = "create",
  canChangeStatus = false,
  onCreated,
  onUpdated,
}) {
  const editing = mode === "edit" && patient;
  const [fullName, setFullName] = useState(patient?.full_name || "");
  const [birthDate, setBirthDate] = useState(patient?.birth_date || "");
  const [sex, setSex] = useState(patient?.sex || "");
  const [cpf, setCpf] = useState(patient?.cpf || "");
  const [phone, setPhone] = useState(patient?.phone || "");
  const [email, setEmail] = useState(patient?.email || "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const nameInput = useRef(null);

  useEffect(() => {
    nameInput.current?.focus();
  }, []);

  function resetForm() {
    setFullName("");
    setBirthDate("");
    setSex("");
    setCpf("");
    setPhone("");
    setEmail("");
    setSaveError("");
    setFieldErrors({});
    setSaving(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      full_name: fullName,
      birth_date: birthDate || null,
      sex,
      cpf: cpf || null,
      phone: phone || null,
      email: email || null,
    };
    if (editing && canChangeStatus) payload.is_active = patient.is_active;
    setSaving(true);
    setSaveError("");
    setFieldErrors({});
    try {
      const data = editing
        ? await updatePatient(patient.id, payload)
        : await createPatient(payload);
      if (editing) {
        await onUpdated(data.patient);
        resetForm();
      } else {
        resetForm();
        onCreated(data.patient);
      }
    } catch (error) {
      if (error.errors) {
        setFieldErrors(error.errors);
      } else if (error.status === 409 && error.message === "CPF já cadastrado.") {
        setFieldErrors((current) => ({ ...current, cpf: error.message }));
      } else {
        setSaveError(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return {
    birthDate,
    cpf,
    editing,
    email,
    fieldErrors,
    fullName,
    handleSubmit,
    nameInput,
    phone,
    saveError,
    saving,
    setBirthDate,
    setCpf,
    setEmail,
    setFullName,
    setPhone,
    setSex,
    sex,
  };
}
