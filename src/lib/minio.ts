import { Client } from "minio";


const ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost'
const PORT = Number(process.env.MINIO_PORT) || 9000
const ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin'
const SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin'
const SSL = process.env.MINIO_USE_SSL === 'true'


export const minioClient = new Client({
    endPoint: ENDPOINT,      // или IP / домен
    port: PORT,                 // порт MinIO
    useSSL: SSL,              // true если через https
    accessKey: ACCESS_KEY,    // твой access key
    secretKey: SECRET_KEY,    // твой secret key
  });