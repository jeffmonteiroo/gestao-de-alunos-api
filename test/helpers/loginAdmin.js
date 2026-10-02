import { api } from './api.js';

export async function loginAdmin() {
  const resposta = await api
    .post('/api/auth/login')
    .send({ email: process.env.ADMIN_EMAIL, senha: process.env.ADMIN_SENHA })
    .expect(200);

  return resposta.body;
}
