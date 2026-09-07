const MESSAGES = [
  { id: 'gift-ready', title: 'A little thank-you, just for you', preview: 'Your next coffee is on us.', body: 'A small treat for being part of our community. Your complimentary coffee is waiting in My Gifts, ready for your next visit.', group: 'Today', time: '12 min ago', category: 'Gift', icon: 'gift', read: false, action: 'View my gifts', target: 'gifts' },
  { id: 'points-added', title: 'Your points are in', preview: 'You earned 120 points on your last visit.', body: 'Thanks for stopping by. We added 120 points to your balance. Keep collecting, or take a look at what you can enjoy today.', group: 'Today', time: '1 hr ago', category: 'Rewards', icon: 'sparkles', read: false, action: 'Explore rewards', target: 'point-shop' },
  { id: 'weekend-special', title: 'Meet your new weekend favourite', preview: 'Something fresh from the kitchen.', body: 'Our kitchen has been trying something new. Take a look at the latest seasonal favourites and find a reason to make your next visit a little special.', group: 'Today', time: '3 hr ago', category: 'News', icon: 'utensils', read: false, image: 'reels/reel-burger.jpg' },
  { id: 'visit-receipt', title: 'Always a pleasure to see you', preview: 'Your visit is saved in your account.', body: 'Your latest visit is now in your account. You can check your recent orders and find your favourites whenever you are ready to come back.', group: 'Yesterday', time: 'Yesterday', category: 'Your visit', icon: 'receipt', read: true, action: 'View my orders', target: 'orders' },
  { id: 'welcome', title: 'You are part of the family', preview: 'Good food. More to look forward to.', body: 'Welcome aboard. Your membership brings your points, gifts and favourite moments together in one place. We are happy you are here.', group: 'Yesterday', time: 'Yesterday', category: 'Membership', icon: 'heart', read: true, action: 'My profile', target: 'account' },
  { id: 'friend-reward', title: 'Good things are better shared', preview: 'Invite a friend for your next visit.', body: 'Share your invitation with a friend and give them a warm welcome. You can find your personal invitation in Refer a Friend.', group: 'Earlier', time: '3 days ago', category: 'Friends', icon: 'heart', read: true, action: 'Invite a friend', target: 'referral' },
  { id: 'fresh-menu', title: 'A fresh start to the week', preview: 'A few new reasons to stop by.', body: 'Fresh ingredients, familiar favourites and a little inspiration from our kitchen. We are looking forward to welcoming you back.', group: 'Earlier', time: '4 days ago', category: 'News', icon: 'utensils', read: true, image: 'reels/reel-poke.jpg' },
  { id: 'balance', title: 'A little closer to your next reward', preview: 'Your balance is ready when you are.', body: 'Every visit brings you a little closer to something good. Your current balance and available rewards are in your profile.', group: 'Earlier', time: '5 days ago', category: 'Rewards', icon: 'sparkles', read: true, action: 'My profile', target: 'account' },
  { id: 'gift-reminder', title: 'Do not forget your treat', preview: 'Your gifts travel with you.', body: 'Your available gifts are always with you in the app. Open My Gifts before your next visit to see what is waiting.', group: 'Earlier', time: 'Last week', category: 'Gift', icon: 'gift', read: true, action: 'View my gifts', target: 'gifts' },
  { id: 'member-note', title: 'Thanks for being here', preview: 'A note from your rewards team.', body: 'Whether you drop in for your usual or stay a little longer, we appreciate every visit. Here is to more good moments together.', group: 'Earlier', time: 'Last week', category: 'Membership', icon: 'heart', read: true },
];

export function createInboxState() {
  return { messages: MESSAGES.map((message) => ({ ...message })), shown: 5, filter: 'all', selected: null, revision: 0 };
}

export function inboxUnreadCount(state) {
  return state.messages.filter((message) => !message.read).length;
}

export function visibleInboxMessages(state) {
  return state.messages.slice(0, state.shown).filter((message) => state.filter !== 'unread' || !message.read);
}

export function markInboxRead(state, id, read = true) {
  const message = state.messages.find((item) => item.id === id);
  if (message) { message.read = read; state.revision += 1; }
}

export function markInboxAllRead(state) {
  state.messages.forEach((message) => { message.read = true; });
  state.revision += 1;
}

export function loadOlderInboxMessages(state) {
  const before = state.shown;
  state.shown = Math.min(state.messages.length, state.shown + 3);
  state.revision += 1;
  return state.shown - before;
}