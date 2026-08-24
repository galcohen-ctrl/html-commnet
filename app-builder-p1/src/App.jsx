import { useEffect } from 'react';
import ConfigPanel from './components/ConfigPanel';
import EditorOverlays from './components/EditorOverlays';
import LevelThreePanel from './components/LevelThreePanel';
import PhonePreview from './components/PhonePreview';
import WelcomeModal from './components/WelcomeModal';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import TopBar from './components/TopBar';

export default function App() {
  useEffect(() => {
    import('./prototype/index.js')
      .then((prototypeModule) => prototypeModule.initPrototype())
      .catch((error) => {
        console.error('Could not initialize the App Builder prototype', error);
      });
  }, []);

  return (
    <>
      <TopBar />
      <div className="workspace" data-comment-anchor="app-builder-workspace">
        <Sidebar />
        <ConfigPanel />
        <LevelThreePanel />
        <PhonePreview />
      </div>
      <EditorOverlays />
      <SettingsModal />
      <WelcomeModal />
    </>
  );
}
