import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Application root element is missing.');

createRoot(rootElement).render(<App />);
