import store from './logic/store';
import axios from 'axios';

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
        if (authorize) store.dispatch({ type: 'auth/logout' });
        throw error.response;
    }
};
