import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
const root=document.getElementById('root')!;
const tree=<React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>;
if(root.querySelector('main'))hydrateRoot(root,tree);else createRoot(root).render(tree);
