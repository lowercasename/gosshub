import React, { useEffect, useState } from "react";
import ReactDOM from 'react-dom';
import store from './logic/store';
import { useSelector, useDispatch } from 'react-redux';
import { Provider } from 'react-redux';
import { Link, Route } from "wouter";
import ProtectedRoute from './ProtectedRoute';
import UnauthedRoute from './UnauthedRoute';
import Login from './login';
import Home from './home';
import User from './User';
import SingleDocument from './SingleDocument';
import { apiCall } from './util';
import './scss/style.scss';
import 'react-tippy/dist/tippy.css';

const App = () => {
    const [ loading, setLoading ] = useState(true);
    const loggedIn = useSelector(state => state.loggedIn);
    const dispatch = useDispatch();
    // Check if we're currently authenticated by making a dummy call to /user
    useEffect(() => {
        apiCall('/user', true)
            .then(() => (dispatch({ type: 'auth/login' }), setLoading(false))) 
            .catch(() =>  (dispatch({ type: 'auth/logout' }), setLoading(false)))
    }, []);

    if (loading) {
        return (
            <div id="app">
                <header id="app__header">
                    <h1><Link to="/">GossHub</Link></h1>
                </header>
            </div>
        )
    } else {
        return (
            <div id="app">
                <header id="app__header">
                    <h1><Link to="/">GossHub</Link></h1>
                    <nav>
                        {!loading && !loggedIn && 
                            <>
                                <Link href="/login">Login</Link>
                                <Link href="/register">Register</Link>
                            </>
                        }
                        <Link href="/about">About</Link>
                        {!loading && loggedIn && 
                            <>
                                <Link href="/account">Account</Link>
                            </>
                        }
                    </nav>
                </header>

                <Route path="/"><Home /></Route>
                <UnauthedRoute path="/login"><Login /></UnauthedRoute>
                <UnauthedRoute path="/register">Register!</UnauthedRoute>
                <Route path="/document/:uuid">{(params) => <SingleDocument uuid={params.uuid} />}</Route>
                <ProtectedRoute path="/user/:username">{(params) => <User username={params.username} />}</ProtectedRoute>
                <ProtectedRoute path="/document/:uuid/edit">{(params) => <SingleDocument uuid={params.uuid} edit={true} />}</ProtectedRoute>
            </div>
        )
    }
}

                // <ProtectedRoute path="/home"><Home /></ProtectedRoute>

const domContainer = document.querySelector('#app');
ReactDOM.render(<Provider store={store}><App /></Provider>, domContainer);
