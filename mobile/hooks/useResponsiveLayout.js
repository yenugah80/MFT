import { useWindowDimensions } from 'react-native';

/**
 * useResponsiveLayout
 *
 * Custom hook for responsive design breakpoints.
 * Helps components adapt to different screen sizes:
 * - Mobile small (<375px): Single column, stacked
 * - Mobile (375-600px): Two columns where appropriate
 * - Tablet (600px+): Three+ columns, more spacing
 *
 * @returns {Object} Responsive layout info
 * @returns {boolean} isMobileSmall - Screen width < 375px
 * @returns {boolean} isMobile - Screen width 375-600px
 * @returns {boolean} isTablet - Screen width >= 600px
 * @returns {number} width - Screen width in pixels
 * @returns {string} buttonLayout - 'stack' | 'twoCol' | 'threeCol'
 * @returns {number} padding - Horizontal padding in pixels
 * @returns {number} gap - Gap between elements
 * @returns {string} actionLayout - How to arrange action buttons
 */
export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  // Determine screen size category
  const isMobileSmall = width < 375;
  const isMobile = width >= 375 && width < 600;
  const isTablet = width >= 600;

  // Determine button layout based on screen size
  let buttonLayout = 'stack'; // Default: vertical stacking
  if (isMobile) buttonLayout = 'twoCol'; // Two columns on mobile
  if (isTablet) buttonLayout = 'threeCol'; // Three columns on tablet

  // Padding scales with screen size
  const padding = isMobileSmall ? 12 : 16;

  // Gap between elements
  const gap = isMobileSmall ? 6 : 8;

  return {
    // Boolean flags
    isMobileSmall,
    isMobile,
    isTablet,

    // Raw dimensions
    width,

    // Calculated values
    buttonLayout,
    padding,
    gap,

    // Helper: is screen in portrait (taller than wide)?
    isPortrait: width < 600,

    // Helper: max width for cards on tablet
    maxCardWidth: isTablet ? 600 : undefined,

    // Helper: number of action columns
    actionColumns: isMobileSmall ? 1 : isMobile ? 2 : 3,
  };
}

/**
 * Responsive text size helper
 * Scales font sizes based on screen width
 *
 * @param {number} baseSize - Font size for standard device (375px)
 * @returns {number} Scaled font size
 */
export function getResponsiveFontSize(baseSize) {
  const { width } = useWindowDimensions();
  const scaleFactor = width / 375; // Normalize to 375px base
  return Math.round(baseSize * scaleFactor);
}

/**
 * Responsive spacing helper
 * Returns consistent spacing values that scale with screen size
 *
 * @returns {Object} Spacing values
 */
export function getResponsiveSpacing() {
  const { padding, gap } = useResponsiveLayout();

  return {
    xs: gap,           // Extra small: 6-8px
    sm: gap * 1.5,     // Small: 9-12px
    md: padding,       // Medium: 12-16px
    lg: padding * 1.5, // Large: 18-24px
    xl: padding * 2,   // Extra large: 24-32px
  };
}
