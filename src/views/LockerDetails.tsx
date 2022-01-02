import {RequestContext} from 'edgerender/handle'
import {get_locker, locker_status} from '../locker'

export default async function NewLocker({match, url}: RequestContext) {
  const {public_key} = match
  const locker = await get_locker(public_key)

  const secret_key = url.searchParams.get('secret_key')
  const sk_mismatch = !!(secret_key && locker.secret_key !== secret_key)
  const details = await locker_status(public_key)
  return (
    <div>
      <pre>{JSON.stringify(locker, null, 2)}</pre>
      <pre>{JSON.stringify({details}, null, 2)}</pre>
      {sk_mismatch ? <>The secret key in the URL doesn't match this locker!</> : null}
      <a href={secret_key ? `./set/?secret_key=${secret_key}` : `./set/`}>Set Password</a>
    </div>
  )
}
