const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const yamlJs = require('yamljs');
const swaggerDocument = yamlJs.load('./swagger.yaml');
const mysql = require('mysql');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const crypto = require('crypto');

require('dotenv').config();

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "qwerty",
    database: 'olmsp'
});

const port = process.env.PORT || 3000;

// Use public folder for static files
app.use(express.static('public'));

// Use the Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware to parse JSON and urlencoded request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// General error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.statusCode || 500;
    res.status(status).send(err.message);
});
// Check if there are matching usernames or emails in the database
const username_query = 'SELECT count(*)  FROM users_info WHERE name = ?';
const email_query = 'SELECT count(*) FROM users_info WHERE email = ?';

//verify data inserted
const verify_account = 'SELECT count(*) FROM users_info WHERE email = ? AND password = ? and name = ?';

// Register endpoint
app.post('/register', async (req, res) => {
    // Get the username, email, password, and confirm password from the request body
    const { username, email, password } = req.body;

    console.log(username, email, password);


    try {
        // Check if the username or email already exists in the database
        const usernameCount = (await usequery(username_query, [username]))[0]['count(*)'];
        const emailCount = (await usequery(email_query, [email]))[0]['count(*)'];




        if (usernameCount > 0) {
            const data = 'Username already exists'
                res.send({data});
            console.log('Username already exists');
        } else if (emailCount > 0) {
            const data = 'Email already exists'
                res.send({data});
            console.log('Email already exists');
        } else {
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert the new user into the database
            const insert_query = 'INSERT INTO users_info (name, email, password) VALUES (?, ?, ?)';
            await connection.query(insert_query, [username, email, hashedPassword]);

            const insertcount = (await usequery (verify_account, [email, hashedPassword, username]))[0]['count(*)'];

            if (insertcount === 1) {
                const data = 'User registered successfully'
                res.send({data});
                console.log('User registered successfully');
            } else {
                const data = 'User registration failed'
                res.send({data});
                console.log('User registration failed');
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});

function usequery (query, params) {
    return new Promise((resolve, reject) => {
        connection.query(query, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

const username_query_login = 'SELECT name, password FROM users_info WHERE name = ?';

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    console.log(username, password);

    try {
        const user_result = await usequery(username_query_login, [username]);

        console.log(user_result[0].name);
        console.log(user_result[0].password);

        if (user_result.length === 0) {
            const data = 'Username or password does not match';
            res.send({ data });
        } else {
            const hashedPassword = user_result[0].password;
            const passwordCorrect = await bcrypt.compare(password, hashedPassword);
            if (passwordCorrect) {
                crypto.randomBytes(64, (err, buf) => {
                    if (err) throw err;
                    const token = buf.toString('hex');
                    const message1 = 'Login successful';
                    // Create an object with the message and token
                    const responseData = { message1, token };

                    // Send the object as the response
                    res.send({responseData});
                });
            } else {
                const data = 'Password does not exist';
                res.send({ data });
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});


// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`App running. Docs at http://localhost:${port}/`);
});
