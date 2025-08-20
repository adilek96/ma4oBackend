import { Hono } from "hono";
import { getCookie } from "hono/cookie";

const me = new Hono();

me.get("/user/me", async (c) => {
  try {
    // получаем данные пользователя из контекста (установленные middleware)
    const user = (c as any).get('user') as { userId: string };
    
    if (!user || !user.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // проверяем наличие JWT секрета
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return c.json({ error: 'Server configuration error' }, 500);
    }

    // тут обычно делаем запрос в БД по userId
    // const userData = await db.user.findUnique({ where: { id: user.userId } })

    return c.json({
      data: {
        userId: user.userId,
        // username: userData?.username,
        // avatar: userData?.avatar,
      },
    });
  } catch (error) {
    console.error('Me route error:', error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Диагностический маршрут для проверки куков
me.get("/user/debug", async (c) => {
  const accessToken = getCookie(c, 'access_token');
  const refreshToken = getCookie(c, 'refresh_token');
  
  return c.json({
    debug: {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken ? accessToken.length : 0,
      refreshTokenLength: refreshToken ? refreshToken.length : 0,
      allCookies: c.req.header('cookie'),
      userAgent: c.req.header('user-agent'),
    }
  });
});

export default me;
