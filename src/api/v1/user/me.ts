import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import jwtLib from 'jsonwebtoken'

// роут для проверки токена

const me = new Hono()

me.get('/user/me', async (c) => {
    const accessToken = getCookie(c, 'access_token')

    if(!accessToken){
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        const decoded = <{userId: string}>jwtLib.verify(accessToken, process.env.JWT_SECRET!)

    } catch (error) {

        return c.json({ error: 'Unauthorized' }, 401)
    }

    return c.json({
       message: 'success',
    })
})