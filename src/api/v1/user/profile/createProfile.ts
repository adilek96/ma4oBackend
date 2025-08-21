import { Hono } from "hono";
import { prisma } from "../../../../lib/prisma.js";


const createProfile = new Hono()

createProfile.post('/user/profile/create', async (c) => {
    const user = (c as any).get('user')
    const data = await c.req.json()
    console.log(data)

    if(!user){
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        // валидация enum значений
        const validGenders = ['MALE', 'FEMALE', 'OTHER'];
        const validGenderPreferences = ['MALE', 'FEMALE', 'ANY', 'OTHER'];
        const validDatingGoals = ['RELATIONSHIP', 'FRIENDSHIP', 'CASUAL', 'MARRIAGE', 'NETWORKING'];
        const validLocationPreferences = ['SAME_CITY', 'SAME_COUNTRY', 'ANYWHERE', 'NEARBY'];
        const validSmoking = ['YES', 'NO', 'OCCASIONALLY', 'QUIT'];
        const validDrinking = ['YES', 'NO', 'OCCASIONALLY', 'SOCIAL'];
        
        // Валидация обязательных полей
        if (!data.gender || !data.seekingGender || !data.birthDate || !data.country || 
            !data.city || !data.datingGoal || !data.languages || !data.interests) {
            return c.json({ error: 'Missing required fields' }, 400);
        }
        
        if (!validGenders.includes(data.gender.toUpperCase())) {
            return c.json({ error: 'Invalid gender value' }, 400);
        }
        
        if (!validGenderPreferences.includes(data.seekingGender.toUpperCase())) {
            return c.json({ error: 'Invalid seeking gender value' }, 400);
        }
        
        if (!validDatingGoals.includes(data.datingGoal.toUpperCase())) {
            return c.json({ error: 'Invalid dating goal value' }, 400);
        }

        // Валидация опциональных enum полей
        if (data.smoking && !validSmoking.includes(data.smoking.toUpperCase())) {
            return c.json({ error: 'Invalid smoking value' }, 400);
        }
        
        if (data.drinking && !validDrinking.includes(data.drinking.toUpperCase())) {
            return c.json({ error: 'Invalid drinking value' }, 400);
        }

        // используем upsert для создания или обновления профиля
        const profile = await prisma.profile.upsert({
            where: {
                userId: user.id
            },
            update: {
                gender: data.gender.toUpperCase(),
                seekingGender: data.seekingGender.toUpperCase(),
                birthDate: new Date(data.birthDate),
                age: Math.abs(new Date().getFullYear() - new Date(data.birthDate).getFullYear()),
                country: data.country,
                city: data.city,
                latitude: data.location?.latitude,
                longitude: data.location?.longitude,
                bio: data.bio,
                height: data.height,
                datingGoal: data.datingGoal.toUpperCase(),
                languages: data.languages,
                interests: data.interests,
                drinking: data.drinking?.toUpperCase(),
                smoking: data.smoking?.toUpperCase(),
                education: data.education,
                occupation: data.occupation,
            },
            create: {
                userId: user.id,
                gender: data.gender.toUpperCase(),
                seekingGender: data.seekingGender.toUpperCase(),
                birthDate: new Date(data.birthDate),
                age: Math.abs(new Date().getFullYear() - new Date(data.birthDate).getFullYear()),
                country: data.country,
                city: data.city,
                latitude: data.location?.latitude,
                longitude: data.location?.longitude,
                bio: data.bio,
                height: data.height,
                datingGoal: data.datingGoal.toUpperCase(),
                languages: data.languages,
                interests: data.interests,
                drinking: data.drinking?.toUpperCase(),
                smoking: data.smoking?.toUpperCase(),
                education: data.education,
                occupation: data.occupation,
            }
        })

        if(!profile){
            return c.json({ error: 'Profile not created' }, 400)
        } else {
            // Валидация предпочтений
            if (data.locationPreference && !validLocationPreferences.includes(data.locationPreference.toUpperCase())) {
                return c.json({ error: 'Invalid location preference value' }, 400);
            }

            // Создаем или обновляем предпочтения
            await prisma.preferences.upsert({
                where: {
                    userId: user.id
                },
                update: {
                    genderPreference: data.seekingGender.toUpperCase(),
                    minAge: data.minAge,
                    maxAge: data.maxAge,
                    locationPreference: data.locationPreference?.toUpperCase() || 'SAME_CITY',
                    maxDistance: data.maxDistance,
                    datingGoalPreference: [data.datingGoal.toUpperCase()],
                    smokingPreference: data.smoking?.toUpperCase(),
                    drinkingPreference: data.drinking?.toUpperCase(),
                },
                create: {
                    userId: user.id,
                    genderPreference: data.seekingGender.toUpperCase(),
                    minAge: data.minAge,
                    maxAge: data.maxAge,
                    locationPreference: data.locationPreference?.toUpperCase() || 'SAME_CITY',
                    maxDistance: data.maxDistance,
                    datingGoalPreference: [data.datingGoal.toUpperCase()],
                    smokingPreference: data.smoking?.toUpperCase(),
                    drinkingPreference: data.drinking?.toUpperCase(),
                }
            })

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