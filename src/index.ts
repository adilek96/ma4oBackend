import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { Hono } from 'hono'
import 'dotenv/config'

// импорт апи роутов
import auth from './api/v1/auth/auth.js'
import refresh from './api/v1/auth/refresh.js'
import createProfile from './api/v1/user/profile/createProfile.js'
import authMiddleware from './middleware.js'
import me from './api/v1/user/me.js'
import createPreferences from './api/v1/user/preferences/createPreferences.js'
import uploadPhoto from './api/v1/user/photo/uploadPhoto.js'
import deletePhoto from './api/v1/user/photo/deletePhoto.js'
import updatePhoto from './api/v1/user/photo/updatePhoto.js'
import updateProfile from './api/v1/user/profile/updateProfile.js'
import updatePreferences from './api/v1/user/preferences/updatePreferences.js'
import search from './api/v1/search/search.js'
import createLike from './api/v1/user/like/createLike.js'
import createSkip from './api/v1/user/skip/createSkip.js'
import getMatches from './api/v1/user/match/getMatches.js'

const application = process.env.APPLICATION || process.env.NODE_ENV || 'development'
console.log('Application environment:', application)

const app = new Hono()

// cors
app.use(
  '/api/v1/*',
  cors({
    origin:
      application === 'production'
        ? ['https://www.ma4o.com', 'https://ma4o.vercel.app']
        : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86400,
  })
)

// middleware
app.use('/api/v1/user/*', authMiddleware)
app.use('/api/v1/search/*', authMiddleware)

// подключение роутов
app.route('/api/v1', auth)
app.route('/api/v1', refresh)
app.route('/api/v1', createProfile)
app.route('/api/v1', createPreferences)
app.route('/api/v1', uploadPhoto)
app.route('/api/v1', deletePhoto)
app.route('/api/v1', updatePhoto)
app.route('/api/v1', updateProfile)
app.route('/api/v1', updatePreferences)
app.route('/api/v1', search)
app.route('/api/v1', createLike)
app.route('/api/v1', createSkip)
app.route('/api/v1', getMatches)
app.route('/api/v1', me)

serve(
  {
    fetch: app.fetch,
    port: 3002,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  }
)
