// Impede que uma pessoa acesse as páginas internas sem fazer login.

function exigirLogin(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }

    next();
}

module.exports = exigirLogin;
