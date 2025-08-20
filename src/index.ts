import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { Hono} from 'hono'
import "dotenv/config";

// импорт апи роутов 
import auth from './api/v1/auth/auth.js'
import refresh from './api/v1/auth/refresh.js'
import createProfile from './api/v1/user/profile/createProfile.js'
import authMiddleware from './middleware.js';




const app = new Hono()

// cors
app.use('/api/*', cors())

// middleware
app.use('/api/v1/user/*', authMiddleware)

// подключение роутов
app.route('/api/v1', auth)
app.route('/api/v1', refresh)
app.route('/api/v1', createProfile)

serve({
  fetch: app.fetch,
  port: 3002,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
