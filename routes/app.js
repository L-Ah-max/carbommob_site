// Páginas e ações que precisam de uma conta conectada.

const express = require('express');
const pool = require('../config/database');
const exigirLogin = require('../middleware/auth');

const router = express.Router();

const fatores = {
    gasolina: Number(process.env.GASOLINE_FACTOR || 2.2),
    etanol: Number(process.env.ETHANOL_FACTOR || 0.2),
    diesel: Number(process.env.DIESEL_FACTOR || 2.6)
};

const nomesCombustivel = {
    gasolina: 'Gasolina',
    etanol: 'Etanol',
    diesel: 'Diesel'
};

function calcularEmissao(distancia, consumo, combustivel) {
    const fator = fatores[combustivel];

    if (!fator || distancia <= 0 || consumo <= 0) {
        return 0;
    }

    return (distancia / consumo) * fator;
}

function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}

function pagina(req, res, nome, dados = {}) {
    res.render(nome, {
        titulo: 'CarbonMob',
        ...dados
    });
}

router.get('/painel', exigirLogin, async (req, res) => {
    try {
        const [viagens] = await pool.execute(
            'SELECT * FROM deslocamentos WHERE usuario_id = ? ORDER BY criado_em DESC LIMIT 5',
            [req.session.usuario.id]
        );

        const [totais] = await pool.execute(
            `SELECT COUNT(*) AS quantidade,
                    COALESCE(SUM(emissao_kg), 0) AS emissao
             FROM deslocamentos
             WHERE usuario_id = ?`,
            [req.session.usuario.id]
        );

        const [compras] = await pool.execute(
            'SELECT COALESCE(SUM(quantidade), 0) AS quantidade FROM compras WHERE usuario_id = ?',
            [req.session.usuario.id]
        );

        pagina(req, res, 'painel', {
            viagens,
            totais: totais[0],
            creditosComprados: compras[0].quantidade,
            formatarData
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar o painel.');
    }
});

router.get('/deslocamentos', exigirLogin, async (req, res) => {
    try {
        const [viagens] = await pool.execute(
            'SELECT * FROM deslocamentos WHERE usuario_id = ? ORDER BY criado_em DESC',
            [req.session.usuario.id]
        );

        pagina(req, res, 'deslocamentos', {
            viagens,
            erro: null,
            sucesso: req.query.salvo === '1'
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao consultar os deslocamentos.');
    }
});

router.post('/deslocamentos', exigirLogin, async (req, res) => {
    const origem = (req.body.origem || '').trim();
    const destino = (req.body.destino || '').trim();
    const distancia = Number(req.body.distancia);
    const transporte = req.body.transporte;
    const combustivel = req.body.combustivel;
    const consumo = Number(req.body.consumo);
    let emissao = 0;
    let passageiros = 1;
    let descricao = '';

    if (!origem || !destino || distancia <= 0 || !Number.isFinite(distancia)) {
        return res.redirect('/deslocamentos');
    }

    if (transporte === 'carro' || transporte === 'moto') {
        if (!fatores[combustivel] || consumo <= 0 || (transporte === 'moto' && combustivel === 'diesel')) {
            return res.redirect('/deslocamentos');
        }

        emissao = calcularEmissao(distancia, consumo, combustivel);
        descricao = `${nomesCombustivel[combustivel]} · ${consumo} km/L`;
    } else if (transporte === 'onibus') {
        const consumoOnibus = Number(process.env.BUS_DIESEL_KM_PER_L || 2.5);
        passageiros = Number(process.env.BUS_AVERAGE_PASSENGERS || 30);
        const emissaoTotalOnibus = calcularEmissao(distancia, consumoOnibus, 'diesel');
        emissao = emissaoTotalOnibus / passageiros;
        descricao = `Ônibus estimado · ${passageiros} passageiros considerados`;
    } else {
        return res.redirect('/deslocamentos');
    }

    try {
        await pool.execute(
            `INSERT INTO deslocamentos
             (usuario_id, origem, destino, distancia_km, transporte, combustivel,
              consumo_km_l, passageiros_considerados, emissao_kg, observacao)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.session.usuario.id,
                origem,
                destino,
                distancia,
                transporte,
                transporte === 'onibus' ? 'diesel' : combustivel,
                transporte === 'onibus' ? Number(process.env.BUS_DIESEL_KM_PER_L || 2.5) : consumo,
                passageiros,
                emissao,
                descricao
            ]
        );

        res.redirect('/deslocamentos?salvo=1');
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Não foi possível salvar o deslocamento.');
    }
});

router.post('/deslocamentos/:id/excluir', exigirLogin, async (req, res) => {
    await pool.execute(
        'DELETE FROM deslocamentos WHERE id = ? AND usuario_id = ?',
        [req.params.id, req.session.usuario.id]
    );

    res.redirect('/deslocamentos');
});

router.get('/impacto', exigirLogin, async (req, res) => {
    const usuarioId = req.session.usuario.id;
    const mesAtual = new Date().toISOString().slice(0, 7);

    try {
        const [resumo] = await pool.execute(
            `SELECT COUNT(*) AS quantidade,
                    COALESCE(SUM(emissao_kg), 0) AS emissao
             FROM deslocamentos
             WHERE usuario_id = ?`,
            [usuarioId]
        );

        const [meta] = await pool.execute(
            'SELECT limite_kg FROM metas WHERE usuario_id = ? AND mes = ?',
            [usuarioId, mesAtual]
        );

        const [compensado] = await pool.execute(
            'SELECT COALESCE(SUM(co2_compensado_kg), 0) AS total FROM compensacoes WHERE usuario_id = ?',
            [usuarioId]
        );

        pagina(req, res, 'impacto', {
            resumo: resumo[0],
            meta: meta.length ? meta[0].limite_kg : null,
            compensado: compensado[0].total,
            mesAtual,
            sucesso: req.query.meta === '1'
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar os dados de impacto.');
    }
});

router.post('/impacto/meta', exigirLogin, async (req, res) => {
    const limite = Number(req.body.limite);
    const mesAtual = new Date().toISOString().slice(0, 7);

    if (limite <= 0) {
        return res.redirect('/impacto');
    }

    await pool.execute(
        `INSERT INTO metas (usuario_id, mes, limite_kg)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE limite_kg = VALUES(limite_kg)`,
        [req.session.usuario.id, mesAtual, limite]
    );

    res.redirect('/impacto?meta=1');
});

router.get('/comparar', exigirLogin, (req, res) => {
    pagina(req, res, 'comparar', {
        resultado: null,
        erro: null,
        valores: null,
        fatores,
        nomesCombustivel
    });
});

router.post('/comparar', exigirLogin, (req, res) => {
    const distancia = Number(req.body.distancia);
    const carroConsumo = Number(req.body.carro_consumo);
    const motoConsumo = Number(req.body.moto_consumo);
    const carroCombustivel = req.body.carro_combustivel;
    const motoCombustivel = req.body.moto_combustivel;
    const passageirosCarro = Math.max(1, Math.min(5, Number(req.body.passageiros_carro) || 1));
    const passageirosMoto = Math.max(1, Math.min(2, Number(req.body.passageiros_moto) || 1));

    if (distancia <= 0 || carroConsumo <= 0 || motoConsumo <= 0 ||
        !fatores[carroCombustivel] || !['gasolina', 'etanol'].includes(motoCombustivel) || !fatores[motoCombustivel]) {
        return pagina(req, res, 'comparar', {
            erro: 'Confira a distância, os consumos e os combustíveis informados.',
            resultado: null,
            valores: req.body,
            fatores,
            nomesCombustivel
        });
    }

    const emissaoCarro = calcularEmissao(distancia, carroConsumo, carroCombustivel);
    const emissaoMoto = calcularEmissao(distancia, motoConsumo, motoCombustivel);
    const porPessoaCarro = emissaoCarro / passageirosCarro;
    const porPessoaMoto = emissaoMoto / passageirosMoto;

    let recomendacao = 'As duas opções tiveram resultados próximos. Considere também a segurança e a quantidade de pessoas no trajeto.';

    if (porPessoaCarro < porPessoaMoto) {
        recomendacao = 'Neste cenário, o carro apresentou menor emissão estimada por pessoa.';
    } else if (porPessoaMoto < porPessoaCarro) {
        recomendacao = 'Neste cenário, a motocicleta apresentou menor emissão estimada por pessoa.';
    }

    pagina(req, res, 'comparar', {
        fatores,
        nomesCombustivel,
        resultado: {
            distancia,
            emissaoCarro,
            emissaoMoto,
            porPessoaCarro,
            porPessoaMoto,
            recomendacao
        },
        valores: req.body
    });
});

router.get('/creditos', exigirLogin, async (req, res) => {
    try {
        const filtros = {
            tipo: req.query.tipo || '',
            busca: (req.query.busca || '').trim(),
            preco: req.query.preco || ''
        };

        let sql = `SELECT creditos.*, usuarios.nome_empresa
                   FROM creditos
                   JOIN usuarios ON usuarios.id = creditos.vendedor_id
                   WHERE creditos.status = 'disponivel'
                   AND creditos.quantidade_disponivel > 0`;
        const valores = [];

        if (filtros.tipo) {
            sql += ' AND creditos.categoria = ?';
            valores.push(filtros.tipo);
        }

        if (filtros.busca) {
            sql += ' AND (creditos.projeto LIKE ? OR creditos.descricao LIKE ?)';
            valores.push(`%${filtros.busca}%`, `%${filtros.busca}%`);
        }

        if (filtros.preco === 'menor') {
            sql += ' ORDER BY creditos.preco ASC';
        } else if (filtros.preco === 'maior') {
            sql += ' ORDER BY creditos.preco DESC';
        } else {
            sql += ' ORDER BY creditos.criado_em DESC';
        }

        const [creditos] = await pool.execute(sql, valores);
        const [categorias] = await pool.execute(
            'SELECT DISTINCT categoria FROM creditos ORDER BY categoria'
        );

        const [historico] = await pool.execute(
            `SELECT historico_precos.*, creditos.projeto
             FROM historico_precos
             JOIN creditos ON creditos.id = historico_precos.credito_id
             ORDER BY historico_precos.criado_em DESC
             LIMIT 10`
        );

        pagina(req, res, 'creditos', {
            creditos,
            filtros,
            historico,
            categorias: categorias.map(item => item.categoria)
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar o mercado de créditos.');
    }
});

router.get('/creditos/anunciar', exigirLogin, (req, res) => {
    if (req.session.usuario.tipo !== 'empresa') {
        req.session.mensagem = 'Somente contas de empresa podem anunciar créditos.';
        return res.redirect('/creditos');
    }

    pagina(req, res, 'anunciar', { erro: null });
});

router.post('/creditos/anunciar', exigirLogin, async (req, res) => {
    if (req.session.usuario.tipo !== 'empresa') {
        return res.redirect('/creditos');
    }

    const projeto = (req.body.projeto || '').trim();
    const categoria = (req.body.categoria || '').trim();
    const descricao = (req.body.descricao || '').trim();
    const quantidade = Number(req.body.quantidade);
    const preco = Number(req.body.preco);
    const compensacao = Number(req.body.compensacao);

    if (!projeto || !categoria || !descricao || quantidade < 1 || preco <= 0 || compensacao <= 0) {
        return pagina(req, res, 'anunciar', {
            erro: 'Preencha todos os campos com valores válidos.'
        });
    }

    const [resultado] = await pool.execute(
        `INSERT INTO creditos
         (vendedor_id, projeto, categoria, descricao, quantidade_disponivel,
          quantidade_inicial, preco, preco_inicial, compensacao_kg, status, demonstracao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'disponivel', 1)`,
        [req.session.usuario.id, projeto, categoria, descricao, quantidade, quantidade, preco, preco, compensacao]
    );

    await pool.execute(
        'INSERT INTO historico_precos (credito_id, preco, tipo_movimento) VALUES (?, ?, ?)',
        [resultado.insertId, preco, 'anúncio inicial']
    );

    res.redirect('/meus-creditos?anuncio=1');
});

router.post('/creditos/:id/comprar', exigirLogin, async (req, res) => {
    const quantidade = Math.floor(Number(req.body.quantidade));

    if (quantidade < 1) {
        return res.redirect('/creditos');
    }

    const conexao = await pool.getConnection();

    try {
        await conexao.beginTransaction();

        const [lista] = await conexao.execute(
            'SELECT * FROM creditos WHERE id = ? AND status = \'disponivel\' FOR UPDATE',
            [req.params.id]
        );

        if (lista.length === 0 || lista[0].quantidade_disponivel < quantidade ||
            lista[0].vendedor_id === req.session.usuario.id) {
            await conexao.rollback();
            req.session.mensagem = 'Não foi possível concluir essa compra. Confira a quantidade disponível.';
            return res.redirect('/creditos');
        }

        const credito = lista[0];
        const total = Number(credito.preco) * quantidade;

        await conexao.execute(
            `UPDATE creditos
             SET status = IF(quantidade_disponivel - ? <= 0, 'esgotado', 'disponivel'),
                 quantidade_disponivel = quantidade_disponivel - ?
             WHERE id = ?`,
            [quantidade, quantidade, credito.id]
        );

        await conexao.execute(
            `INSERT INTO compras
             (usuario_id, credito_id, vendedor_id, quantidade, valor_total)
             VALUES (?, ?, ?, ?, ?)`,
            [req.session.usuario.id, credito.id, credito.vendedor_id, quantidade, total]
        );

        const quantidadeRestante = credito.quantidade_disponivel - quantidade;
        const percentualVendido = 1 - (quantidadeRestante / credito.quantidade_inicial);
        const novoPreco = Number(credito.preco_inicial) * (1 + Math.min(percentualVendido * 0.15, 0.15));

        await conexao.execute(
            'UPDATE creditos SET preco = ? WHERE id = ?',
            [novoPreco, credito.id]
        );

        await conexao.execute(
            'INSERT INTO historico_precos (credito_id, preco, tipo_movimento) VALUES (?, ?, ?)',
            [credito.id, novoPreco, 'atualização demonstrativa por procura']
        );

        await conexao.commit();
        req.session.mensagem = 'Compra demonstrativa registrada no banco de dados.';
        res.redirect('/meus-creditos');
    } catch (erro) {
        await conexao.rollback();
        console.error(erro);
        res.status(500).send('Erro ao registrar a compra.');
    } finally {
        conexao.release();
    }
});

router.get('/meus-creditos', exigirLogin, async (req, res) => {
    try {
        const [compras] = await pool.execute(
            `SELECT compras.*, creditos.projeto, creditos.compensacao_kg,
                    COALESCE((
                        SELECT SUM(compensacoes.quantidade)
                        FROM compensacoes
                        WHERE compensacoes.compra_id = compras.id
                    ), 0) AS quantidade_usada
             FROM compras
             JOIN creditos ON creditos.id = compras.credito_id
             WHERE compras.usuario_id = ?
             ORDER BY compras.criado_em DESC`,
            [req.session.usuario.id]
        );

        const [compensacoes] = await pool.execute(
            `SELECT compensacoes.*, creditos.projeto
             FROM compensacoes
             JOIN creditos ON creditos.id = compensacoes.credito_id
             WHERE compensacoes.usuario_id = ?
             ORDER BY compensacoes.criado_em DESC`,
            [req.session.usuario.id]
        );

        const [anuncios] = await pool.execute(
            'SELECT * FROM creditos WHERE vendedor_id = ? ORDER BY criado_em DESC',
            [req.session.usuario.id]
        );

        const [vendas] = await pool.execute(
            `SELECT compras.*, creditos.projeto
             FROM compras
             JOIN creditos ON creditos.id = compras.credito_id
             WHERE compras.vendedor_id = ?
             ORDER BY compras.criado_em DESC`,
            [req.session.usuario.id]
        );

        pagina(req, res, 'meus-creditos', {
            compras,
            compensacoes,
            anuncios,
            vendas,
            avisoAnuncio: req.query.anuncio === '1'
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar seus créditos.');
    }
});

router.post('/compras/:id/compensar', exigirLogin, async (req, res) => {
    const quantidade = Math.floor(Number(req.body.quantidade));

    if (quantidade < 1) {
        return res.redirect('/meus-creditos');
    }

    const conexao = await pool.getConnection();

    try {
        await conexao.beginTransaction();

        const [compras] = await conexao.execute(
            `SELECT compras.*, creditos.compensacao_kg
             FROM compras
             JOIN creditos ON creditos.id = compras.credito_id
             WHERE compras.id = ? AND compras.usuario_id = ?
             FOR UPDATE`,
            [req.params.id, req.session.usuario.id]
        );

        if (compras.length === 0) {
            await conexao.rollback();
            return res.redirect('/meus-creditos');
        }

        const compra = compras[0];
        const [usados] = await conexao.execute(
            'SELECT COALESCE(SUM(quantidade), 0) AS total FROM compensacoes WHERE compra_id = ?',
            [compra.id]
        );

        const saldo = compra.quantidade - Number(usados[0].total);

        if (quantidade > saldo) {
            await conexao.rollback();
            req.session.mensagem = 'A quantidade informada é maior que seu saldo disponível.';
            return res.redirect('/meus-creditos');
        }

        const co2 = quantidade * Number(compra.compensacao_kg);

        await conexao.execute(
            `INSERT INTO compensacoes
             (usuario_id, compra_id, credito_id, quantidade, co2_compensado_kg)
             VALUES (?, ?, ?, ?, ?)`,
            [req.session.usuario.id, compra.id, compra.credito_id, quantidade, co2]
        );

        await conexao.commit();
        req.session.mensagem = 'Compensação demonstrativa registrada.';
        res.redirect('/meus-creditos');
    } catch (erro) {
        await conexao.rollback();
        console.error(erro);
        res.status(500).send('Erro ao registrar a compensação.');
    } finally {
        conexao.release();
    }
});

router.get('/minha-conta', exigirLogin, (req, res) => {
    pagina(req, res, 'minha-conta');
});

module.exports = router;
