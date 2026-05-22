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

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100),
    item_id INT,
    status VARCHAR(20) DEFAULT 'Aberto',
    FOREIGN KEY (item_id) REFERENCES items(id)
);

INSERT INTO items (name, category, price) VALUES ('Arroz Branco', 'Base', 15.50), ('Feijão Preto', 'Grão', 12.00);
