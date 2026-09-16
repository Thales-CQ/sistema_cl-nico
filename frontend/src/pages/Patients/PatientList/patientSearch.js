export function filterPatients(patients, query) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) return patients;

  return patients.filter((patient) => (
    [patient.full_name, patient.cpf, patient.phone]
      .map(normalize)
      .some((value) => value.includes(normalizedQuery))
  ));
}

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
