import { Hono } from 'hono'
import { prisma } from '../../../../lib/prisma.js'
import { minioClient } from '../../../../lib/minio.js'

const deletePhoto = new Hono()

deletePhoto.delete('/user/photo/delete/:id', async (c) => {
  const { id } = c.req.param()

  const photo = await prisma.photo.findUnique({
    where: { id: id },
  })

  if (!photo) {
    return c.json({ error: 'Photo not found' }, 404)
  }
  try {
    // удаляем из БД
    await prisma.photo.delete({
      where: { id },
    })

    // удаляем из MinIO
    await minioClient.removeObject('ma4o', photo.filename)
  } catch (error) {
    console.error('Error deleting photo:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }

  return c.json({ message: 'success' })
})

export default deletePhoto
