import { createStore } from 'redux';

const initialState = {
    loggedIn: false,
    user: {},
    jwt: localStorage.getItem('jwt') || false,
    documents: [],
}

const rootReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'jwt/set':
            localStorage.setItem('jwt', action.payload);
            return { ...state, loggedIn: true, jwt: action.payload }
        case 'auth/login':
            return { ...state, loggedIn: true }
        case 'auth/logout':
            localStorage.removeItem('jwt');
            return { ...state, loggedIn: false, jwt: false, user: false }
        case 'user/set':
            return { ...state, user: action.payload }
        case 'documents/set':
            return { ...state, documents: action.payload }
        case 'documents/append':
            return { ...state, documents: [ ...state.documents, ...action.payload ] }
        default:
            return state;
    }
}

const store = createStore(rootReducer);

export default store;
