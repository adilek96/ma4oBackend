import { Hono } from "hono";


const createProfile = new Hono()

createProfile.post('/user/profile/create', async (c) => {
    const user = (c as any).get('user')

    if(!user){
        return c.json({ error: 'Unauthorized' }, 401)
    }

    return c.json({
        message: user
    })

})

export default createProfile;