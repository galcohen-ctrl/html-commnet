import { useEffect } from 'react';
import ConfigPanel from './components/ConfigPanel';
import EditorOverlays from './components/EditorOverlays';
import LevelThreePanel from './components/LevelThreePanel';
import PhonePreview from './components/PhonePreview';
import SetupWizard from './components/SetupWizard';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { installCommentAnchors } from './app/installCommentAnchors';

export default function App() {
  useEffect(() => {
    let disposed = false;
    let disposeComments;
    let disposeCommentAnchors;

    async function initialize() {
      const prototypeModule = await import('./prototype/index.js');
      prototypeModule.initPrototype();
      disposeCommentAnchors = installCommentAnchors();

      const commentsModule = await import('./comments/index.js');
      if (!disposed) {
        disposeComments = commentsModule.initComments?.();
      }
    }

    initialize().catch((error) => {
      console.error('Could not initialize the App Builder prototype', error);
    });

    return () => {
      disposed = true;
      disposeComments?.();
      disposeCommentAnchors?.();
    };
  }, []);

  return (
    <>
      <SetupWizard />
      <TopBar />
      <div className="workspace" data-comment-anchor="app-builder-workspace">
        <Sidebar />
        <ConfigPanel />
        <LevelThreePanel />
        <PhonePreview />
      </div>
      <EditorOverlays />
    </>
  );
}
