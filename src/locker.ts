import {HttpError} from 'edgerender/response'

const KEY_LENGTH = 32
declare const STORAGE: KVNamespace

interface Locker {
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
  user_agent: string | null,
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
    creator_ua: user_agent || undefined,
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
    throw new HttpError(404, 'Locker not found')
  }
}

function create_random_string(length: number): string {
  const raw = new Uint8Array(Math.ceil(length / 2))
  crypto.getRandomValues(raw)
  return Array.from(raw)
    .map(v => ('0' + v.toString(36)).slice(-2))
    .join('')
    .slice(0, length)
}
