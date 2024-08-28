const signUp = async (username, password, email) => {
    const params = {
        ClientId: '3sj9a6lhd7nppmrdiv0js1511g', // Replace with your Cognito App Client ID
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

const signIn = async (username, password) => {
    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: '3sj9a6lhd7nppmrdiv0js1511g', // Replace with your Cognito App Client ID
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
