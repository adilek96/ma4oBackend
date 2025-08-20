import { Hono } from "hono";
import { getCookie, setCookie } from 'hono/cookie'
import jwtLib from 'jsonwebtoken'

const refresh = new Hono()

refresh.post('/auth/refresh', async (c) => {
    // получаем токен из куки
    const refreshToken = getCookie(c, 'refresh_token')
    
    // проверяем есть ли токен
    if (!refreshToken) {
        return c.json({ error: 'refresh_token is required' }, 400)
    }

    try {
        // проверяем токен
        const decoded = <{userId: string}>jwtLib.verify(refreshToken, process.env.JWT_SECRET!)
    
        // создаем новый токен
        const accessToken = jwtLib.sign(
            { userId: decoded.userId }, 
            process.env.JWT_SECRET!, 
            { expiresIn: '60m' }
          )
        
        // определяем настройки куков в зависимости от окружения
        const isProduction = process.env.NODE_ENV === 'production';
        
        // устанавливаем куки
        setCookie(c, 'access_token', accessToken, {
            httpOnly: true,
            secure: true,        // обязательно для SameSite=None
            sameSite: 'none',  // разрешаем кросс-доменные запросы
            maxAge: 60 * 60,     // срок жизни 1 час
            path: '/',           // доступно во всём приложении
        })
    } catch (error) {
        // возвращаем ошибку 401 если токен не валидный
        return c.json({ error: 'refresh_token is invalid' }, 401)
    }
   

    return c.json({
        message: 'success'
    })
})

export default refresh;