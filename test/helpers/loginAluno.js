import { api } from './api.js';

export async function loginAluno(email, senha) {
  const resposta = await api
    .post('/api/auth/login')
    .send({ email, senha })
    .expect(200);

  return resposta.body;
}
