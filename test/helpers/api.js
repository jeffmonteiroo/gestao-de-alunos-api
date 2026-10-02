import 'dotenv/config';
import request from 'supertest';

if (!process.env.BASE_URL) {
  throw new Error('Configure BASE_URL no .env ou nas variáveis de ambiente.');
}

export const api = request(process.env.BASE_URL);
