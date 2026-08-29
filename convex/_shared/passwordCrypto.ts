const ITERATIONS = 100_000;
const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string): Uint8Array {
  if (value.length % 2 !== 0 || !/^[a-f0-9]+$/i.test(value))
    throw new Error("Invalid hash encoding");
  return new Uint8Array(value.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    material,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashSecret(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `pbkdf2-sha256$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifySecret(password: string, encoded: string): Promise<boolean> {
  const [algorithm, iterations, saltHex, expectedHex] = encoded.split("$");
  if (
    algorithm !== "pbkdf2-sha256" ||
    Number(iterations) !== ITERATIONS ||
    !saltHex ||
    !expectedHex
  )
    return false;
  const actual = await derive(password, fromHex(saltHex));
  const expected = fromHex(expectedHex);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1)
    difference |= (actual[index] ?? 0) ^ (expected[index] ?? 0);
  return difference === 0;
}
