import { Hono } from "hono";
import { prisma } from "../../../../lib/prisma.js";


const createProfile = new Hono()

createProfile.post('/user/profile/create', async (c) => {
    const user = (c as any).get('user')
    const data = await c.req.json()
    console.log(user)



    if(!user){
        return c.json({ error: 'Unauthorized' }, 401)
    }


    try {
        // валидация enum значений
        const validGenders = ['MALE', 'FEMALE', 'ANY', 'OTHER'];
        const validDatingGoals = ['RELATIONSHIP', 'FRIENDSHIP', 'CASUAL', 'MARRIAGE', 'NETWORKING'];
        
        if (!validGenders.includes(data.gender.toUpperCase())) {
            return c.json({ error: 'Invalid gender value' }, 400);
        }
        
        if (!validGenders.includes(data.seekingGender.toUpperCase())) {
            return c.json({ error: 'Invalid seeking gender value' }, 400);
        }
        
        if (!validDatingGoals.includes(data.datingGoal.toUpperCase())) {
            return c.json({ error: 'Invalid dating goal value' }, 400);
        }

        // используем upsert для создания или обновления профиля
        const profile = await prisma.profile.upsert({
            where: {
                userId: data.userId
            },
            update: {
                gender: data.gender.toUpperCase(),
                seekingGender: data.seekingGender.toUpperCase(),
                birthDate: new Date(data.birthDate),
                age: Math.abs(new Date().getFullYear() - new Date(data.birthDate).getFullYear()),
                country: data.country,
                city: data.city,
                latitude: data.location.latitude,
                longitude: data.location.longitude,
                bio: data.bio,
                height: data.height,
                datingGoal: data.datingGoal.toUpperCase(),
                languages: data.languages,
                interests: data.interests,
            },
            create: {
                userId: data.userId,
                gender: data.gender.toUpperCase(),
                seekingGender: data.seekingGender.toUpperCase(),
                birthDate: new Date(data.birthDate),
                age: Math.abs(new Date().getFullYear() - new Date(data.birthDate).getFullYear()),
                country: data.country,
                city: data.city,
                latitude: data.location.latitude,
                longitude: data.location.longitude,
                bio: data.bio,
                height: data.height,
                datingGoal: data.datingGoal.toUpperCase(),
                languages: data.languages,
                interests: data.interests,
            }
        });
        if(!profile){
            return c.json({ error: 'Profile not created' }, 400)
        } else {
            await prisma.user.update({
                where: {
                    telegramId: user.userId
                },
                data: {
                    isNew: false,
                    firstName: data.firstName,
                    lastName: data.lastName,
                  
                }
            }) 
        }
    

   
    } catch (error) {
        console.log(error)
        return c.json({ error: 'Internal server error' }, 500)
    }
   


    return c.json({
        message: 'success'
    })

})

export default createProfile;