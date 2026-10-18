import React from 'react';
import { createRoot } from 'react-dom/client';
import SocialUniverse from './social/SocialUniverse.tsx';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><SocialUniverse/></React.StrictMode>);
