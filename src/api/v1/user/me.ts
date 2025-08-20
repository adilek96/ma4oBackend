import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import jwtLib from "jsonwebtoken";

const me = new Hono();

me.get("/user/me", async (c) => {
  const accessToken = getCookie(c, "access_token");

  if (!accessToken) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const decoded = jwtLib.verify(
      accessToken,
      process.env.JWT_SECRET!
    ) as { userId: string };

    // тут обычно делаем запрос в БД по userId
    // const user = await db.user.findUnique({ where: { id: decoded.userId } })

    return c.json({
      data: {
        userId: decoded.userId,
        // username: user?.username,
        // avatar: user?.avatar,
      },
    });
  } catch (error) {
    return c.json({ error: "Unauthorized" }, 401);
  }
});

export default me;
