import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import './index.css';

const isResizeObserverLoop = (msg) =>
    typeof msg === 'string' && msg.indexOf('ResizeObserver loop') !== -1;

window.addEventListener(
    'error',
    (e) => {
        if (isResizeObserverLoop(e.message)) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    },
    true,
);

const origError = console.error;
console.error = (...args) => {
    if (isResizeObserverLoop(args[0])) return;
    origError(...args);
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Provider store={store}>
            <App />
        </Provider>
    </React.StrictMode>,
);