import crypto from 'crypto';

export function onlyDigits(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

export function normalizeBrazilianPhone(value?: string | null) {
  let digits = onlyDigits(value);

  if (digits.startsWith('55') && digits.length === 13) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('0') && digits.length === 12) {
    digits = digits.slice(1);
  }

  return digits;
}

export function isValidBrazilianMobilePhone(value?: string | null) {
  const digits = normalizeBrazilianPhone(value);
  return /^\d{11}$/.test(digits);
}

export function normalizeCpf(value?: string | null) {
  return onlyDigits(value).slice(0, 11);
}

export function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(value?: string | null) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidCpf(value?: string | null) {
  const cpf = normalizeCpf(value);
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    let total = 0;
    for (const char of base) {
      total += Number(char) * factor;
      factor -= 1;
    }
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const firstDigit = calcDigit(cpf.slice(0, 9), 10);
  const secondDigit = calcDigit(cpf.slice(0, 10), 11);

  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
}

export function hashCpf(value: string) {
  const cpf = normalizeCpf(value);
  if (!isValidCpf(cpf)) {
    throw new Error('CPF invalido');
  }

  return crypto.createHash('sha256').update(cpf).digest('hex');
}

export function makeFreeLeadEmail(phone: string) {
  const normalized = normalizeBrazilianPhone(phone);
  return `lead+${normalized}@fielia.local`;
}

export function isFreeLeadEmail(email?: string | null) {
  return /^lead\+\d+@fielia\.local$/i.test(String(email || '').trim());
}
