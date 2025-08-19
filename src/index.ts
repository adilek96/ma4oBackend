import { serve } from '@hono/node-server'
import { Hono} from 'hono'
import "dotenv/config";

import auth from './api/v1/auth/auth.js'
const port = process.env.PORT || 3000



const app = new Hono()



app.route('/api/v1', auth)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: Number(port)
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
