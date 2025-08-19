import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { Hono} from 'hono'
import "dotenv/config";


import auth from './api/v1/auth/auth.js'




const app = new Hono()

app.use('/api/*', cors())


app.route('/api/v1', auth)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3002,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
