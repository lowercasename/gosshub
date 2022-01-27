'use strict';

var axios = require('axios');

var e = React.createElement;

var App = function App() {
    return React.createElement(
        'p',
        null,
        'Hello world!'
    );
};

var domContainer = document.querySelector('#app');
ReactDOM.render(React.createElement(App, null), domContainer);