import store from './logic/store';
import axios from 'axios';

export const parseJwt = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
};


export const apiCall = async (route, authorize = false, method = 'get', payload = {}) => {
    const state = store.getState();
    method = method.toLowerCase().trim();
    const server = 'http://127.0.0.1:5000';
    const dataRoutes = ['post', 'put'];
    const jwt = authorize ? state.jwt : undefined;
    try {
        const response = await axios({
            method,
            url: server + route,
            data: dataRoutes.includes(method) ? payload : undefined,
            headers: authorize ? { 'Authorization': `Bearer ${jwt}` } : undefined,
        });
        if (authorize) store.dispatch({ type: 'auth/login' });
        return response.data;
    } catch(error) {
        if (error.status === 401) {
            console.log('Logging out util'); 
            store.dispatch({ type: 'auth/logout' })
        };
        throw error.response;
    }
};
