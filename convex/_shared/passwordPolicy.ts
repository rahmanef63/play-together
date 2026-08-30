export const PASSWORD_MIN_LENGTH = 12;

export function validateAccountPassword(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > 128) {
    throw new Error(`Password must be ${PASSWORD_MIN_LENGTH}–128 characters`);
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Password must include uppercase, lowercase, and a number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error("Password must include at least one symbol");
  }
}
