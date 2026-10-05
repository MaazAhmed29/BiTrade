const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function normalizeUsername(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function validateEmail(email: string): string | null {
  if (!email) return "Email is required.";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return "Enter a valid email address.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 128) return "Password must be 128 characters or fewer.";
  return null;
}

export function validateUsername(username: string): string | null {
  if (!username) return "Username is required.";
  if (username.length < 3 || username.length > 24) {
    return "Username must be between 3 and 24 characters.";
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Username may only contain lowercase letters, numbers, and underscores.";
  }
  return null;
}

export function validateLogin(input: { email: string; password: string }): string | null {
  return validateEmail(input.email) ?? (input.password ? null : "Password is required.");
}

export function validateSignup(input: {
  username: string;
  email: string;
  password: string;
}): string | null {
  return (
    validateUsername(input.username) ??
    validateEmail(input.email) ??
    validatePassword(input.password)
  );
}

export function safeNextPath(value: unknown): string {
  const raw = String(value ?? "");
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("..")) {
    return raw;
  }
  return "/dashboard";
}
