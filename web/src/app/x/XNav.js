import { createContext, useContext } from 'react';

// Navigation + actions shared across the X app so deep components (a post card, a
// linkified @mention) can route without prop-drilling.
//   openProfile({ handle } | { id }), openPost(id), openHashtag(tag),
//   openCompose({ replyTo }?), openLightbox(url), openVideo(url),
//   refreshFeed() — re-pull the current feed after an action.
export const XNavContext = createContext(null);
export const useXNav = () => useContext(XNavContext) || {};
