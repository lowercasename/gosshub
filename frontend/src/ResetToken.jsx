import React, { useState } from "react";
import Message from './components/message';
import { apiCall } from './util';

const ResetToken = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [showForm, setShowForm] = useState(true);
    const handleSubmit = (e) => {
        e.preventDefault();
        apiCall('/reset-token', false, 'post', { email })
            .then(() => {
                setMessage('If the email address you supplied matches a GossHub account, a verification token reset link has been sent to it. You can now close this tab.');
                setShowForm(false);
            })
            .catch(error => setMessage(error.data.message));
    }
    if (!showForm) {
        return <Message text={message} /> 
    }
    return (
        <>
            <h2>Reset Verification Token</h2>
            <form onSubmit={handleSubmit}>
                <Message text={message} />
                <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
                <input type="submit" className="gh-button" value="Reset Token" />
            </form>
        </>
    );
}

export default ResetToken;
