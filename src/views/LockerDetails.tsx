import {RequestContext} from 'edgerender/handle'
import {get_locker} from '../locker'

export default async function NewLocker({match, url}: RequestContext) {
  const {public_key} = match
  const locker = await get_locker(public_key)

  const secret_key = url.searchParams.get('secret_key')
  const sk_mismatch = !!(secret_key && locker.secret_key !== secret_key)
  return (
    <div>
      <pre>{JSON.stringify(locker, null, 2)}</pre>
      {sk_mismatch ? <>The secret key in the URL doesn't match this locker!</> : null}
    </div>
  )
}
