import { Hono } from "hono"
import { prisma } from "../../../../lib/prisma.js"
import { minioClient } from "../../../../lib/minio.js"
import { randomUUID } from "crypto"

const uploadPhoto = new Hono()

uploadPhoto.post("/user/photo/upload", async (c) => {
  try {
    const user = (c as any).get("user")
    if (!user) return c.json({ error: "Unauthorized" }, 401)

    const dbUser = await prisma.user.findUnique({
      where: { telegramId: user.userId },
    })
    if (!dbUser) return c.json({ error: "User not found" }, 404)

    const profile = await prisma.profile.findUnique({
      where: { userId: dbUser.id },
    })
    if (!profile) return c.json({ error: "Profile not found" }, 400)

    const body = await c.req.parseBody()
    
    // Собираем все файлы из body
    const uploadedFiles: any[] = []
    
    // Проверяем разные возможные ключи
    Object.keys(body).forEach(key => {
      const value = body[key]
      
      if (key === 'files' || key.startsWith('files[') || key.startsWith('file')) {
        if (Array.isArray(value)) {
          uploadedFiles.push(...value)
        } else {
          uploadedFiles.push(value)
        }
      }
    })

    if (!uploadedFiles.length) return c.json({ error: "No files uploaded" }, 400)

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    const maxSize = 5 * 1024 * 1024 // 5MB


   
 
    // Параллельная обработка файлов
    const createdPhotos = await Promise.all(
      uploadedFiles.map(async (file) => {
        if (!(file instanceof File)) return null
        if (!allowedTypes.includes(file.type)) return null
        if (file.size > maxSize) return null
  
        const fileExtension = file.name.split(".").pop()
        const fileName = `${dbUser.id}/${randomUUID()}.${fileExtension}`
        const arrayBuffer = await file.arrayBuffer()
        const fileBuffer = Buffer.from(arrayBuffer)

      
        // Загружаем в MinIO
        await minioClient.putObject("ma4o", fileName, fileBuffer, file.size, {
          "Content-Type": file.type,
        })

        // Сохраняем в БД 
        // в качестве урл передаем только имя бакета и файла так как на фронте идет проксирование на адресс сервера минио
        const photoRecord = await prisma.photo.create({
          data: {
            userId: dbUser.id,
            filename: fileName,
            url: `ma4o/${fileName}`,
          },
        })
      
        return photoRecord
      })
    )

    const successfulPhotos = createdPhotos.filter(photo => photo !== null)

    return c.json({ 
      message: "success", 
      photos: successfulPhotos,
      count: successfulPhotos.length
    })
  } catch (err) {
    console.error("Error uploading photo:", err)
    return c.json({ error: "Internal server error" }, 500)
  }
})

export default uploadPhoto

