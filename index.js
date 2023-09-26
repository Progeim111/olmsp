const express = require('express');
const app = express();
const verifier = require('@gradeup/email-verify')
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

// Serve static files
app.use(express.static('public'));

// Use the Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware to parse JSON and urlencoded request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// General error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.statusCode || 500;
    res.status(status).send(err.message);
});

// Register endpoint
app.post('/register', async (req, res) => {
    // Get the username, email, password and confirm password from the request body
    const {username, email, password} = req.body;


    console.log(username, email, password)
    // Check if there are matching usernames or emails in the database
    const username_query = 'SELECT name FROM olmsp.users_info WHERE name = ?';
    const email_query = 'SELECT email FROM olmsp.users_info WHERE email = ?';



    try {


        const email_result = await connection.query(email_query, [email]);
        const username_result = await connection.query(username_query, [username]);

        if (username_result.length > 0) {
            res.send('Username already exists');
            console.log(username_result)
        } else if (email_result.length > 0) {
            res.send('Email already exists');
            console.log(email_result)
        }  else {


            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert the new user into the database
            const insert_query = 'INSERT INTO olmsp.users_info (name, email, password) VALUES (?, ?, ?)';
            const insert_result = await connection.query(insert_query, [username, email, hashedPassword]);
            if (insert_result.affectedRows === 1) {
                res.status(202).send('User registered');
            } else {
                res.status(400).send('Could not register user');
            }

        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
})


app.post('/login', async (req, res) => {
    const {username, password} = req.body;

    const username_query = 'SELECT name FROM olmsp.users_info WHERE name = ?';
    const password_query = 'SELECT password FROM olmsp.users_info WHERE name = ?';

    try {
        const username_result = await connection.query(username_query, [username]);
        const password_result = await connection.query(password_query, [username]);


        if (username_result.length === 0) {
            res.status(400).send('Username or password does not exist');
        } else {
            const hashedPassword = password_result[0].password;
            const passwordCorrect = await bcrypt.compare(password, hashedPassword);
            if (passwordCorrect) {
                crypto.randomBytes(64, (err, buf) => {
                    if (err) throw err;
                    const token = buf.toString('hex');
                    res.status(201).send(token);
                });
            } else {
                res.status(400).send('Password does not exist');
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }

})
// Serve the HTML file
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });


        app.listen(port, () => {
            console.log(`App running. Docs at http://localhost:${port}/`);
        });
