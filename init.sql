-- Define o banco com charset e collation que suportam acentuação e emojis
DROP DATABASE IF EXISTS kelvinbistrodb;
CREATE DATABASE IF NOT EXISTS kelvinbistrodb;

USE kelvinbistrodb;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE kelvinbistrodb;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

-- Tabela de Ingredientes Avulsos
CREATE TABLE ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL
);

-- Tabela de Marmitas Prontas
CREATE TABLE pre_made_marmitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL
);

-- Nova estrutura para a Tabela de Pedidos
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Aberto'
);

INSERT INTO users (username, password)
VALUES ('admin', '$2b$10$pruL9KbP9g53ynqX5BKv3OywVD6c3xS9sIxbmI489NLEJWo7g5li6');

INSERT INTO pre_made_marmitas (name, description, price) VALUES
    ('Marmita Tradicional', 'O clássico arroz e feijão fresquinhos, acompanhados de um suculento bife acebolado e batata frita crocante.', 24.50),
    ('Marmita de Panela', 'Delicioso arroz e feijão, servidos com carne de panela desfiada ao molho e purê de batatas.', 26.00),
    ('Marmita Frango Fit', 'Arroz e feijão bem temperados, com filé de peito de frango grelhado e mix de legumes no vapor.', 21.00),
    ('Marmita Caipira', 'Arroz e feijão com gostinho de fazenda, sobrecoxa de frango assada e polenta cremosa.', 22.50),
    ('Marmita Vegana Proteica', 'Arroz e feijão com tempero caseiro, hambúrguer de grão-de-bico assado e couve refogada ao alho.', 23.50),
    ('Marmita Veggie Strogonoff', 'Arroz e feijão, acompanhados de um rico estrogonofe de cogumelos frescos com creme vegetal e batata palha.', 25.00);

INSERT INTO ingredients (name, category, price) VALUES
    ('Arroz Branco', 'Base', 4.00),
    ('Feijão', 'Base', 4.50),
    ('Bife Acebolado', 'Proteína', 10.00),
    ('Carne de Panela Desfiada', 'Proteína', 11.50),
    ('Filé de Peito de Frango Grelhado', 'Proteína', 8.00),
    ('Sobrecoxa de Frango Assada', 'Proteína', 9.00),
    ('Hambúrguer de Grão-de-bico', 'Proteína', 9.50),
    ('Estrogonofe de Cogumelos', 'Proteína', 12.00),
    ('Batata Frita', 'Acompanhamento', 6.00),
    ('Purê de Batatas', 'Acompanhamento', 6.00),
    ('Mix de Legumes no Vapor', 'Acompanhamento', 4.50),
    ('Polenta Cremosa', 'Acompanhamento', 5.00),
    ('Couve Refogada ao Alho', 'Acompanhamento', 3.50),
    ('Batata Palha', 'Acompanhamento', 4.50);
