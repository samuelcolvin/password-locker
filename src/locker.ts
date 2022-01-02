import {HttpError} from 'edgerender/response'

declare const STORAGE: KVNamespace

export interface Locker {
  public_key: string
  secret_key_hash: string
  title: string
  email: string
  created: string
  created_ms: number
  creator_ip: string
  creator_ua?: string
}

export async function create_locker(
  title: string,
  email: string,
  ip: string,
  ua: string | null,
): Promise<[Locker, string]> {
  const public_key = generate_public_key()

  const storage_key = `locker:${public_key}`
  if (await STORAGE.get(storage_key)) {
    // shouldn't happen
    throw new HttpError(409, 'Locker with this public key already exists')
  }
  const secret_key = await generate_secret_key()
  const created = new Date()
  const locker: Locker = {
    public_key,
    secret_key_hash: await sha256_hash(secret_key),
    title,
    email,
    created: created.toISOString(),
    created_ms: created.getTime(),
    creator_ip: ip,
    creator_ua: ua || undefined,
  }
  console.log('creating locker', locker)
  await STORAGE.put(storage_key, JSON.stringify(locker))
  return [locker, secret_key]
}

export async function get_locker(public_key: string): Promise<Locker> {
  const locker: Locker | null = await STORAGE.get(`locker:${public_key}`, 'json')
  if (locker) {
    return locker
  } else {
    throw new HttpError(404, 'Password Locker not found')
  }
}

export async function set_locker_password(
  public_key: string,
  secret_key: string,
  password: string,
  ttl: number,
): Promise<void> {
  const locker = await get_locker(public_key)
  if (!(await check_secret_key(locker, secret_key))) {
    throw new HttpError(403, 'Invalid secret key')
  }
  const set_ts = new Date()
  const expiration_ts = new Date(set_ts.getTime() + ttl * 1000)

  const iv = generate_iv()

  const encrypted_password = await encrypt(password, secret_key, iv)

  await STORAGE.put(`locker:${public_key}:password`, encrypted_password, {
    expiration: Math.round(expiration_ts.getTime() / 1000),
    metadata: {set: set_ts.toISOString(), ttl, expiration: expiration_ts.toISOString(), iv: ab2hex(iv.buffer)},
  })
}

export async function get_locker_password(public_key: string, secret_key: string): Promise<string | null> {
  const {value, metadata} = await STORAGE.getWithMetadata(`locker:${public_key}:password`, 'arrayBuffer')
  if (value) {
    const {iv} = metadata as any
    return await decrypt(value, secret_key, hex2array(iv))
  } else {
    return null
  }
}

export async function check_secret_key(locker: Locker, secret_key: string): Promise<boolean> {
  const secret_key_hash = await sha256_hash(secret_key)
  return locker.secret_key_hash == secret_key_hash
}

interface PasswordRequests {
  ts: string
  response: number
  ip: string
  ua?: string
}

interface LockerStatus {
  set?: string
  expiration?: string
  ttl?: number
  password_requests: PasswordRequests[]
}

export async function locker_status(public_key: string): Promise<LockerStatus> {
  const {keys: request_keys} = await STORAGE.list({prefix: `locker:${public_key}:request:`})
  const password_requests = request_keys.map(({metadata}) => metadata as PasswordRequests).reverse()
  const locker_status: LockerStatus = {password_requests}

  const {metadata} = await STORAGE.getWithMetadata(`locker:${public_key}:password`)
  if (metadata) {
    const {set, expiration, ttl} = metadata as Partial<LockerStatus>
    locker_status.set = set
    locker_status.expiration = expiration
    locker_status.ttl = ttl
  }

  return locker_status
}

export async function record_password_request(
  public_key: string,
  ip: string,
  ua: string | null,
  response: number,
): Promise<void> {
  const ts = new Date()
  const metadata: PasswordRequests = {
    ts: ts.toISOString(),
    response,
    ip: ip,
    ua: ua || undefined,
  }
  // we don't really care about the value here, we only use the metadata
  await STORAGE.put(`locker:${public_key}:request:${ts.getTime()}`, `${ip} -> ${response}`, {
    expirationTtl: 86400,
    metadata,
  })
}

const KEY_LENGTH = 32
const generate_public_key = (): string =>
  'pk_' + ab2hex(crypto.getRandomValues(new Uint8Array(Math.ceil(KEY_LENGTH / 2))).buffer)

async function sha256_hash(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return ab2hex(hashBuffer)
}

const crypto_alg = 'AES-GCM'
const crypto_usage: KeyUsage[] = ['encrypt', 'decrypt']

async function generate_secret_key(): Promise<string> {
  const key = await crypto.subtle.generateKey({name: crypto_alg, length: 256}, true, crypto_usage)
  const raw_key = await crypto.subtle.exportKey('raw', key)
  return `sk_v1${ab2hex(raw_key)}`
}

// IV should have length 96 (12 * 8) https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams
const generate_iv = (): Uint8Array => crypto.getRandomValues(new Uint8Array(12))

async function encrypt(message: string, secret_key: string, iv: Uint8Array): Promise<ArrayBuffer> {
  const crypto_key = await import_key(secret_key)

  const encoder = new TextEncoder()
  return await crypto.subtle.encrypt({name: crypto_alg, iv}, crypto_key, encoder.encode(message))
}

async function decrypt(message: ArrayBuffer, secret_key: string, iv: Uint8Array): Promise<string> {
  const crypto_key = await import_key(secret_key)

  const raw = await crypto.subtle.decrypt({name: crypto_alg, iv}, crypto_key, message)
  const decoder = new TextDecoder()
  return decoder.decode(raw)
}

async function import_key(secret_key: string): Promise<CryptoKey> {
  // key starts with "sk_v1", hence slice(5)
  const raw_key = secret_key.slice(5)
  return await crypto.subtle.importKey('raw', hex2array(raw_key), crypto_alg, true, crypto_usage)
}

const ab2hex = (ab: ArrayBuffer): string =>
  Array.from(new Uint8Array(ab))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

const hex2array = (hex: string): Uint8Array => {
  const bytes = []
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.slice(c, c + 2), 16))
  }
  return new Uint8Array(bytes)
}
