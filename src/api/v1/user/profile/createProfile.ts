import { Hono } from "hono";
import { prisma } from "../../../../lib/prisma.js";


const createProfile = new Hono()

createProfile.post('/user/profile/create', async (c) => {
    const user = (c as any).get('user')
    const data = await c.req.json()



    if(!user){
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        // Находим пользователя в БД по Telegram ID
        const dbUser = await prisma.user.findUnique({
            where: {
                telegramId: user.userId
            }
        })

        if (!dbUser) {
            return c.json({ error: 'User not found' }, 404)
        }

        // используем upsert для создания или обновления профиля
        const profile = await prisma.profile.upsert({
            where: {
                userId: dbUser.id
            },
            update: {
                gender: data.gender.toUpperCase(),
                birthDate: new Date(data.birthDate),
                age: Math.abs(new Date().getFullYear() - new Date(data.birthDate).getFullYear()),
                country: data.country,
                city: data.city,
                latitude: data.location?.latitude,
                longitude: data.location?.longitude,
                bio: data.bio,
                height: data.height,
                languages: data.languages,
                interests: data.interests,
                drinking: data.drinking?.toUpperCase(),
                smoking: data.smoking?.toUpperCase(),
                education: data.education,
                occupation: data.occupation,
            },
            create: {
                userId: dbUser.id,
                gender: data.gender.toUpperCase(),
                birthDate: new Date(data.birthDate),
                age: Math.abs(new Date().getFullYear() - new Date(data.birthDate).getFullYear()),
                country: data.country,
                city: data.city,
                latitude: data.latitude,
                longitude: data.longitude,
                bio: data.bio,
                height: data.height,
                languages: data.languages,
                interests: data.interests,
                drinking: data.drinking?.toUpperCase(),
                smoking: data.smoking?.toUpperCase(),
                education: data.education,
                occupation: data.occupation,
            },
        })

        if(!profile){
            return c.json({ error: 'Profile not created' }, 400)
        } 

        await prisma.user.update({
           where: {
            id: dbUser.id
           },
           data: {
            firstName: data.firstName,
            lastName: data.lastName,
            isNew: false
           }
        })

    return c.json({
        message: 'success'
    })

    } catch (error) {
        console.error('Error creating profile:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
})


export default createProfile;