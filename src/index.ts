import {EdgeRender, AssetConfig, Views} from 'edgerender'
import {Page} from './page'
import Index from './views/Index'
import NewLockerGet from './views/NewLockerGet'
import NewLockerPost from './views/NewLockerPost'
import LockerDetails from './views/LockerDetails'
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
  '/new-locker/': NewLockerGet,
  '/new-locker/submit/': {
    view: NewLockerPost,
    allow: 'POST',
  },
  '/locker/{public_key}/': LockerDetails,
  '/fonts/{file_name:.+}': ({request, url, assets}) => {
    return assets.cached_proxy(request, `https://smokeshow.helpmanual.io${url.pathname}`)
  },
}
const edge_render = new EdgeRender({views, assets, log: true, page: Page})

addEventListener('fetch', edge_render.handler)
