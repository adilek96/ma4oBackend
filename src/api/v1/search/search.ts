import { Hono } from 'hono'
import { prisma } from '../../../lib/prisma.js'
import { Prisma } from '@prisma/client'

const search = new Hono()

search.get('/search', async (c) => {
  // получаем данные пользователя из контекста (установленные middleware)
  const user = (c as any).get('user')

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Находим предпочтения пользователя в БД по Telegram ID
  const dbUser = await prisma.user.findUnique({
    where: {
      telegramId: user.userId,
    },
    include: {
      preferences: true,
      profile: true,
    },
  })

  if (!dbUser?.preferences) {
    return c.json({ error: 'User preferences not found' }, 404)
  }

  // после того как получили предпочтения пользователя, нужно найти всех пользователей, которые соответствуют предпочтениям

  const genderPreference = dbUser.preferences.genderPreference
  const minAge = dbUser.preferences.minAge
  const maxAge = dbUser.preferences.maxAge
  const locationPreference = dbUser.preferences.locationPreference
  const maxDistance = dbUser.preferences.maxDistance
  const datingGoalPreference = dbUser.preferences.datingGoalPreference
  const smokingPreference = dbUser.preferences.smokingPreference
  const drinkingPreference = dbUser.preferences.drinkingPreference

  // SAME_CITY
  // SAME_COUNTRY
  // ANYWHERE
  // NEARBY

  function getLocation() {
    if (locationPreference === 'SAME_CITY') {
      return {
        city: dbUser?.profile?.city,
        country: dbUser?.profile?.country,
      }
    } else if (locationPreference === 'SAME_COUNTRY') {
      return {
        country: dbUser?.profile?.country,
      }
    } else if (locationPreference === 'ANYWHERE') {
      return {}
    } else if (locationPreference === 'NEARBY') {
      // в случае если пользователь предпочел искать в радиусе  от своего местоположения то все равно ищем в той стране , потом будем сортировать по расстоянию
      return {
        country: dbUser?.profile?.country,
      }
    } else {
      return {
        city: dbUser?.profile?.city,
        country: dbUser?.profile?.country,
      }
    }
  }

  const location = getLocation()

  let users: any[] = []

  if (locationPreference !== 'NEARBY') {
    if (genderPreference === 'ANY') {
      //  если пользователь предпочел любой пол и поиск не по радиусу  то ищем всех пользователей которые прошли создание анкет и соответсвуют искомому возрастному диапазону
      users = await prisma.user.findMany({
        where: {
          isNew: false,
          isPreferences: true,
          id: {
            not: dbUser.id,
          },
          profile: {
            age: {
              gte: minAge,
              lte: maxAge,
            },
            ...location,
          },
        },
        include: {
          profile: true,
          photos: true,
          preferences: true,
        },
      })
    } else {
      //  если пользователь предпочел определенный пол  то ищем всех пользователей которые прошли создание анкет и соответсвуют искомому возрастному диапазону
      users = await prisma.user.findMany({
        where: {
          isNew: false,
          isPreferences: true,
          id: {
            not: dbUser.id,
          },
          profile: {
            gender: genderPreference,
            age: {
              gte: minAge,
              lte: maxAge,
            },
            ...location,
          },
        },
        include: {
          profile: true,
          photos: true,
          preferences: true,
        },
      })
    }
  } else {
    // если выбран поиск по радиусу то делаем запрос с расчетом точного расстояния
    // сначала проверяем если координаты не указаны или радиус не указан то возвращаем ошибку
    if (!dbUser.profile?.latitude || !dbUser.profile?.longitude || !maxDistance) {
      return c.json({ error: 'User location not found' }, 404)
    }

    // Проверяем корректность координат
    if (
      isNaN(dbUser.profile.latitude) ||
      isNaN(dbUser.profile.longitude) ||
      dbUser.profile.latitude < -90 ||
      dbUser.profile.latitude > 90 ||
      dbUser.profile.longitude < -180 ||
      dbUser.profile.longitude > 180
    ) {
      return c.json({ error: 'Invalid user coordinates' }, 400)
    }

    const earthRadius = 6371 // км
    const radiusKm = maxDistance

    const lat0 = dbUser.profile.latitude
    const lon0 = dbUser.profile.longitude

    // Вычисляем bounding box
    const latDelta = (radiusKm / earthRadius) * (180 / Math.PI)
    const lonDelta = (radiusKm / (earthRadius * Math.cos((lat0 * Math.PI) / 180))) * (180 / Math.PI)

    const minLat = lat0 - latDelta
    const maxLat = lat0 + latDelta
    const minLon = lon0 - lonDelta
    const maxLon = lon0 + lonDelta

    // Создаем фильтры для Prisma.Sql
    const filters: Prisma.Sql[] = [
      Prisma.sql`u."isNew" = false`,
      Prisma.sql`u."isPreferences" = true`,
      Prisma.sql`u.id != ${dbUser.id}`,
      Prisma.sql`p."age" BETWEEN ${minAge} AND ${maxAge}`,
    ]

    // Добавляем фильтр по полу если нужно
    if (genderPreference !== 'ANY') {
      filters.push(Prisma.sql`p."gender" = ${genderPreference}::"Gender"`)
    }

    // Добавляем фильтр по координатам только для пользователей с координатами
    filters.push(Prisma.sql`p."latitude" IS NOT NULL`)
    filters.push(Prisma.sql`p."longitude" IS NOT NULL`)
    filters.push(Prisma.sql`p."latitude" BETWEEN ${minLat} AND ${maxLat}`)
    filters.push(Prisma.sql`p."longitude" BETWEEN ${minLon} AND ${maxLon}`)

    const whereClause = Prisma.join(filters, ' AND ')

    try {
      // SQL запрос с расчетом точного расстояния
      users = await prisma.$queryRaw`
            SELECT 
                u.id,
                u."firstName",
                u."lastName",
                u."telegramId",
                u."isNew",
                u."isPreferences",
                p.age,
                p.city,
                p.country,
                p.gender,
                p.latitude,
                p.longitude,
                p.interests,
                p.bio,
                p.smoking,
                p.drinking,
                pr."datingGoalPreference",
                (
                    6371 * acos(
                        GREATEST(-1, LEAST(1, 
                            cos(radians(${lat0})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${lon0}))
                            + sin(radians(${lat0})) * sin(radians(p.latitude))
                        ))
                    )
                ) AS distance
            FROM "users" u
            JOIN "profiles" p ON p."userId" = u.id
            JOIN "preferences" pr ON pr."userId" = u.id
            WHERE ${whereClause}
            AND p.latitude IS NOT NULL 
            AND p.longitude IS NOT NULL
            AND p.latitude BETWEEN -90 AND 90
            AND p.longitude BETWEEN -180 AND 180
            AND (
                6371 * acos(
                    GREATEST(-1, LEAST(1, 
                        cos(radians(${lat0})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${lon0}))
                        + sin(radians(${lat0})) * sin(radians(p.latitude))
                    ))
                )
            ) <= ${maxDistance}
            ORDER BY distance;
        `
    } catch (error) {
      console.error('SQL query error:', error)
      return c.json({ error: 'Database query failed' }, 500)
    }
  }

  //  если никто не найден то воращаем пустой обьект
  if (users.length === 0) {
    return c.json({ message: 'success', users: [] }, 200)
  }

  // далее создаем новый обьект с данными пользователя и его анкеты

  let data: any[] = []

  for (const user of users) {
    // Для поиска по радиусу нужно получить фотографии отдельно
    let userPhotos: any[] = []
    if (locationPreference === 'NEARBY') {
      userPhotos = await prisma.photo.findMany({
        where: { userId: user.id },
      })
    } else {
      userPhotos = user.photos || []
    }

    if (userPhotos.length === 0) {
      continue
    }

    let compliance = 70

    // Получаем данные профиля в зависимости от типа поиска
    let userSmoking,
      userDrinking,
      userAge,
      userCity,
      userCountry,
      userGender,
      userInterests,
      userBio

    if (locationPreference === 'NEARBY') {
      // Для поиска по радиусу данные приходят из raw SQL
      userSmoking = user.smoking
      userDrinking = user.drinking
      userAge = user.age
      userCity = user.city
      userCountry = user.country
      userGender = user.gender
      userInterests = user.interests
      userBio = user.bio
    } else {
      // Для обычного поиска данные приходят из Prisma с вложенными объектами
      userSmoking = user.profile?.smoking
      userDrinking = user.profile?.drinking
      userAge = user.profile?.age
      userCity = user.profile?.city
      userCountry = user.profile?.country
      userGender = user.profile?.gender
      userInterests = user.profile?.interests
      userBio = user.profile?.bio
    }

    if (
      smokingPreference === 'ACCEPTABLE' &&
      (userSmoking === 'OCCASIONALLY' || userSmoking === 'REGULARLY')
    ) {
      compliance += 10
    } else if (
      smokingPreference === 'UNACCEPTABLE' &&
      (userSmoking === 'NEVER' || userSmoking === 'QUIT')
    ) {
      compliance += 10
    } else if (
      smokingPreference === 'NEUTRAL' &&
      (userSmoking === 'NEVER' || userSmoking === 'QUIT' || userSmoking === 'PREFER_NOT_TO_SAY')
    ) {
      compliance += 10
    }

    if (
      drinkingPreference === 'ACCEPTABLE' &&
      (userDrinking === 'OCCASIONALLY' || userDrinking === 'REGULARLY')
    ) {
      compliance += 10
    } else if (
      drinkingPreference === 'UNACCEPTABLE' &&
      (userDrinking === 'NEVER' || userDrinking === 'QUIT')
    ) {
      compliance += 10
    } else if (
      drinkingPreference === 'NEUTRAL' &&
      (userDrinking === 'NEVER' || userDrinking === 'QUIT' || userDrinking === 'PREFER_NOT_TO_SAY')
    ) {
      compliance += 10
    }

    // Проверяем структуру данных пользователя
    let userDatingGoals = []
    if (locationPreference === 'NEARBY') {
      // Для поиска по радиусу данные приходят из raw SQL
      userDatingGoals = user.datingGoalPreference || []
    } else {
      // Для обычного поиска данные приходят из Prisma с вложенными объектами
      userDatingGoals = user.preferences?.datingGoalPreference || []
    }

    for (const goal of datingGoalPreference) {
      for (const userGoal of userDatingGoals) {
        if (goal === userGoal) {
          compliance += 2
        } else {
          compliance -= 2
        }
      }
    }

    data.push({
      id: user.id,
      name: user.firstName,
      lastName: user.lastName,
      age: userAge,
      city: userCity,
      country: userCountry,
      gender: userGender,
      photo: userPhotos.map((p) => {
        return { url: p.url, isMain: p.isMain }
      }),
      interests: userInterests,
      bio: userBio,
      distance: user.distance,
      compliance: compliance,
    })
  }

  //     const data = users.map((user) => {
  //         let compliance = 70;

  //         if(user.id === dbUser.id){
  //             return
  //         }

  //         // NEVER
  //         // OCCASIONALLY
  //         // REGULARLY
  //         // QUIT
  //         // PREFER_NOT_TO_SAY

  //         // ACCEPTABLE
  //         // UNACCEPTABLE
  //         // NEUTRAL

  //         if(smokingPreference === "ACCEPTABLE" && (user.profile.smoking === "OCCASIONALLY" || user.profile.smoking === "REGULARLY")){
  //             compliance += 10;
  //         } else if (smokingPreference === "UNACCEPTABLE" && (user.profile.smoking === "NEVER" || user.profile.smoking === "QUIT" )){
  //             compliance += 10;
  //         } else if (smokingPreference === "NEUTRAL" && (user.profile.smoking === "NEVER" || user.profile.smoking === "QUIT" || user.profile.smoking === "PREFER_NOT_TO_SAY")){
  //             compliance += 10;
  //         }

  //         if(drinkingPreference === "ACCEPTABLE" && (user.profile.drinking === "OCCASIONALLY" || user.profile.drinking === "REGULARLY")){
  //             compliance += 10;
  //         } else if (drinkingPreference === "UNACCEPTABLE" && (user.profile.drinking === "NEVER" || user.profile.drinking === "QUIT" )){
  //             compliance += 10;
  //         } else if (drinkingPreference === "NEUTRAL" && (user.profile.drinking === "NEVER" || user.profile.drinking === "QUIT" || user.profile.drinking === "PREFER_NOT_TO_SAY")){
  //             compliance += 10;
  //         }

  // //   RELATIONSHIP
  // //   FRIENDSHIP
  // //   CASUAL
  // //   MARRIAGE
  // //   NETWORKING

  //         // for(const goal of datingGoalPreference){
  //         //     for(const userGoal of user.preferences.datingGoal){
  //         //         if(goal === userGoal){
  //         //             compliance += 2;
  //         //         }
  //         //     }
  //         // }

  //         return {
  //             id: user.id,
  //             name: user.name,
  //             lastName: user.lastName,
  //             age: user.profile.age,
  //             city: user.profile.city,
  //             country: user.profile.country,
  //             gender: user.profile.gender,
  //             // @ts-ignore
  //             photo:  user.photos.map(p => {return {url: p.url, isMain: p.isMain}}),
  //             interests: user.profile.interests,
  //             bio: user.profile.bio,
  //             distance: user.distance,
  //             compliance: compliance
  //         }
  //     })

  if (data.length === 0) {
    return c.json({ message: 'success', users: [] }, 200)
  }

  return c.json({ message: 'success', data: data }, 200)
})

export default search
