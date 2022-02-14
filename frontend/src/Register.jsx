import React, { useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from "wouter";
import axios from 'axios';
import Message from './components/message';
import { apiCall } from './util';

const Register = () => {
    const [location, setLocation] = useLocation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [showForm, setShowForm] = useState(true);
    const [email, setEmail] = useState("");
    const [errorText, setErrorText] = useState("");
    const dispatch = useDispatch();
    const handleSubmit = (e) => {
        e.preventDefault();
        apiCall('/user', false, 'post', { username, password, repeat_password: repeatPassword, email })
            .then(response => setShowForm(false))
            .catch(error => setErrorText(error.data.message));
    }
    return (showForm
        ? <>
            <h2>Create account</h2>
            <form onSubmit={handleSubmit}>
                <Message type="error" text={errorText} />
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="Password (minimum 6 characters)" value={password} onChange={e => setPassword(e.target.value)} />
                <input type="password" placeholder="Repeat password" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} />
                <input type="submit" className="gh-button" value="Create account" />
            </form>
        </>
        : <>
            <Message type="success" text={`Your account has been created. Before you can log in, you need to verify your email address using the link that has been sent to ${email}. You can now close this tab. See you soon!`} />
        </>
    );
}

export default Register;
