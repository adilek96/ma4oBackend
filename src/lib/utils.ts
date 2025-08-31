// Функция для преобразования BigInt в строку
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString()
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt)
  }
  
  if (typeof obj === 'object') {
    const result: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = serializeBigInt(obj[key])
      }
    }
    return result
  }
  
  return obj
}
