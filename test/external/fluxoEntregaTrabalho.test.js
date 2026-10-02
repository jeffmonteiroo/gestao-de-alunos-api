import { readFileSync } from 'node:fs';
import { expect } from 'chai';
import { api } from '../helpers/api.js';
import { loginAdmin } from '../helpers/loginAdmin.js';
import { loginAluno } from '../helpers/loginAluno.js';

const cenarios = JSON.parse(
  readFileSync(new URL('../fixtures/entregas.json', import.meta.url), 'utf8')
);

describe('Fluxo de cadastro e entrega de trabalho - Data-Driven Testing', function () {
  this.timeout(10000);

  cenarios.forEach((cenario, indice) => {
    it(cenario.cenario, async () => {
      // Preparacao: dados diferentes a cada execucao evitam conflito no cadastro.
      const sufixo = `${Date.now()}-${indice}`;
      const dadosAluno = {
        ...cenario.aluno,
        email: cenario.aluno.email.replace('@', `+${sufixo}@`),
        matricula: `${cenario.aluno.matricula}-${sufixo}`,
      };

      const admin = await loginAdmin();
      expect(admin.usuario.role).to.equal('admin');
      expect(admin.token).to.be.a('string').and.not.be.empty;

      const cadastroAluno = await api
        .post('/api/admin/alunos')
        .set('Authorization', `Bearer ${admin.token}`)
        .send(dadosAluno)
        .expect(201);

      const alunoId = cadastroAluno.body.id;
      expect(alunoId).to.be.a('string').and.not.be.empty;
      expect(cadastroAluno.body).to.include({
        nome: dadosAluno.nome,
        email: dadosAluno.email,
        matricula: dadosAluno.matricula,
      });

      const cadastroDisciplina = await api
        .post('/api/admin/disciplinas')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ ...cenario.disciplina, codigo: `${cenario.disciplina.codigo}-${sufixo}` })
        .expect(201);

      const disciplinaId = cadastroDisciplina.body.id;
      expect(disciplinaId).to.be.a('string').and.not.be.empty;

      await api
        .post(`/api/admin/disciplinas/${disciplinaId}/matriculas`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ alunoId })
        .expect(201);

      const aluno = await loginAluno(dadosAluno.email, dadosAluno.senha);
      expect(aluno.usuario).to.include({ id: alunoId, role: 'aluno' });
      expect(aluno.token).to.be.a('string').and.not.be.empty;

      // Acao: a entrega usa o token do aluno que acabamos de cadastrar.
      const entrega = await api
        .post(`/api/alunos/${alunoId}/trabalhos`)
        .set('Authorization', `Bearer ${aluno.token}`)
        .send({ ...cenario.trabalho, disciplinaId });

      // Verificacao: conferir a resposta e consultar a entrega gravada.
      expect(entrega.status).to.equal(cenario.resultadoEsperado.statusHttp);
      expect(entrega.body.id).to.be.a('string').and.not.be.empty;
      expect(entrega.body).to.include({
        alunoId,
        disciplinaId,
        titulo: cenario.trabalho.titulo,
        descricao: cenario.trabalho.descricao,
        status: cenario.resultadoEsperado.statusTrabalho,
      });

      const consulta = await api
        .get(`/api/alunos/${alunoId}/trabalhos`)
        .set('Authorization', `Bearer ${aluno.token}`)
        .expect(200);

      expect(consulta.body).to.be.an('array').with.lengthOf(1);
      expect(consulta.body[0]).to.include({
        id: entrega.body.id,
        titulo: cenario.trabalho.titulo,
        status: cenario.resultadoEsperado.statusTrabalho,
      });
    });
  });
});
