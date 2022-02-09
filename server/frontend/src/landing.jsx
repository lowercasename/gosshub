import React, { useEffect } from "react";
import { useSelector } from 'react-redux';
import { Redirect } from "wouter";
// import { apiCall } from './util';

const Landing = () => {
    // const [_, setLocation] = useLocation();
    // useEffect(() => {
    //     apiCall('/user', true)
    //         .then(_ => {
    //             setLocation('/home');
    //         });
    // }, []);
    // If we have a JWT token saved, we're going to try and redirect to the home page
    // This doesn't mean we're actually authenticated - if the JWT isn't valid, the 
    // home page will redirect us straight back to login!
    const jwt = useSelector(state => state.jwt);
    // console.log(isLoggedIn);
    
    return ( <p><strong>GossHub is a collaborative store of knowledge.</strong></p> )
        
    // return (jwt
    //     ? <Redirect to="/home" />
    //     : <p><strong>GossHub is a collaborative store of knowledge.</strong></p>
    // )
};

export default Landing;
