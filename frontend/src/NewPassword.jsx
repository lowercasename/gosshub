import React, { useState } from "react";
import Message from './components/message';
import { apiCall } from './util';

const NewPassword = () => {
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [message, setMessage] = useState("");
    const [showForm, setShowForm] = useState(true);
    const handleSubmit = (e) => {
        e.preventDefault();
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        apiCall('/new-password', false, 'post', { password, repeat_password: repeatPassword, verification_token: token })
            .then(() => {
                setMessage('Your password has been successfully reset. You can now log in.');
                setShowForm(false);
            })
            .catch(error => setMessage(error.data.message));
    }
    if (!showForm) {
        return <Message text={message} /> 
    }
    return (
        <>
            <h2>New Password</h2>
            <form onSubmit={handleSubmit}>
                <Message text={message} />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                <input type="password" placeholder="Repeat password" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} />
                <input type="submit" className="gh-button" value="Set New Password" />
            </form>
        </>
    );
}

export default NewPassword;
