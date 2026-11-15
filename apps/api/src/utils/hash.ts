import bcrypt from "bcryptjs";

export async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

export async function compare(plain: string, hashValue: string) {
  return bcrypt.compare(plain, hashValue);
}
