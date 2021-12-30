import {makeEdgeEnv, EdgeRequest} from 'edge-mock'
import {handleRequest} from '../src/handler'

describe('handle', () => {
  beforeEach(() => {
    makeEdgeEnv()
    jest.resetModules()
  })

  test('handle GET', async () => {
    const request = new EdgeRequest('/')
    const result = await handleRequest(request as unknown as Request)
    expect(result.status).toEqual(200)
    const text = await result.text()
    expect(text).toEqual('request method: GET')
  })
})
