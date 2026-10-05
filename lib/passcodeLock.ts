// 本机锁屏：跟登录用的是同一个 6 位密码，登录成功时在这台手机上存一份加盐 PBKDF2 哈希。
// 离开 App 超过 1 分钟再回来时用它快速解锁（不用联网）；真正的权限由服务器上的密码登录控制。

const CODE_KEY = "fp-passcode";
const UNLOCK_KEY = "fp-lock-unlocked-at";
const FAIL_KEY = "fp-passcode-fails";
export const PASSCODE_LENGTH = 6;
export const RELOCK_AFTER_MS = 60_000;
const MAX_FAILS = 5;
const COOLDOWN_MS = 30_000;

type Stored = { salt: string; hash: string };

function safeGet(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: () => Storage, key: string, value: string | null) {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // 隐私模式等情况下存储不可用，忽略
  }
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 150_000 }, key, 256);
  return toHex(bits);
}

function readStored(): Stored | null {
  const raw = safeGet(() => localStorage, CODE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

export function lockEnabled(): boolean {
  return readStored() !== null;
}

export function recentlyUnlocked(): boolean {
  const at = Number(safeGet(() => sessionStorage, UNLOCK_KEY) ?? 0);
  return at > 0 && Date.now() - at < RELOCK_AFTER_MS;
}

export function markUnlocked() {
  safeSet(() => sessionStorage, UNLOCK_KEY, String(Date.now()));
}

export async function setPasscode(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt);
  safeSet(() => localStorage, CODE_KEY, JSON.stringify({ salt: toHex(salt), hash } satisfies Stored));
  safeSet(() => localStorage, FAIL_KEY, null);
  markUnlocked();
}

export function clearPasscode() {
  safeSet(() => localStorage, CODE_KEY, null);
  safeSet(() => localStorage, FAIL_KEY, null);
  safeSet(() => sessionStorage, UNLOCK_KEY, null);
}

/** 连续输错 5 次后要等 30 秒。返回还要等几秒（0 = 可以输入）。 */
export function cooldownSeconds(): number {
  const raw = safeGet(() => localStorage, FAIL_KEY);
  if (!raw) return 0;
  const { count, at } = JSON.parse(raw) as { count: number; at: number };
  if (count < MAX_FAILS) return 0;
  const left = COOLDOWN_MS - (Date.now() - at);
  if (left <= 0) {
    safeSet(() => localStorage, FAIL_KEY, null);
    return 0;
  }
  return Math.ceil(left / 1000);
}

export async function checkPasscode(pin: string): Promise<boolean> {
  const stored = readStored();
  if (!stored) return true;
  const ok = (await derive(pin, fromHex(stored.salt))) === stored.hash;
  if (ok) {
    safeSet(() => localStorage, FAIL_KEY, null);
    markUnlocked();
  } else {
    const raw = safeGet(() => localStorage, FAIL_KEY);
    const count = raw ? (JSON.parse(raw) as { count: number }).count + 1 : 1;
    safeSet(() => localStorage, FAIL_KEY, JSON.stringify({ count, at: Date.now() }));
  }
  return ok;
}
