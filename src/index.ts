import {EdgeRender, AssetConfig, Views} from 'edgerender'
import {Page} from './page'
import Index from './views/Index'
import CreateLocker from './views/CreateLocker'
import LockerDetails from './views/LockerDetails'
import LockSetPassword from './views/LockSetPassword'
import GetPassword from './views/GetPassword'
import favicon_path from './assets/favicon.ico'

declare const __STATIC_CONTENT_MANIFEST: any
declare const __STATIC_CONTENT: KVNamespace

const assets: AssetConfig = {
  content_manifest: typeof __STATIC_CONTENT_MANIFEST == 'string' ? __STATIC_CONTENT_MANIFEST : undefined,
  kv_namespace: __STATIC_CONTENT,
}

const views: Views = {
  '/': Index,
  '/favicon.ico': ({assets, request}) => assets.response(request, favicon_path),
  '/locker/create/': {
    view: CreateLocker,
    allow: ['GET', 'POST'],
  },
  '/locker/{public_key}/': LockerDetails,
  '/locker/{public_key}/set/': {
    view: LockSetPassword,
    allow: ['GET', 'POST'],
  },
  '/get/{public_key}/': GetPassword,
  '/fonts/{file_name:.+}': async ({request, url}) => {
    const new_request = new Request(url.pathname)
    const new_url = `https://smokeshow.helpmanual.io${url.pathname}`

    new_request.headers.append('referer', 'https://smokeshow.helpmanual.io/')
    new_request.headers.append('origin', 'https://smokeshow.helpmanual.io')
    new_request.headers.append('user-agent', request.headers.get('user-agent') || '?')
    // return await assets.cached_proxy(new_request, new_url)
    return await fetch(new_url, new_request)
  },
}

const edge_render = new EdgeRender({views, assets, page: Page})

addEventListener('fetch', edge_render.handler)
