import { Dimensions, useWindowDimensions } from 'react-native';

/**
 * The app is designed as a phone-width column. On tablets, foldables and
 * landscape windows (Android 16 ignores the portrait lock on large screens)
 * ResponsiveFrame centres that column instead of stretching it, so every screen
 * keeps its intended proportions. Anything that sizes itself from the screen
 * width must use these helpers, not the raw window width.
 */
export const MAX_CONTENT_WIDTH = 600;

/** Live width of the app column; follows rotation and fold/unfold. */
export function useContentWidth() {
    const { width } = useWindowDimensions();
    return Math.min(width, MAX_CONTENT_WIDTH);
}

/** Width at module load. Use only where a hook can't be used (static style sheets). */
export function initialContentWidth() {
    return Math.min(Dimensions.get('window').width, MAX_CONTENT_WIDTH);
}
