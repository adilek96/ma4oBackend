import { Hono } from "hono";
import { prisma } from "../../../../lib/prisma.js";
import { minioClient } from "../../../../lib/minio.js";
import { randomUUID } from "crypto";

const uploadPhoto = new Hono()

// Интерфейс для файла, который приходит от Hono
interface UploadedFile {
    name: string;
    type: string;
    size: number;
    buffer: Buffer;
}

// Endpoint для загрузки фотографии
uploadPhoto.post('/user/photo/upload', async (c) => {
    try {
        // Получаем пользователя из middleware
        const user = (c as any).get('user')
        if (!user) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        // Парсим тело запроса
        const body = await c.req.parseBody()
        const uploadedFile = body['file'] as unknown as UploadedFile

        // Валидация файла
        if (!uploadedFile || !uploadedFile.buffer) {
            return c.json({ error: 'No file uploaded' }, 400)
        }

        // Проверяем тип файла (только изображения)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(uploadedFile.type)) {
            return c.json({ error: 'Invalid file type. Only images are allowed' }, 400)
        }

        // Проверяем размер файла (максимум 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (uploadedFile.size > maxSize) {
            return c.json({ error: 'File too large. Maximum size is 5MB' }, 400)
        }

        // Получаем профиль пользователя
        const profile = await prisma.profile.findUnique({
            where: { userId: user.id }
        })

        if (!profile) {
            return c.json({ error: 'Profile not found. Please create profile first' }, 400)
        }

        // Генерируем уникальное имя файла
        const fileExtension = uploadedFile.name.split('.').pop()
        const fileName = `${user.id}/${randomUUID()}.${fileExtension}`

        // Название bucket для фотографий
        const bucketName = "photos"

        // Проверяем существование bucket и создаем если нужно
        const bucketExists = await minioClient.bucketExists(bucketName)
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName)
            
            // Делаем bucket публичным для чтения
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${bucketName}/*`]
                    }
                ]
            }
            
            await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy))
            console.log(`Bucket '${bucketName}' created and made public`)
        }

        // Загружаем файл в MinIO
        const result = await minioClient.putObject(
            bucketName, 
            fileName, 
            uploadedFile.buffer,
            uploadedFile.size,
            { 'Content-Type': uploadedFile.type }
        )

        console.log('File uploaded to MinIO:', result)

        // Создаем постоянную ссылку на файл
        const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'
        const endpoint = process.env.MINIO_ENDPOINT || 'localhost'
        const port = process.env.MINIO_PORT || 9000
        const permanentUrl = `${protocol}://${endpoint}:${port}/${bucketName}/${fileName}`

        // Сохраняем информацию о файле в базе данных
        const photoRecord = await prisma.photo.create({
            data: {
                profileId: profile.id,
                filename: fileName,
                url: permanentUrl
            }
        })

        console.log('Photo record created in database:', photoRecord)

        return c.json({ 
            message: 'Photo uploaded successfully',
            photoId: photoRecord.id,
            fileName: fileName,
            url: permanentUrl
        }, 200)

    } catch (err) {
        console.error('Error uploading photo:', err)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

// Endpoint для получения списка фотографий пользователя
uploadPhoto.get('/user/photos', async (c) => {
    try {
        const user = (c as any).get('user')
        if (!user) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        const profile = await prisma.profile.findUnique({
            where: { userId: user.id },
            include: {
                photos: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!profile) {
            return c.json({ error: 'Profile not found' }, 404)
        }

        return c.json({
            photos: profile.photos,
            count: profile.photos.length
        }, 200)

    } catch (err) {
        console.error('Error getting photos:', err)
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default uploadPhoto