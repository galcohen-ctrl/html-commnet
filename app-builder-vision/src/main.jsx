import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

const reviewScreen = new URLSearchParams(location.search).get('review-screen');
if (reviewScreen && window.parent !== window) {
	import('./prototype/reviewGallery.js').then(({ initReviewPhone }) => initReviewPhone(reviewScreen));
} else {
	createRoot(document.getElementById('root')).render(<App />);
}
