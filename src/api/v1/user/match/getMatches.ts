import { Hono } from "hono";
import { prisma } from "../../../../lib/prisma.js";

const getMatches = new Hono()

getMatches.get('/user/matches', async (c) => {
  const user = (c as any).get('user')

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }


  const userDb = await prisma.user.findUnique({
    where: {
      telegramId: user.userId,
    },
  })

  if (!userDb) {
    return c.json({ error: 'User not found' }, 404)
  }

  try {
    // получаем матчи отправленные пользователем
    const senderMatches = await prisma.match.findMany({
      where: {
        userAId: userDb.id,
      },
    })

    // получаем матчи отправленные пользователю
    const receiverMatches = await prisma.match.findMany({
      where: {
        userBId: userDb.id,
      },
    })

    return c.json({ matches: [...senderMatches, ...receiverMatches] })
  } catch (error) {
    console.error('Error getting matches:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
  
})

export default getMatches