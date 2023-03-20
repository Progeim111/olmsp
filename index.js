const express = require('express');
const app = express();
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
app.use(bodyParser.urlencoded({ extended: false }));

// General error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.statusCode || 500;
    res.status(status).send(err.message);
});

// Register endpoint
app.post('/users', (req, res) => {
    // Get the required information from the request body
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body['confirm-password'];

    // Perform validation checks
    if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email structure
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Email address is invalid' });
    }

    // Validate username length
    if (username.length < 6 || username.length > 12) {
        return res.status(400).json({ message: 'Username must be between 6 and 12 characters long' });
    }

    // Validate password length and format
    if (password.length < 6 || password.length > 20) {
        return res
            .status(400)
            .json({ message: 'Password must be between 6 and 20 characters long' });
    }


    if (!/\d/.test(password)) {
        return res.status(400).json({ message: 'Password must contain at least one number' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Hash the password
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error hashing password' });
        }




// Check if the database is connected
        connection.connect((err) => {
            if (err) {
                console.error('Error connecting to the database: ' + err.stack);
                return res.status(500).json({ message: 'Error connecting to the database' });
            }
            console.log('Connected to the database as ID ' + connection.threadId);

            // Perform the account creation and database storage code here
            const sql = 'INSERT INTO olmsp.users_info (name, email, password) VALUES (?, ?, ?)';
            const values = [username, email, hashedPassword];
            connection.query(sql, values, (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ message: 'Database error' });
                }
                console.log('New user added to the database:', results);
                return res.status(201).json({ message: 'Account created successfully' });
            })
    });
    });
});



// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`App running. Docs at http://localhost:${port}/`);
});