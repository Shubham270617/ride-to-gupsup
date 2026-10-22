import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import HomeCanvas from './HomeCanvas';
import '../../index.css';
import '../../styles/lab.css';
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/']}><HomeCanvas /></MemoryRouter>);
