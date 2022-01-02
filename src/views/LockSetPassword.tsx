import {RequestContext} from 'edgerender/handle'
import {Redirect} from 'edgerender/response'
import {set_locker_password} from '../locker'

export default async function NewLocker({request, match, url}: RequestContext) {
  const {public_key} = match
  let errors: string | null = null
  if (request.method == 'POST') {
    errors = await post(request, public_key)
  }

  let action = '.'
  const secret_key = url.searchParams.get('secret_key')
  if (secret_key) {
    action += `?secret_key=${secret_key}`
  }
  return (
    <div>
      <form action={action} method="POST">
        <div>
          <input name="secret-key" placeholder="secret key" value={secret_key || ''} required />
        </div>
        <div>
          <input name="password" placeholder="password" type="password" required />
        </div>
        <div>
          <input name="ttl" placeholder="ttl" type="number" step="1" min="60" max="86400" required />
        </div>
        <div>Errors: {errors}</div>
        <div>
          <button type="submit">
            Submit
            <span className="htmx-indicator">...</span>
          </button>
        </div>
      </form>
    </div>
  )
}

async function post(request: Request, public_key: string): Promise<string> {
  const form = await request.formData()
  const secret_key = form.get('secret-key') as string
  const password = form.get('password') as string
  const ttl = parseInt(form.get('ttl') as string)
  if (!secret_key || !password || !ttl) {
    return 'Missing required fields "secret-key", "password" & "ttl"'
  }
  await set_locker_password(public_key, secret_key, password, ttl)
  throw new Redirect(`/locker/${public_key}/`, 302)
}
