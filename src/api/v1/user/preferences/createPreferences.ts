import { Hono } from "hono";
import { prisma } from "../../../../lib/prisma.js";


const createPreferences = new Hono()


createPreferences.post('/user/preferences/create', async (c) => {
    const user = (c as any).get('user')
    const data = await c.req.json()

// datingGoalPreference
// "RELATIONSHIP"
// drinkingPreference
// "NEVER"
// genderPreference
// "male"
// locationPreference
// "SAME_COUNTRY"
// maxAge
// 35
// maxDistance
// 26
// minAge
// 18
// smokingPreference
// "NEVER"
// userId
// "cmekeej0p0000iu7c7oyrgl9j"

    if(!user){
        return c.json({ error: 'Unauthorized' }, 401)
    }

    // const validGenderPreferences = ['MALE', 'FEMALE', 'ANY', 'OTHER'];
    // const validDatingGoalPreferences = ['RELATIONSHIP', 'FRIENDSHIP', 'CASUAL', 'MARRIAGE', 'NETWORKING'];
    // const validLocationPreferences = ['SAME_CITY', 'SAME_COUNTRY', 'ANYWHERE', 'NEARBY'];

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

       
    
        const preferences = await prisma.preferences.upsert({
            where: {
                userId: dbUser.id
            },
            update: {
                genderPreference: data.genderPreference.toUpperCase(),
                minAge: data.minAge,
                maxAge: data.maxAge,
                locationPreference: data.locationPreference.toUpperCase(),
                maxDistance: data.maxDistance || null,
                datingGoalPreference: data.datingGoalPreference.map((goal: string) => goal.toUpperCase()),
                smokingPreference: data.smokingPreference?.toUpperCase() || null,
                drinkingPreference: data.drinkingPreference?.toUpperCase() || null
            },
            create: {
                userId: dbUser.id,
                genderPreference: data.genderPreference.toUpperCase(),
                minAge: data.minAge,
                maxAge: data.maxAge,
                locationPreference: data.locationPreference.toUpperCase(),
                maxDistance: data.maxDistance || null,
                datingGoalPreference: data.datingGoalPreference.map((goal: string) => goal.toUpperCase()),
                smokingPreference: data.smokingPreference?.toUpperCase() || null,
                drinkingPreference: data.drinkingPreference?.toUpperCase() || null
            }
        })
    
        if(!preferences){
            return c.json({ error: 'Preferences not created' }, 400)
        } 
       
        await prisma.user.update({
           where: {
            id: dbUser.id
           },
           data: {
            isPreferences: true
           }
        })
    
    return c.json({
        message: 'success'
    })
    } catch (error) {
        console.error('Error creating preferences:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }

    
})

export default createPreferences