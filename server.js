// Arquivo principal do servidor CarbonMob.

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');

const authRoutes = require('./routes/auth');
const appRoutes = require('./routes/app');
const pool = require('./config/database');

const app = express();
const sessionStore = new MySQLStore({}, pool);
const PORT = process.env.PORT || 3000;

// No Render o site fica atrás de um proxy HTTPS.
// Sem esta linha o cookie de sessão seguro não funciona e o login não "gruda".
app.set('trust proxy', 1);

// Configura o EJS para montar as páginas HTML.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Permite receber dados enviados pelos formulários.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Arquivos de aparência, imagens e scripts ficam na pasta public.
app.use(express.static(path.join(__dirname, 'public')));

// Guarda a sessão de login enquanto a pessoa usa o sistema.
app.use(session({
    secret: process.env.SESSION_SECRET || 'carbonmob-chave-local-altere-depois',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 8
    }
}));

// Deixa o usuário disponível em todas as páginas EJS.
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    res.locals.mensagem = req.session.mensagem || null;
    delete req.session.mensagem;
    next();
});

app.get('/', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/painel');
    }

    res.redirect('/login');
});

app.use('/', authRoutes);
app.use('/', appRoutes);

// Mostra uma mensagem simples caso uma rota não exista.
app.use((req, res) => {
    res.status(404).send('Página não encontrada. Volte para o CarbonMob.');
});

// Confere a conexão com o banco antes de iniciar o servidor.
async function iniciarServidor() {
    try {
        const conexao = await pool.getConnection();
        console.log('Conexão com o banco de dados realizada.');
        conexao.release();

        app.listen(PORT, () => {
            console.log(`CarbonMob rodando em http://localhost:${PORT}`);
        });
    } catch (erro) {
        console.error('Não foi possível conectar ao MySQL.');
        console.error('Confira o arquivo .env e se o banco foi criado.');
        console.error(erro.message);
        process.exit(1);
    }
}

iniciarServidor();
