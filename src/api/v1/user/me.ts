import { Hono } from 'hono'
import { prisma } from '../../../lib/prisma.js'
import { serializeBigInt } from '../../../lib/utils.js'

const me = new Hono()

me.get('/user/me', async (c) => {
  try {
    // получаем данные пользователя из контекста (установленные middleware)
    const user = (c as any).get('user') as { userId: string }

    if (!user || !user.userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // проверяем наличие JWT секрета
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set')
      return c.json({ error: 'Server configuration error' }, 500)
    }

    // тут делаем запрос в БД по userId
    const userData = await prisma.user.findUnique({
      where: {
        telegramId: BigInt(user.userId),
      },
      include: {
        profile: true,
        preferences: true,
        photos: true,
      },
    })

    // проверяем найден ли пользователь в БД
    if (!userData) {
      console.error('User not found in database:', user.userId)
      return c.json({ error: 'User not found' }, 404)
    }

    // Преобразуем BigInt в строки перед отправкой
    const serializedData = serializeBigInt(userData)

    return c.json({
      data: serializedData,
    })
  } catch (error) {
    console.error('Me route error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default me
