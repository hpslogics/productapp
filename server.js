const express = require('express');
const bodyParser = require('body-parser');
const { sequelize, Product } = require('./models'); // Assuming Product model is defined
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider({
    region: 'ap-south-1' // specify your region
});
const { User } = require('./models'); // Adjust the path according to your project structure

const appClientId = '3sj9a6lhd7nppmrdiv0js1511g';
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Product CRUD API',
        version: '1.0.0',
        description: 'This is a simple CRUD API application made with Express and documented with Swagger',
    },
    servers: [
        {
            url: `http://localhost:${port}`,
            description: 'Development server',
        },
    ],
};

// Options for the swagger docs
const options = {
    swaggerDefinition,
    // Paths to files containing OpenAPI definitions
    apis: ['./server.js'], // Ensure this path points to the file where your routes are defined
};

// Initialize swagger-jsdoc -> returns validated swagger spec in json format
const swaggerSpec = swaggerJSDoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Define routes here using Sequelize models


/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     description: Registers a new user with AWS Cognito and stores user details in the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 description: The user's username
 *               password:
 *                 type: string
 *                 description: The user's password
 *               email:
 *                 type: string
 *                 description: The user's email address
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Error occurred during registration
 */
app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    try {
        // Check if a user with the given email already exists
        const existingUser = await User.findOne({ where: { email: email } });
        if (existingUser) {
            return res.status(409).send({ message: 'User with this email already exists' });
        }

        const response = await signUp(username, password, email);

         // Add user details to the PostgreSQL database
         const newUser = await User.create({
            username: username,
            email: email,
            confirmedAt: null
        });
        res.status(201).send({ message: 'User registered successfully', data: newUser });
    } catch (error) {
        res.status(400).send({ message: 'Failed to register user', error: error.message });
    }
});

/**
 * @swagger
 * /confirm-user:
 *   post:
 *     summary: Confirm a user's account
 *     description: This endpoint confirms a user's account by verifying the code sent to the user's email or phone.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - code
 *             properties:
 *               username:
 *                 type: string
 *                 description: The user's username
 *               code:
 *                 type: string
 *                 description: The verification code sent to the user's email or phone
 *     responses:
 *       200:
 *         description: User confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 data:
 *                   type: object
 *                   description: Additional data if any
 *       400:
 *         description: Failed to confirm user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *                 error:
 *                   type: string
 *                   description: Detailed error information
 */
app.post('/confirm-user', async (req, res) => {
    const { username, code } = req.body;
    const params = {
        ClientId: appClientId, // Replace with your actual app client ID
        Username: username,
        ConfirmationCode: code
    };

    try {
        const response = await cognito.confirmSignUp(params).promise();

         // Update the user's confirmedAt field
         const user = await User.findOne({ where: { username: username } });
         user.confirmedAt = new Date();
         await user.save();

        res.status(200).send({ message: 'User confirmed successfully', data: response });
    } catch (error) {
        res.status(400).send({ message: 'Failed to confirm user', error: error.message });
    }
});


/**
 * @swagger
 * /resend-confirmation-code:
 *   post:
 *     summary: Resend confirmation code
 *     description: Resends the confirmation code to the user's email or phone number.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username of the user to resend the confirmation code to
 *     responses:
 *       200:
 *         description: Confirmation code resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 data:
 *                   type: object
 *                   description: Additional data from Cognito
 *       400:
 *         description: Failed to resend confirmation code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *                 error:
 *                   type: string
 *                   description: Detailed error information
 */
app.post('/resend-confirmation-code', async (req, res) => {
    const { username } = req.body;
    try {
        const response = await resendConfirmationCode(username);
        res.status(200).send({ message: 'Confirmation code resent successfully', data: response });
    } catch (error) {
        res.status(400).send({ message: 'Failed to resend confirmation code', error: error.message });
    }
});


/**
 * @swagger
 * /login:
 *   post:
 *     summary: Authenticate a user
 *     description: This endpoint authenticates a user by their username and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: The user's username
 *               password:
 *                 type: string
 *                 description: The user's password
 *     responses:
 *       200:
 *         description: User authenticated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *       401:
 *         description: Authentication failed
 */
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const response = await signIn(username, password);
        res.status(200).send({ message: 'User logged in successfully', data: response });
    } catch (error) {
        res.status(401).send({ message: 'Login failed', error: error.message });
    }
});

const signUp = async (username, password, email) => {
    const params = {
        ClientId: appClientId, // Replace with your Cognito App Client ID
        Username: username,
        Password: password,
        UserAttributes: [
            {
                Name: 'email',
                Value: email
            }
        ]
    };

    try {
        const signUpResponse = await cognito.signUp(params).promise();
        return signUpResponse;
    } catch (error) {
        throw error;
    }
};

/**
 * @swagger
 * /delete-user/{username}:
 *   delete:
 *     summary: Delete a user by username
 *     description: Deletes a user from the database based on the username.
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         description: Username of the user to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to delete user
 */
app.delete('/delete-user/:username', async (req, res) => {
    const username = req.params.username;
    try {
        const user = await User.findOne({ where: { username: username } });
        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        await user.destroy();
        res.status(200).send({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).send({ message: 'Failed to delete user', error: error.message });
    }
});



const signIn = async (username, password) => {
    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: appClientId, // Replace with your Cognito App Client ID
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password
        }
    };

    try {
        const signInResponse = await cognito.initiateAuth(params).promise();
        return signInResponse;
    } catch (error) {
        throw error;
    }
};

const resendConfirmationCode = async (username) => {
    const params = {
        ClientId: appClientId, // Replace with your actual app client ID
        Username: username
    };

    try {
        const response = await cognito.resendConfirmationCode(params).promise();
        return response;
    } catch (error) {
        throw error;
    }
};

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


