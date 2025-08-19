import { Hono } from "hono";
import { isValid} from '@telegram-apps/init-data-node';
import "dotenv/config";


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


    const { initData } = await c.req.json<{ initData?: string }>();

    if (!initData) {
        return c.json({ error: 'initData is required' }, 400)
    }

    const initDataObj = new URLSearchParams(initData);
    

    const user = initDataObj.get("user")
 

    if (!user) {
        return c.json({ error: 'user is required' }, 400)
    }

    const userObj: TelegramUser = JSON.parse(user)

    const user_is_bot = userObj.is_bot


    if(user_is_bot){
        return c.json({ error: 'user is bot' }, 400)
    }
    console.log("начинаем валидацию")

    let validateData = false

try {
     // валидация initData с помощью пакета
    validateData = isValid(initData, process.env.TELEGRAM_BOT_TOKEN!);
     
} catch (error) {
    return c.json({ error: 'initData is invalid' }, 400)
}
    
  
   
    return c.json({
       
            "isCheck":validateData,

        
    })
})

export default auth;


