import { useWindowDimensions } from 'react-native';

// One app, three widths. Height is tracked too: wide foldables (iPhone Duo, Fold 8)
// are short when closed and landscape when open.
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= 600;            // unfolded foldable or tablet: side rail + two panes
  const short = height < 720;           // tight height: compact headers, pinned actions
  // Split on the centre line (the hinge) when wide. The rail is 72 wide.
  const listWidth = wide ? Math.max(300, Math.round(width / 2) - 72) : width;
  return { width, height, wide, short, listWidth };
}
