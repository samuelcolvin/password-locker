import {RequestContext} from 'edgerender/handle'
import {Redirect} from 'edgerender/response'
import {create_locker} from '../locker'

export default async function CreateLocker({request}: RequestContext) {
  let errors: string | null = null
  let form_data: Record<string, string> = {}
  if (request.method == 'POST') {
    const form = await request.formData()
    form_data = Object.fromEntries(form.entries()) as Record<string, string>
    errors = await post(request, form_data)
  }

  return (
    <div>
      <form action="." method="POST">
        <div>
          <input name="title" placeholder="locker title" value={form_data.title || ''} required />
        </div>
        <div>
          <input type="email" name="email" placeholder="email" value={form_data.email || ''} required />
        </div>
        {errors ? <div>Form Errors: {errors}</div> : null}
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

async function post(request: Request, form_data: Record<string, string>): Promise<string> {
  const {title, email} = form_data
  if (!title || !email) {
    return '"title" and "email" fields are required'
  }

  const [public_key, secret_key] = await create_locker(
    title,
    email,
    request.headers.get('cf-connecting-ip') as string,
    request.headers.get('user-agent'),
  )
  throw new Redirect(`/locker/${public_key}/?secret_key=${secret_key}`, 302)
}
