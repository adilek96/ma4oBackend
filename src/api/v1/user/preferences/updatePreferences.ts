import { Hono } from "hono"
import { prisma } from "../../../../lib/prisma.js"

const updatePreferences = new Hono()

updatePreferences.put('/user/preferences/update', async (c) => {
    const user = (c as any).get('user')
    const data = await c.req.json()

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
 
        
     
         const preferences = await prisma.preferences.update({
             where: {
                 userId: dbUser.id
             },
             data: {
                 genderPreference: data.genderPreference.toUpperCase(),
                 minAge: data.minAge,
                 maxAge: data.maxAge,
                 locationPreference: data.locationPreference.toUpperCase(),
                 maxDistance: data.maxDistance || null,
                 datingGoalPreference: data.datingGoalPreference.map((goal: string) => goal.toUpperCase()),
                 smokingPreference: data.smokingPreference?.toUpperCase() || null,
                 drinkingPreference: data.drinkingPreference?.toUpperCase() || null
             },
           
         })
     
         if(!preferences){
             return c.json({ error: 'Preferences not created' }, 400)
         } 
        
      
     
     return c.json({
         message: 'success'
     })
     } catch (error) {
         console.error('Error updating preferences:', error)
         return c.json({ error: 'Internal server error' }, 500)
     }
 
})

export default updatePreferences