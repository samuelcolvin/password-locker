import {EdgeRender, AssetConfig, Views} from 'edgerender'
import {json_response} from 'edgerender/response'
import {Page} from './page'
import Index from './views/Index'
import favicon_path from './icons/favicon.ico'

declare const __STATIC_CONTENT_MANIFEST: string
declare const __STATIC_CONTENT: KVNamespace

const assets: AssetConfig = {
  content_manifest: __STATIC_CONTENT_MANIFEST,
  kv_namespace: __STATIC_CONTENT,
}

const views: Views = {
  '/': () => Index(),
  '/favicon.ico': {
    view: ({assets, request}) => assets.response(request, favicon_path),
  },
  '/path/{id:int}/': ({match}) => {
    console.log('match:', match)
    return json_response({match})
  },
  '/fonts/{file_name:.+}': ({request, url, assets}) => {
    return assets.cached_proxy(request, `https://smokeshow.helpmanual.io${url.pathname}`)
  },
}
const edge_render = new EdgeRender({views, assets, log: true, page: Page})

addEventListener('fetch', edge_render.handler)
