import { Hono } from "hono"
import { prisma } from "../../../../lib/prisma.js"
import { minioClient } from "../../../../lib/minio.js"
import { randomUUID } from "crypto"

const uploadPhoto = new Hono()

uploadPhoto.post("/user/photo/upload", async (c) => {
  console.log("Начинается загрузка фотографий")
  const storageUrl = process.env.BLOB_STORAGE_URL
  try {
    const user = (c as any).get("user")
    if (!user) return c.json({ error: "Unauthorized" }, 401)

    console.log("Пользователь получен")

    const dbUser = await prisma.user.findUnique({
      where: { telegramId: user.userId },
    })
    if (!dbUser) return c.json({ error: "User not found" }, 404)

    console.log("Пользователь найден")

    const profile = await prisma.profile.findUnique({
      where: { userId: dbUser.id },
    })
    if (!profile) return c.json({ error: "Profile not found" }, 400)

    console.log("Профиль получен")

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

    console.log("Файлы получены")


    // Параллельная обработка файлов
    const createdPhotos = await Promise.all(
      uploadedFiles.map(async (file) => {
        if (!file || !file.type || !file.arrayBuffer) return null
        if (!file.type || !allowedTypes.includes(file.type)) {
          console.warn("Unsupported file type:", file.type, file.name)
          return null
        }
        if (file.size > maxSize) {
          throw new Error("File too large")
        }

        const fileExtension = file.name.split(".").pop()
        const fileName = `${dbUser.id}/${randomUUID()}.${fileExtension}`
        const arrayBuffer = await file.arrayBuffer()
        const fileBuffer = Buffer.from(arrayBuffer)

        console.log("Файлы проверены начинается загрузка в minio")
        try {
          // Загружаем в MinIO
        await minioClient.putObject("ma4o", fileName, fileBuffer, file.size, {
          "Content-Type": file.type,
        })
        } catch (error) {
          console.error("Ошибка при загрузке в minio:", error)
          return null
        }
        console.log("Файлы загружены в minio добавляем в бд")

        console.log("user.id", dbUser.id)
        console.log("fileName", fileName)
        console.log("url", `${storageUrl}/ma4o/${fileName}`)

        // Сохраняем в БД 
        // в качестве урл передаем только имя бакета и файла так как на фронте идет проксирование на адресс сервера минио
        const photoRecord = await prisma.photo.create({
          data: {
            userId: dbUser.id,
            filename: fileName,
            url: `${storageUrl}/ma4o/${fileName}`,
          },
        })
        console.log("Файлы добавлены в бд", photoRecord)

        return photoRecord
      })
    )

    console.log("загрузка фотографий завершена", createdPhotos)
    const successfulPhotos = createdPhotos.filter(photo => photo !== null)

    console.log("успешные фотографии", successfulPhotos)

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

