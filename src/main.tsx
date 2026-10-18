import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import SocialUniverse from './social/SocialUniverse.tsx';
import './style.css';
const FractureStudy=lazy(()=>import('./planet/FractureStudy.tsx'));
const study=new URLSearchParams(location.search).get('fracture-study')==='1';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Suspense fallback={null}>{study?<FractureStudy/>:<SocialUniverse/>}</Suspense></React.StrictMode>);
