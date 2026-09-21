import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
const root = document.getElementById('root')!;
const tree = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

const prerenderUrl = root.getAttribute('data-prerender-url');
const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
const expectedPath = prerenderUrl ? (prerenderUrl.replace(/\/$/, '') || '/') : null;

// Only hydrate if we have prerendered content and the current URL matches the prerendered route
if (root.querySelector('main') && expectedPath && expectedPath === currentPath) {
  hydrateRoot(root, tree);
} else {
  createRoot(root).render(tree);
}
