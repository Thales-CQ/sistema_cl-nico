export function maskBirthDate(value) {
  return value.replace(/\D/g, "").slice(0, 8)
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2}\/\d{2})(\d)/, "$1/$2");
}

export function validateUserFullName(value) {
  const words = value.trim().split(/\s+/u).filter(Boolean);
  if (words.length < 2 || words.some((word) => !/\p{L}/u.test(word))) {
    throw new Error("Informe o nome completo com pelo menos nome e sobrenome.");
  }
}

export function displayBirthDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function apiBirthDate(value) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    throw new Error("Informe a data de nascimento no formato DD/MM/AAAA.");
  }
  const [day, month, year] = value.split("/").map(Number);
  const parsed = new Date(0);
  parsed.setUTCFullYear(year, month - 1, day);
  if (year < 1 || parsed.getUTCFullYear() !== year
      || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error("Informe uma data de nascimento válida.");
  }
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (iso > today) throw new Error("A data de nascimento não pode ser futura.");
  return iso;
}

export function validatePasswordConfirmation(password, confirmation) {
  // Match Python's character count, including characters outside the BMP.
  if ([...password].length < 12) throw new Error("A senha deve ter pelo menos 12 caracteres.");
  if (password !== confirmation) throw new Error("A confirmação da senha não confere.");
}
