// Rotas de cadastro, login, logout e troca de conta.

const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const router = express.Router();

router.get('/login', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/painel');
    }

    res.render('login', {
        titulo: 'Entrar no CarbonMob',
        erro: null
    });
});

router.get('/cadastro', (req, res) => {
    res.render('cadastro', {
        titulo: 'Criar conta',
        erro: null
    });
});

router.post('/cadastro', async (req, res) => {
    const nome = (req.body.nome || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const senha = req.body.senha || '';
    const tipo = req.body.tipo === 'empresa' ? 'empresa' : 'pessoa';
    const empresa = (req.body.empresa || '').trim();

    if (!nome || !email.includes('@') || senha.length < 8) {
        return res.render('cadastro', {
            titulo: 'Criar conta',
            erro: 'Preencha os campos corretamente. A senha precisa ter pelo menos 8 caracteres.'
        });
    }

    if (tipo === 'empresa' && !empresa) {
        return res.render('cadastro', {
            titulo: 'Criar conta',
            erro: 'Informe o nome da empresa.'
        });
    }

    try {
        const [existente] = await pool.execute(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existente.length > 0) {
            return res.render('cadastro', {
                titulo: 'Criar conta',
                erro: 'Este e-mail já está cadastrado.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        await pool.execute(
            `INSERT INTO usuarios (nome, email, senha, tipo, nome_empresa)
             VALUES (?, ?, ?, ?, ?)`,
            [nome, email, senhaHash, tipo, tipo === 'empresa' ? empresa : null]
        );

        req.session.mensagem = 'Conta criada! Agora entre com seu e-mail e senha.';
        res.redirect('/login');
    } catch (erro) {
        console.error(erro);
        res.render('cadastro', {
            titulo: 'Criar conta',
            erro: 'Não foi possível criar a conta. Confira se o banco está configurado.'
        });
    }
});

router.post('/login', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const senha = req.body.senha || '';

    try {
        const [usuarios] = await pool.execute(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            return res.render('login', {
                titulo: 'Entrar no CarbonMob',
                erro: 'E-mail ou senha incorretos.'
            });
        }

        const usuario = usuarios[0];
        const senhaConfere = await bcrypt.compare(senha, usuario.senha);

        if (!senhaConfere) {
            return res.render('login', {
                titulo: 'Entrar no CarbonMob',
                erro: 'E-mail ou senha incorretos.'
            });
        }

        // Cria uma sessão nova depois do login para renovar o identificador.
        req.session.regenerate((erroSessao) => {
            if (erroSessao) {
                console.error(erroSessao);
                return res.status(500).send('Não foi possível iniciar sua sessão.');
            }

            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo,
                nome_empresa: usuario.nome_empresa
            };

            req.session.save(() => {
                res.redirect('/painel');
            });
        });
    } catch (erro) {
        console.error(erro);
        res.render('login', {
            titulo: 'Entrar no CarbonMob',
            erro: 'Não foi possível entrar. Confira a conexão com o banco.'
        });
    }
});

router.post('/sair', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;
