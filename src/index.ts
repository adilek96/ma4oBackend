import { serve } from '@hono/node-server'
import { Hono} from 'hono'

import auth from './api/v1/auth/auth.js'
import { prettyJSON } from 'hono/pretty-json'


const app = new Hono()

// app.use(prettyJSON())

app.route('/api/v1', auth)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
