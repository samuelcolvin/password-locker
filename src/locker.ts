import {HttpError} from 'edgerender/response'

const KEY_LENGTH = 32
declare const STORAGE: KVNamespace

export interface Locker {
  public_key: string
  secret_key: string
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
): Promise<Locker> {
  const public_key = 'pk_' + create_random_string(KEY_LENGTH)

  const storage_key = `locker:${public_key}`
  if (await STORAGE.get(storage_key)) {
    // shouldn't happen
    throw new HttpError(409, 'Locker with this public key already exists')
  }
  const secret_key = 'sk_' + create_random_string(KEY_LENGTH)
  const created = new Date()
  const locker: Locker = {
    public_key,
    secret_key,
    title,
    email,
    created: created.toISOString(),
    created_ms: created.getTime(),
    creator_ip: ip,
    creator_ua: ua || undefined,
  }
  console.log('creating locker', locker)
  await STORAGE.put(storage_key, JSON.stringify(locker))
  return locker
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
  if (locker.secret_key !== secret_key) {
    throw new HttpError(403, 'Invalid secret key')
  }
  const set_ts = new Date()
  const expiration_ts = new Date(set_ts.getTime() + ttl * 1000)
  await STORAGE.put(`locker:${public_key}:password`, password, {
    expiration: Math.round(expiration_ts.getTime() / 1000),
    metadata: {set: set_ts.toISOString(), ttl, expiration: expiration_ts.toISOString()},
  })
}

export async function get_locker_password(public_key: string): Promise<string | null> {
  return await STORAGE.get(`locker:${public_key}:password`)
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

export async function record_password_request(public_key: string, ip: string, ua: string | null, response: number): Promise<void> {
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

function create_random_string(length: number): string {
  const raw = new Uint8Array(Math.ceil(length / 2))
  crypto.getRandomValues(raw)
  return Array.from(raw)
    .map(v => ('0' + v.toString(36)).slice(-2))
    .join('')
    .slice(0, length)
}
