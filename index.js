const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const mysql = require('mysql2/promise'); 

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/img', express.static('img'));

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
// FUNÇÕES AUXILIARES
// ==========================================

// Função para validar entrada de dados (Login/Registro)
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

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================

// Ajustamos o GET para sempre passar a variável error (inicialmente nula)
app.get('/', (req, res) => res.render('login', { error: null }));

app.get('/register', (req, res) => res.render('register'));

// Rota para cadastro de usuário com validação
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const saltRounds = 10;

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

// Rota para login com validação e retorno na mesma tela
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const validation = validateInput({ username, password });
    if (!validation.valid) {
        // Renderiza a tela de login passando o erro
        return res.render('login', { error: validation.message });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            // Retorna para a tela de login com o erro
            return res.render('login', { error: 'Usuário não encontrado.' });
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            // Retorna para a tela de login com o erro
            return res.render('login', { error: 'Senha incorreta. Tente novamente.' });
        }

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        return res.render('login', { error: 'Erro interno ao realizar login.' });
    }
});

// ==========================================
// CADASTRO DE CARDÁPIO (DASHBOARD)
// ==========================================

// Rota para cadastrar um Ingrediente
app.post('/add-ingredient', async (req, res) => {
    const { name, category, price } = req.body;
    
    if (!name || name.trim() === '') return res.status(400).send("O nome não pode estar vazio.");
    
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) return res.status(400).send("O preço deve ser válido.");

    try {
        await pool.query('INSERT INTO ingredients (name, category, price) VALUES (?, ?, ?)', [name, category, numPrice]);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar ingrediente.");
    }
});

// Rota para cadastrar uma Marmita Pronta
app.post('/add-premade', async (req, res) => {
    const { name, description, price } = req.body;
    
    if (!name || name.trim() === '') return res.status(400).send("O nome não pode estar vazio.");
    
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) return res.status(400).send("O preço deve ser válido.");

    try {
        await pool.query('INSERT INTO pre_made_marmitas (name, description, price) VALUES (?, ?, ?)', [name, description, numPrice]);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar marmita pronta.");
    }
});

// ==========================================
// GESTÃO DE PEDIDOS E KANBAN
// ==========================================

app.post('/orders', async (req, res) => {
    const { customer_name, order_type, premade_id } = req.body;
    const ingredient_ids = req.body.ingredient_ids;

    if (!customer_name) return res.status(400).send("Nome do cliente é obrigatório.");

    let description = '';
    let total_price = 0;

    try {
        if (order_type === 'pronta') {
            if (!premade_id) return res.status(400).send("Selecione uma marmita pronta.");
            
            // Adicionado a busca do campo "description"
            const [rows] = await pool.query('SELECT name, description, price FROM pre_made_marmitas WHERE id = ?', [premade_id]);
            if (rows.length > 0) {
                // Modificado para concatenar o nome da marmita com a composição dela
                description = `Marmita Pronta: ${rows[0].name} (${rows[0].description || 'Sem descrição'})`;
                total_price = parseFloat(rows[0].price);
            }
        } else if (order_type === 'personalizada') {
            if (!ingredient_ids) return res.status(400).send("Selecione pelo menos um ingrediente.");
            
            const ids = Array.isArray(ingredient_ids) ? ingredient_ids : [ingredient_ids];
            const placeholders = ids.map(() => '?').join(',');
            const [rows] = await pool.query(`SELECT name, price FROM ingredients WHERE id IN (${placeholders})`, ids);
            
            description = `Personalizada: ${rows.map(r => r.name).join(', ')}`;
            total_price = rows.reduce((sum, item) => sum + parseFloat(item.price), 0);
        }

        await pool.query(
            'INSERT INTO orders (customer_name, description, total_price, status) VALUES (?, ?, ?, ?)', 
            [customer_name, description, total_price, 'Aberto']
        );
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao processar o pedido.");
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

// Rota para exportar o relatório de vendas em CSV
app.get('/admin/export', async (req, res) => {
    try {
        // ATENÇÃO: Se a sua coluna de data tiver outro nome (ex: 'data_pedido'), 
        // substitua 'created_at' aqui e no loop forEach abaixo.
        const [orders] = await pool.query(`
            SELECT id, customer_name, description, total_price, created_at 
            FROM orders 
            ORDER BY created_at ASC
        `);

        // Cabeçalho do arquivo CSV
        let csvContent = "ID do Pedido;Cliente;Itens Pedidos;Valor Total (R$);Data do Pedido\n";

        // Preenche o conteúdo com os dados
        orders.forEach(order => {
            const dateFormatted = order.created_at ? new Date(order.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false }).replace(',', '') : 'Sem data';
            const cleanDescription = order.description ? order.description.replace(/[\n\r;]/g, ' ') : 'Marmita sem descrição';
            const cleanCustomer = order.customer_name ? order.customer_name.replace(/[\n\r;]/g, ' ') : 'Não informado';
            const totalPrice = order.total_price ? parseFloat(order.total_price).toFixed(2) : '0.00';

            csvContent += `${order.id};${cleanCustomer};${cleanDescription};${totalPrice};${dateFormatted}\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=relatorio_vendas_marmitatech.csv');

        // BOM para manter acentuação correta no Excel
        const BOM = "\uFEFF";
        res.send(BOM + csvContent);

    } catch (error) {
        console.error("Erro detalhado ao exportar o relatório:", error);
        // Agora o erro exato do banco de dados aparecerá na sua tela para facilitar o debug
        res.status(500).send(`Erro interno ao gerar o arquivo de relatório. Detalhe do erro: ${error.message}`);
    }
});

// ==========================================
// CARREGAMENTO DO DASHBOARD PRINCIPAL
// ==========================================

app.get('/dashboard', async (req, res) => {
    try {
        const [ingredients] = await pool.query('SELECT * FROM ingredients');
        const [preMadeMarmitas] = await pool.query('SELECT * FROM pre_made_marmitas');
        const [orders] = await pool.query('SELECT * FROM orders ORDER BY id ASC');
        
        res.render('dashboard', { ingredients, preMadeMarmitas, orders });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar o dashboard.");
    }
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================

connectWithRetry().then(() => {
    app.listen(3000, () => console.log('🚀 MARMITATECH PRO ONLINE NA PORTA 3000'));
}).catch(err => {
    console.error('Falha crítica na inicialização:', err);
    process.exit(1);
});