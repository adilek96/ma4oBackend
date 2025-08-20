import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import jwtLib from 'jsonwebtoken'

// роут для проверки токена

const me = new Hono()

me.get('/user/me', async (c) => {
    // получаем токен из куки
    const accessToken = getCookie(c, 'access_token')

    // проверяем есть ли токен
    if(!accessToken){
        return c.json({ error: 'Unauthorized' }, 401)
    }

    // проверяем токен
    try {
        const decoded = <{userId: string}>jwtLib.verify(accessToken, process.env.JWT_SECRET!)

    } catch (error) {
        // возвращаем ошибку 401 если токен не валидный
        return c.json({ error: 'Unauthorized' }, 401)
    }

    return c.json({
       message: 'success',
    })
})

export default me;