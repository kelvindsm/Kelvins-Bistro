const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();

const dbConfig = {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'marmitadb'
};

let pool;

async function connectWithRetry() {
    console.log('🔍 [INFRA] Tentando conectar ao MySQL...');
    for (let i = 1; i <= 10; i++) {
        try {
            pool = mysql.createPool(dbConfig);
            await pool.query('SELECT 1');
            console.log('✅ [DATABASE] Conectado ao MySQL com sucesso!');
            return;
        } catch (err) {
            console.log(`⚠️ [DATABASE] Tentativa ${i}/10 falhou. Aguardando...`);
            await new Promise(res => setTimeout(res, 3000));
        }
    }
    process.exit(1);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => res.render('login'));

app.get('/register', (req, res) => res.render('register'));
// NOVA ROTA: Cadastro de usuário com senha criptografada
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const saltRounds = 10; 

    try {
        const pwd_Password = await bcrypt.hash(password, saltRounds);
        await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, pwd_Password]);
        res.send('Usuário criado com sucesso! <a href="/">Fazer Login</a>');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao criar usuário.");
    }
});

// ROTA ATUALIZADA: Login verificando o hash da senha
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (rows.length > 0) {
            const user = rows[0];
            const match = await bcrypt.compare(password, user.password);
            
            if (match) {
                res.redirect('/dashboard');
            } else {
                res.send('<h1>Login Inválido</h1><a href="/">Voltar</a>');
            }
        } else {
            res.send('<h1>Login Inválido</h1><a href="/">Voltar</a>');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro no banco.");
    }
});

// Removed redundant /login route without bcrypt

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
    const [items] = await pool.query('SELECT * FROM items');
    const [orders] = await pool.query('SELECT orders.*, items.name AS item_name FROM orders LEFT JOIN items ON orders.item_id = items.id');
    res.render('dashboard', { items, orders });
});

connectWithRetry().then(() => {
    app.listen(3000, () => console.log('🚀 MARMITATECH PRO ONLINE NA PORTA 3000'));
});
