/* @refresh reload */
import 'beercss/dist/cdn/beer.min.css';
import '@/index.css';

import { render } from 'solid-js/web';
import { App } from '@/components/App.tsx';

// Beer CSS switches themes with a body class, normally set by its JS, which this app doesn't load.
const dark = matchMedia('(prefers-color-scheme: dark)');
const applyScheme = (): void => void (document.body.className = dark.matches ? 'dark' : 'light');
applyScheme();
dark.addEventListener('change', applyScheme);

const root = document.getElementById('root');
if (!root) throw new Error('No root element!');

render(() => <App />, root);
