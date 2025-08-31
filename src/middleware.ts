import { getCookie } from 'hono/cookie'
import jwtLib from 'jsonwebtoken'

const authMiddleware = async (c: any, next: any) => {
  // получаем токен из куки
  const accessToken = getCookie(c, 'access_token')

  if (!accessToken) {
    console.log('Auth middleware: No access token found')
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // проверяем наличие JWT секрета
  if (!process.env.JWT_SECRET) {
    console.error('Auth middleware: JWT_SECRET is not set')
    return c.json({ error: 'Server configuration error' }, 500)
  }

  try {
    // проверяем JWT
    const decoded = jwtLib.verify(accessToken, process.env.JWT_SECRET) as { userId: string }

    console.log('Auth middleware: Token verified for user:', decoded.userId)

    // сохраняем payload в контексте, чтобы роуты могли его использовать
    ;(c as any).set('user', decoded)

    // идём дальше
    await next()
  } catch (err) {
    console.error('Auth middleware: Token verification failed:', err)
    return c.json({ error: 'Unauthorized' }, 401)
  }
}

export default authMiddleware
