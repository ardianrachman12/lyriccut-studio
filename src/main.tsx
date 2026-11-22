import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import LyricGeneratorPage from './app/LyricGeneratorPage.tsx';
import './index.css';

const isLyricsRoute = () => window.location.hash.startsWith('#/lyrics');

// Both pages stay mounted so studio state (video, captions) survives switching pages.
function Root() {
  const [lyricsRoute, setLyricsRoute] = useState(isLyricsRoute);

  useEffect(() => {
    const onHashChange = () => setLyricsRoute(isLyricsRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <>
      <div hidden={lyricsRoute}>
        <App />
      </div>
      <div hidden={!lyricsRoute}>
        <LyricGeneratorPage />
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
