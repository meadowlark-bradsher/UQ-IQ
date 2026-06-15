import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { DataProviderProvider } from './data/context';
import { App } from './App';
import './index.css';
import 'katex/dist/katex.min.css';

// HashRouter: GitHub Pages has no server rewrites, so hash routing avoids the
// deep-link 404 problem entirely (spec §5) — no public/404.html needed.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProviderProvider>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </HashRouter>
    </DataProviderProvider>
  </StrictMode>,
);
