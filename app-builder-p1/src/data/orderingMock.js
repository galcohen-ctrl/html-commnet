/**
 * Mock data for the online-ordering widgets on the App Builder P1 prototype.
 *
 * Photos are royalty-free hotlinks from Unsplash's public CDN with `?w=` sizing.
 * Reel videos are public MP4s from Pixabay's CDN — swap for locally hosted files
 * before ever pushing this folder to a production surface.
 */

// Member "last order" — used by Order Again hero card.
export const LAST_ORDER = {
  itemName: 'Creamy Pesto Rigatoni',
  itemImage: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?auto=format&fit=crop&w=800&q=70',
  addOns: '+ Parmesan · Sparkling water',
  price: '$18.50',
  when: 'Ordered 3 days ago',
  location: 'Downtown location',
};

// Top items carousel — merchant's manually curated bestsellers.
export const TOP_ITEMS = [
  { id: 'ti-1', name: 'Truffle Burger', price: '$14.90', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=70', badge: 'Bestseller', visible: true },
  { id: 'ti-2', name: 'Spicy Tuna Poke', price: '$16.50', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=70', badge: '', visible: true },
  { id: 'ti-3', name: 'Wagyu Ramen', price: '$22.00', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=70', badge: 'Chef\u2019s pick', visible: true },
  { id: 'ti-4', name: 'Miso Salmon Bowl', price: '$19.50', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=70', badge: '', visible: true },
  { id: 'ti-5', name: 'Buffalo Chicken Wrap', price: '$12.90', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=70', badge: 'Popular', visible: true },
  { id: 'ti-6', name: 'Green Goddess Salad', price: '$11.50', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=70', badge: '', visible: true },
];

// Menu categories grid.
export const MENU_CATEGORIES = [
  { id: 'cat-1', name: 'Breakfast', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=500&q=70', count: 12, visible: true },
  { id: 'cat-2', name: 'Lunch', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=70', count: 18, visible: true },
  { id: 'cat-3', name: 'Dinner', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=70', count: 24, visible: true },
  { id: 'cat-4', name: 'Drinks', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=500&q=70', count: 15, visible: true },
  { id: 'cat-5', name: 'Desserts', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=500&q=70', count: 9, visible: true },
  { id: 'cat-6', name: 'Kids menu', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=70', count: 7, visible: true },
];

// Menu Reels — short vertical MP4 clips (Pixabay CDN, ~2\u20134 MB each).
// Each has an auto-play duration (seconds) and an optional expiration date.
export const MENU_REELS = [
  {
    id: 'reel-1',
    title: 'Truffle Burger',
    subtitle: 'Chef\u2019s special \u00b7 this week',
    ctaLabel: 'Order now \u2192',
    ctaTarget: 'ti-1',
    video: 'https://cdn.pixabay.com/video/2020/07/01/43081-436375097_large.mp4',
    poster: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=70',
    seconds: 6,
    expires: '2026-12-31',
    visible: true,
  },
  {
    id: 'reel-2',
    title: 'Spicy Tuna Poke',
    subtitle: 'Fresh daily',
    ctaLabel: 'Add to cart \u2192',
    ctaTarget: 'ti-2',
    video: 'https://cdn.pixabay.com/video/2019/07/24/25543-352109824_large.mp4',
    poster: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=70',
    seconds: 5,
    expires: '2026-10-15',
    visible: true,
  },
  {
    id: 'reel-3',
    title: 'Wagyu Ramen',
    subtitle: 'Winter warmer',
    ctaLabel: 'See item \u2192',
    ctaTarget: 'ti-3',
    video: 'https://cdn.pixabay.com/video/2020/03/17/33489-399807006_large.mp4',
    poster: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=70',
    seconds: 7,
    expires: '2027-01-31',
    visible: true,
  },
];

export const REELS_CHIP_DEFAULTS = {
  label: 'New reels \u00b7 tap to watch',
  autoOpen: true,
  dismissible: true,
};
