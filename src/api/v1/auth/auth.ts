import { Hono } from "hono";
import { isValid} from '@telegram-apps/init-data-node';
import jwtLib from 'jsonwebtoken'
import { setCookie } from 'hono/cookie'



// Данные из initData
export type TelegramInitData = {
    query_id?: string;
    user?: string;       // это JSON-строка, нужно парсить
    auth_date: string;   // Unix timestamp (string)
    hash: string;
};
  
// После парсинга поля user
export type TelegramUser = {
    id: number;
    is_bot?: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    allows_write_to_pm?: boolean;
    photo_url?: string;
};
  

const auth = new Hono()



auth.post('/auth/tg', async (c) => {
    try {
        // получаем initData из тела запроса в сыром виде как строку
        const { initData } = await c.req.json<{ initData?: string }>();

        // проверяем есть ли initData
        if (!initData) {
            return c.json({ error: 'initData is required' }, 400)
        }

        // проверяем наличие токена бота
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.error('TELEGRAM_BOT_TOKEN is not set');
            return c.json({ error: 'Server configuration error' }, 500)
        }

        // проверяем наличие JWT секрета
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not set');
            return c.json({ error: 'Server configuration error' }, 500)
        }

        // парсим initData в объект
        const initDataObj = new URLSearchParams(initData);
        
        // получаем user из initDataObj
        const user = initDataObj.get("user")
     
        // проверяем есть ли user
        if (!user) {
            return c.json({ error: 'user is required' }, 400)
        }

        // парсим user в объект с обработкой ошибок
        let userObj: TelegramUser;
        try {
            userObj = JSON.parse(user);
        } catch (error) {
            console.error('Failed to parse user data:', error);
            return c.json({ error: 'Invalid user data format' }, 400)
        }

        // проверяем бот ли этот пользователь
        if(userObj.is_bot){
            return c.json({ error: 'user is bot' }, 400)
        }

        // проверяем валидность initData
        let validateData = false;

        try {
            // валидация initData с помощью пакета СДК ОТ Telegram и токена бота из .env
            validateData = isValid(initData, process.env.TELEGRAM_BOT_TOKEN);
        } catch (error) {
            console.error('InitData validation failed:', error);
            return c.json({ error: 'initData is invalid' }, 400)
        }

        if (!validateData) {
            return c.json({ error: 'initData validation failed' }, 400)
        }
        
        // если всё прошло успешно, то создаем токен для пользователя
        const accessToken = jwtLib.sign(
            { userId: userObj.id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '60m' }
        )

        const refreshToken = jwtLib.sign(
            { userId: userObj.id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        )

    
        // устанавливаем куки
        setCookie(c, 'access_token', accessToken, {
            httpOnly: true,
            secure: true,        // только по HTTPS в продакшене
            sameSite: 'none',  // разрешаем кросс-доменные запросы
            maxAge: 60 * 60,     // срок жизни 1 час
            path: '/',           // доступно во всём приложении
        })

        setCookie(c, 'refresh_token', refreshToken, {
            httpOnly: true,
            secure: true,        // только по HTTPS в продакшене
            sameSite: 'none',  // разрешаем кросс-доменные запросы
            maxAge: 60 * 60 * 24 * 7,     // срок жизни 1 неделя
            path: '/',           // доступно во всём приложении
        })

        return c.json({
            message: 'success',
            user: {
                id: userObj.id,
                first_name: userObj.first_name,
                username: userObj.username
            }
        })

    } catch (error) {
        console.error('Auth error:', error);
        return c.json({ error: 'Internal server error' }, 500)
    }
})

export default auth;


