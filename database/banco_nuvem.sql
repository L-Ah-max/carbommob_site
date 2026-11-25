-- Use este arquivo em um banco na nuvem (ex.: TiDB).
-- Antes de rodar, selecione o banco: USE carbonmob;



CREATE TABLE  usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    tipo ENUM('pessoa', 'empresa') NOT NULL DEFAULT 'pessoa',
    nome_empresa VARCHAR(160) NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE  deslocamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    origem VARCHAR(160) NOT NULL,
    destino VARCHAR(160) NOT NULL,
    distancia_km DECIMAL(10,2) NOT NULL,
    transporte ENUM('carro', 'moto', 'onibus') NOT NULL,
    combustivel VARCHAR(30) NOT NULL,
    consumo_km_l DECIMAL(10,2) NOT NULL,
    passageiros_considerados INT NOT NULL DEFAULT 1,
    emissao_kg DECIMAL(12,4) NOT NULL,
    observacao VARCHAR(255) NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE  creditos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendedor_id INT NOT NULL,
    projeto VARCHAR(160) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    quantidade_disponivel INT NOT NULL,
    quantidade_inicial INT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    preco_inicial DECIMAL(10,2) NOT NULL,
    compensacao_kg DECIMAL(10,2) NOT NULL,
    status ENUM('disponivel', 'pausado', 'esgotado') NOT NULL DEFAULT 'disponivel',
    demonstracao BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE compras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    credito_id INT NOT NULL,
    vendedor_id INT NOT NULL,
    quantidade INT NOT NULL,
    valor_total DECIMAL(12,2) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (credito_id) REFERENCES creditos(id),
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
);

CREATE TABLE  historico_precos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    credito_id INT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    tipo_movimento VARCHAR(60) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (credito_id) REFERENCES creditos(id) ON DELETE CASCADE
);

CREATE TABLE  metas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    mes CHAR(7) NOT NULL,
    limite_kg DECIMAL(10,2) NOT NULL,
    UNIQUE KEY meta_usuario_mes (usuario_id, mes),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Exemplos de anúncios podem ser cadastrados por uma conta de empresa pela própria tela.
-- Os anúncios criados no ambiente escolar ficam identificados como demonstrativos.

CREATE TABLE  compensacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    compra_id INT NOT NULL,
    credito_id INT NOT NULL,
    quantidade INT NOT NULL,
    co2_compensado_kg DECIMAL(12,2) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (compra_id) REFERENCES compras(id),
    FOREIGN KEY (credito_id) REFERENCES creditos(id)
);
