const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

        res.send('Login realizado com sucesso!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao realizar login.');
    }
});

// Exemplo de rota para validar preço de marmita
app.post('/add-marmita', async (req, res) => {
    const { name, price } = req.body;

    // Validação dos dados de entrada
    const validation = validateInput({ username: name, price });
    if (!validation.valid) {
        return res.status(400).send(validation.message);
    }

    try {
        await pool.query('INSERT INTO marmitas (name, price) VALUES (?, ?)', [name, price]);
        res.send('Marmita adicionada com sucesso!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao adicionar marmita.');
    }
});

app.listen(3000, () => console.log('Servidor rodando na porta 3000'));