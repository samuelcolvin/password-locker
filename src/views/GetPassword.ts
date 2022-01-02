import {RequestContext} from 'edgerender/handle'
import {get_locker, record_password_request, Locker, get_locker_password, check_secret_key} from '../locker'
import {HttpError, json_response} from 'edgerender/response'

export default async function NewLocker({match, request}: RequestContext) {
  const {public_key} = match
  const ip = request.headers.get('cf-connecting-ip') as string
  const ua = request.headers.get('user-agent')

  let locker: Locker
  try {
    locker = await get_locker(public_key)
  } catch (e) {
    if (e instanceof HttpError) {
      await record_password_request(public_key, ip, ua, e.status)
      return json_response({message: e.body}, e.status)
    }
    throw e
  }

  const auth = request.headers.get('authorization')
  if (!auth) {
    await record_password_request(public_key, ip, ua, 401)
    return json_response({message: 'Authorisation Header missing'}, 401)
  }
  const secret_key = auth.replace(/^bearer /i, '')
  if (!(await check_secret_key(locker, secret_key))) {
    await record_password_request(public_key, ip, ua, 403)
    return json_response({message: 'Incorrect secret key (from Authorisation Header)'}, 403)
  }

  const password = await get_locker_password(public_key, secret_key)
  if (password) {
    await record_password_request(public_key, ip, ua, 200)
    return json_response({password})
  } else {
    await record_password_request(public_key, ip, ua, 410)
    return json_response({message: 'Password not currently available'}, 410)
  }
}
