import overlaysHtml from '../templates/editor-overlays.html?raw';

export default function EditorOverlays() {
  return <div dangerouslySetInnerHTML={{ __html: overlaysHtml }} />;
}
