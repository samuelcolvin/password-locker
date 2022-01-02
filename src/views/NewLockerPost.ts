import {RequestContext} from 'edgerender/handle'
import {HttpError} from 'edgerender/response'
import {create_locker} from '../locker'

export default async function NewLockerPost({request, url}: RequestContext): Promise<Response> {
  const arrayBuffer = await request.arrayBuffer()
  console.log('request:', {arrayBuffer})
  const form = await request.formData()
  const title = form.get('title')
  const email = form.get('email')
  if (!title || !email) {
    throw new HttpError(422, 'Missing required fields "title" and "email"')
  }

  const {public_key, secret_key} = await create_locker(
    title as string,
    email as string,
    request.headers.get('cf-connecting-ip') as string,
    request.headers.get('user-agent'),
  )

  return Response.redirect(`${url.origin}/locker/${public_key}/?secret_key=${secret_key}`, 302)
}
