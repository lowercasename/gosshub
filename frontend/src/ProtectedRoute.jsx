import React from 'react';
import { useSelector } from 'react-redux';
import { Route, Redirect } from 'wouter';

const ProtectedRoute = ({ children, ...rest }) => {
    const loggedIn = useSelector(state => state.loggedIn);

    return (
        <Route {...rest}>
            { loggedIn ? children : <Redirect to="/login" /> }
        </Route>
    )
}

export default ProtectedRoute;
