// Conexão com o MySQL usando as informações do arquivo .env.

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    // Bancos na nuvem (como o TiDB) exigem conexão segura.
    // Para ligar, coloque DB_SSL=true no .env ou nas variáveis do Render.
    ssl: process.env.DB_SSL === 'true'
        ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
        : undefined,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true
});

module.exports = pool;
