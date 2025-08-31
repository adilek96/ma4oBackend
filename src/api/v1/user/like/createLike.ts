import { Hono } from 'hono'
import { prisma } from '../../../../lib/prisma.js'

const createLike = new Hono()

createLike.post('/user/like/create', async (c) => {
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

  const isSkip = await prisma.skip.findFirst({
    where: {
      senderId: userDb.id,
      receiverId: data.receiverId,
    },
  })

  if (isSkip) {
    await prisma.skip.delete({
      where: {
        id: isSkip.id,
      },
    })
  }

  try {
    // создаем лайк
    await prisma.like.create({
      data: {
        senderId: userDb.id,
        receiverId: data.receiverId,
      },
    })
    // провереяем добавлен ли пользователь матч другому пользователю
    const isMatch = await prisma.match.findFirst({
      where: {
        userAId: data.receiverId,
        userBId: userDb.id,
      },
    })

    if (isMatch) {
      //  если есть то есть взаимность матча
      await prisma.match.update({
        where: {
          id: isMatch.id,
        },
        data: {
          isMutual: true,
        },
      })
    } else {
      // если нет то создаем матч
      await prisma.match.create({
        data: {
          userAId: userDb.id,
          userBId: data.receiverId,
        },
      })
    }
  } catch (error) {
    console.error('Error creating like:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }

  return c.json({
    message: 'success',
  })
})

export default createLike
