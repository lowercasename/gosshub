import React, { useState, useEffect } from 'react';      
import Message from './components/message';
import { apiCall } from './util';

const VerifyEmail = () => {
    const [message, setMessage] = useState(false);
    useEffect(() => {
        console.log(window.location.search);
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        if (token) {
            apiCall('/verify-email', false, 'post', { verification_token: token })
                .then(() => setMessage('Your email has been verified. You can now log in.'))
                .catch(error => setMessage(error.data.message));
        } else {
            return setLocation("/");
        }
    }, []);

    return (
        <Message text={message} />
    )
}

export default VerifyEmail;
