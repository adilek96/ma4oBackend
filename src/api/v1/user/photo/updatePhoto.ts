import { Hono } from "hono"
import { prisma } from "../../../../lib/prisma.js"

const updatePhoto = new Hono()


updatePhoto.patch("/user/photo/update", async (c) => {
   
    const {photoId} = await c.req.json()
    const user = (c as any).get("user")
    if (!user) return c.json({ error: "Unauthorized" }, 401)

        const dbUser = await prisma.user.findUnique({
            where: { telegramId: user.userId },
          })
          if (!dbUser) return c.json({ error: "User not found" }, 404)
      



    // сначала проверяем есть ли уже главная фотография
    const mainPhotoArray = await prisma.photo.findMany({
        where: { userId: dbUser.id, isMain: true }
    })

    // если нет, то устанавливаем новую главную фотографию
    if (mainPhotoArray.length === 0) {
        await prisma.photo.update({
            where: { id: photoId },
            data: { isMain: true }
        })
    } else {
        try {
             // если есть, то снимаем главную фотографию с текущей и устанавливаем новую главную фотографию
        await prisma.photo.updateMany({
            where: { userId: dbUser.id, isMain: true },
            data: { isMain: false }
        })

        const updatedPhoto = await prisma.photo.update({
            where: { id: photoId },
            data: { isMain: true }
        })

        console.log(updatedPhoto)
        } catch (error) {
            return c.json({ message: "error" }, 500)
        }
       
    }

  

    return c.json({ message: "success" })
})
export default updatePhoto