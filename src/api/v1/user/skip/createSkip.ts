import { Hono } from 'hono'
import { prisma } from '../../../../lib/prisma.js'

const createSkip = new Hono()

createSkip.post('/user/skip/create', async (c) => {
  const user = (c as any).get('user')
  const data = await c.req.json()

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const userDb = await prisma.user.findUnique({
    where: {
      telegramId: BigInt(user.userId),
    },
  })

  if (!userDb) {
    return c.json({ error: 'User not found' }, 404)
  }
  // сначала нужно проверить был ли до этого поставлен лайк пользователю , если был то удалить лайк  а также удалить мач

  const isLike = await prisma.like.findFirst({
    where: {
      senderId: userDb.id,
      receiverId: data.receiverId,
    },
  })

  if (isLike) {
    try {
      await prisma.like.delete({
        where: {
          id: isLike.id,
        },
      })

      const isMatch = await prisma.match.findFirst({
        where: {
          userAId: data.receiverId,
          userBId: userDb.id,
        },
      })

      if (isMatch) {
        await prisma.match.delete({
          where: {
            id: isMatch.id,
          },
        })
      }
    } catch (error) {
      console.error('Error deleting like:', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }

  // потом создать пропуск

  try {
    await prisma.skip.create({
      data: {
        senderId: userDb.id,
        receiverId: data.receiverId,
      },
    })
  } catch (error) {
    console.error('Error creating skip:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }

  return c.json({
    message: 'success',
  })
})

export default createSkip
