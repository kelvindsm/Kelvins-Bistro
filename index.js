const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const mysql = require('mysql2/promise'); 

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==========================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// ==========================================
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'marmitadb',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function connectWithRetry() {
    let retries = 5;
    while (retries > 0) {
        try {
            const connection = await pool.getConnection();
            console.log('✅ Conectado ao banco de dados com sucesso!');
            connection.release();
            return;
        } catch (err) {
            console.error(`⏳ Erro ao conectar no banco. Tentativas restantes: ${retries - 1}`);
            console.error(`Motivo: ${err.message}`);
            retries -= 1;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    throw new Error('❌ Não foi possível conectar ao banco de dados após várias tentativas.');
}

// ==========================================
// FUNÇÕES E ROTAS DA APLICAÇÃO
// ==========================================

// Função para validar entrada de dados
function validateInput(data) {
    const { username, password, price } = data;

    if (!username || username.trim() === '') {
        return { valid: false, message: 'O nome de usuário não pode estar vazio.' };
    }

    if (price !== undefined && (isNaN(price) || price <= 0)) {
        return { valid: false, message: 'O preço deve ser um número positivo.' };
    }

    if (!password || password.trim() === '') {
        return { valid: false, message: 'A senha não pode estar vazia.' };
    }

    return { valid: true };
}

app.get('/', (req, res) => res.render('login'));

app.get('/register', (req, res) => res.render('register'));

// Rota para cadastro de usuário com validação
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const saltRounds = 10;

    // Validação dos dados de entrada
    const validation = validateInput({ username, password });
    if (!validation.valid) {
        return res.status(400).send(validation.message);
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.send('Usuário criado com sucesso! <a href="/">Fazer Login</a>');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao criar usuário.');
    }
});

// Rota para login com validação
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Validação dos dados de entrada
    const validation = validateInput({ username, password });
    if (!validation.valid) {
        return res.status(400).send(validation.message);
    }

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(400).send('Usuário não encontrado.');
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send('Senha inválida.');
        }

        // Redireciona o usuário para o dashboard após o login bem-sucedido
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao realizar login.');
    }
});

app.post('/add-item', async (req, res) => {
    const { name, category, price } = req.body;
    
    if (!name || name.trim() === '') {
        return res.status(400).send("O nome não pode estar vazio.");
    }
    
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).send("O preço deve ser um número positivo.");
    }

    try {
        await pool.query('INSERT INTO items (name, category, price) VALUES (?, ?, ?)', [name, category, numPrice]);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar item.");
    }
});

app.post('/orders', async (req, res) => {
    const { customer_name, item_id } = req.body;
    if (!customer_name || !item_id) {
        return res.status(400).send("Nome do cliente e marmita são obrigatórios.");
    }
    
    try {
        await pool.query('INSERT INTO orders (customer_name, item_id, status) VALUES (?, ?, ?)', [customer_name, item_id, 'Aberto']);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao criar pedido.");
    }
});

app.post('/orders/:id/advance', async (req, res) => {
    const orderId = req.params.id;
    try {
        const [rows] = await pool.query('SELECT status FROM orders WHERE id = ?', [orderId]);
        if (rows.length === 0) return res.status(404).send("Pedido não encontrado");
        
        const currentStatus = rows[0].status;
        let nextStatus = currentStatus;
        
        if (currentStatus === 'Aberto') nextStatus = 'Cozinha';
        else if (currentStatus === 'Cozinha') nextStatus = 'Entrega';
        else if (currentStatus === 'Entrega') nextStatus = 'Entregue';
        
        if (currentStatus !== nextStatus) {
            await pool.query('UPDATE orders SET status = ? WHERE id = ?', [nextStatus, orderId]);
        }
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao atualizar pedido.");
    }
});

app.get('/dashboard', async (req, res) => {
    try {
        const [items] = await pool.query('SELECT * FROM items');
        const [orders] = await pool.query('SELECT orders.*, items.name AS item_name FROM orders LEFT JOIN items ON orders.item_id = items.id');
        res.render('dashboard', { items, orders });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar o dashboard.");
    }
});

// Inicia a aplicação garantindo que o banco está conectado primeiro
connectWithRetry().then(() => {
    app.listen(3000, () => console.log('🚀 MARMITATECH PRO ONLINE NA PORTA 3000'));
}).catch(err => {
    console.error('Falha crítica na inicialização:', err);
    process.exit(1);
});