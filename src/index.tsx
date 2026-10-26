/* @refresh reload */
import '@/index.css';

import { render } from 'solid-js/web';
import { App } from '@/components/App.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('No root element!');

render(() => <App />, root);
