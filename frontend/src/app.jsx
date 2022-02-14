import React, { useEffect, useState } from "react";
import ReactDOM from 'react-dom';
import store from './logic/store';
import { useSelector, useDispatch } from 'react-redux';
import { Provider } from 'react-redux';
import { Link, Route, useLocation } from "wouter";
import ProtectedRoute from './ProtectedRoute';
import UnauthedRoute from './UnauthedRoute';
import Login from './login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import NewPassword from './NewPassword';
import ResetToken from './ResetToken';
import Home from './home';
import User from './User';
import NewDocument from './NewDocument';
import SingleDocument from './SingleDocument';
import Tag from './Tag';
import Account from './Account';
import VerifyEmail from './VerifyEmail';
import Page from './Page';
import AdminPanel from './AdminPanel';
import RecentTags from './components/RecentTags';
import { apiCall, parseJwt } from './util';
import './scss/style.scss';
import 'react-tippy/dist/tippy.css';

const App = () => {
    const [ location, setLocation ] = useLocation();
    const [ loading, setLoading ] = useState(true);
    const [ searchContent, setSearchContent ] = useState('');
    const loggedIn = useSelector(state => state.loggedIn);
    const jwt = useSelector(state => state.jwt);
    const user = useSelector(state => state.user );
    const dispatch = useDispatch();
    // Check if we're currently authenticated by making a dummy call to /user
    useEffect(() => {
        apiCall('/user', true)
            .then(() => {
                dispatch({ type: 'auth/login' });
                setLoading(false);
                if (jwt) dispatch({ type: 'user/set', payload: parseJwt(jwt) });
            }) 
            .catch(() => { dispatch({ type: 'auth/logout' }); setLoading(false); });
    }, []);

    const handleSearch = (query) => {
        setLocation(`/search/${query}`);
    }

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
            <>
                <header id="app__header">
                    <h1><Link to="/">GossHub</Link></h1>
                    <nav>
                        {!loading && !loggedIn && 
                            <>
                                <Link href="/login">Log in</Link>
                                <Link href="/register">Create account</Link>
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
            
                <main id="app__main">
                    <Route path="/"><Home /></Route>
                    <Route path="/search/:query">{(params) => <Home searchQuery={params.query} />}</Route>
                    <UnauthedRoute path="/login"><Login /></UnauthedRoute>
                    <UnauthedRoute path="/register"><Register /></UnauthedRoute>
                    <UnauthedRoute path="/reset-password"><ForgotPassword /></UnauthedRoute>
                    <UnauthedRoute path="/new-password"><NewPassword /></UnauthedRoute>
                    <UnauthedRoute path="/reset-token"><ResetToken /></UnauthedRoute>
                    <ProtectedRoute path="/new"><NewDocument /></ProtectedRoute>
                    <Route path="/document/:uuid">{(params) => <SingleDocument uuid={params.uuid} />}</Route>
                    <Route path="/document/:uuid/hash/:hash">{(params) => <SingleDocument uuid={params.uuid} hash={params.hash} />}</Route>
                    <ProtectedRoute path="/document/:uuid/edit">{(params) => <SingleDocument uuid={params.uuid} edit={true} />}</ProtectedRoute>
                    <ProtectedRoute path="/user/:username">{(params) => <User username={params.username} />}</ProtectedRoute>
                    <Route path="/tag/:slug">{(params) => <Tag slug={params.slug} />}</Route>
                    <ProtectedRoute path="/account"><Account /></ProtectedRoute>
                    <UnauthedRoute path="/verify-email"><VerifyEmail /></UnauthedRoute>
                    <Route path="/about"><Page slug="about" /></Route>
                    <ProtectedRoute path="/admin" admin={true}><AdminPanel /></ProtectedRoute>
                </main>

                <aside id="app__sidebar">
                    <h2>Recent tags</h2>
                    <RecentTags />
                    { loggedIn &&
                        <>
                            <h2>Search</h2>
                            <input type="text" value={searchContent} onChange={(e) => setSearchContent(e.currentTarget.value)} placeholder="Search documents" onKeyPress={(e) => e.key === 'Enter' && handleSearch(e.currentTarget.value)}/>
                        </>
                    }
                </aside>
            </>
        )
    }
}

const domContainer = document.querySelector('#app');
ReactDOM.render(<Provider store={store}><App /></Provider>, domContainer);
