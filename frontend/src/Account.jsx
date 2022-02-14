import React, { useState, useEffect } from 'react';
import { apiCall } from './util';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'wouter';

const AccountField = ({ fieldKey, label, content }) => {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(content);

    const labelToTypeMap = {
        'Username': 'text',
        'Password': 'password',
        'Email': 'email',
    };

    const updateField = () => {
        if (value.trim() === content.trim()) return setEditing(false);
        apiCall('/user', true, 'put', { [fieldKey]: value })
            .then(() => window.location.reload());
    }

    return (
        <div className='account__field'>
            <div className='account__field__label'>{ label }</div> 
            { !editing && <div className='account__field__content'>{ content }</div> }
            { editing && <input className='account__field__input' type={labelToTypeMap[label]} value={value} onChange={(e) => setValue(e.target.value)} /> }
            <div className='account__field__controls'>
                { editing && <button className='gh-button' onClick={updateField}><i className="far fa-check"></i></button> }
                <button className="gh-button" onClick={() => setEditing(!editing)}><i className={editing ? 'far fa-times' : 'far fa-pencil'}></i></button>
            </div>
        </div>
    );
}

const Account = () => {
    const [location, setLocation] = useLocation();
    const [user, setUser] = useState(false);
    const dispatch = useDispatch();
    const username = useSelector(state => state.user.username);

    const logOut = () => dispatch({ type: 'auth/logout' });
    const deleteAccount = () => { apiCall('/user', true, 'delete').then(() => { dispatch({ type: 'auth/logout' }); setLocation('/') }); }
    
    useEffect(() => {
        if (!username) return;
        apiCall(`/user?username=${username}`, true)
            .then(data => setUser(data[0])) 
            .catch(() => false)
    }, [username]);
    return (
        <>
            <h2>Account</h2>
            <div className="padded-rows">
                { user &&
                    <>
                        <AccountField label='Username' fieldKey='username' content={user.username} />
                        <AccountField label='Email address' fieldKey='email' content={user.email} />
                        <AccountField label='Password' fieldKey='password' content='Hidden' />
                    </>
                }
                <button className='gh-button' onClick={logOut}>Log out</button>
                <button className='gh-button gh-button--danger' onClick={deleteAccount}>Delete account</button>
            </div>
        </>
    )
}

export default Account;
