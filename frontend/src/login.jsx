import React, { useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from "wouter";
import axios from 'axios';
import Message from './components/message';

const Login = () => {
    const [location, setLocation] = useLocation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errorText, setErrorText] = useState("");
    const dispatch = useDispatch();
    const handleSubmit = (e) => {
        e.preventDefault();
        axios.post('http://127.0.0.1:5000/login', {
            username,
            password
        })
        .then(response => {
            if (response.data.token) {
                dispatch({ type: 'jwt/set', payload: response.data.token });
                setLocation("/"); 
            }
        })
        .catch(error => {
            setErrorText(error.response.data.message);
        })
    }
    return (
        <>
            <h2>Log in</h2>
            <form onSubmit={handleSubmit}>
                <Message text={errorText} />
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                <input type="submit" value="Log in" />
            </form>
        </>
    );
}

export default Login;
