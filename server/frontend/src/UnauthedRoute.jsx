import React from 'react';
import { useSelector } from 'react-redux';
import { Route, Redirect } from 'wouter';

const UnauthedRoute = ({ children, ...rest }) => {
    const loggedIn = useSelector(state => state.loggedIn);

    return (
        <Route {...rest}>
            { !loggedIn ? children : <Redirect to="/" /> }
        </Route>
    )
}

export default UnauthedRoute;
