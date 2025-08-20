import { getCookie } from "hono/cookie"
import jwtLib from 'jsonwebtoken'




const authMiddleware = async (c: any , next: any) => {
    // получаем токен из куки
    const accessToken = getCookie(c, 'access_token')

    if (!accessToken) {
        // возвращаем ошибку 401 если токен не валидный
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        // проверяем JWT
        const decoded = jwtLib.verify(accessToken, process.env.JWT_SECRET!) as { userId: string }
    
        // сохраняем payload в контексте, чтобы роуты могли его использовать
        (c as any).set('user', decoded)
    
        // идём дальше
        await next()
    } catch (err) {
        // возвращаем ошибку 401 если токен не валидный
        return c.json({ error: 'Unauthorized' }, 401)
    }

    
}

export default authMiddleware;