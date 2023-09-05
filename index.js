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
    const username_query = `SELECT *
                            FROM olmsp.users_info
                            WHERE name = '${username}'`;
    const email_query = `SELECT *
                         FROM olmsp.users_info
                         WHERE email = '${email}'`;

    try {

        const username_result = await query(username_query);
        const email_result = await query(email_query);
        const emailInfo = await verifyEmail(email);

        console.log(username_result, email_result)
        if (username_result.length > 0) {
            res.status(400).send('Username already exists');
        } else if (email_result.length > 0) {
            res.status(400).send('Email already exists');
        } else
            // Verify the email
        if (emailInfo.smtpCheck !== 'true') {
            res.status(400).send('Invalid email address');
        } else {


            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert the new user into the database
            const insert_query = `INSERT INTO olmsp.users_info (name, email, password)
                                  VALUES ('${username}', '${email}', '${hashedPassword}')`;
            const insert_result = await query(insert_query);
            console.log(insert_result)
            if (insert_result.affectedRows === 1) {
                res.status(201).send('User registered');
            } else {
                res.status(400).send('Could not register user');
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


        function verifyEmail(email) {
            return new Promise((resolve, reject) => {
                verifier.verify(email, (err, info) => {
                    console.log(err, info);
                    if (err) {
                        reject(JSON.stringify(err));
                    } else {
                        resolve(info);
                    }
                });
            });
        }