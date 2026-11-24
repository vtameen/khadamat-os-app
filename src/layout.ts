import { useWindowDimensions } from 'react-native';

// One app, every shape (approved design, 24 Nov 2026):
//  - phone, and iPhone Duo closed (short, 466×678): bottom tab bar.
//  - iPhone Duo open (wide, ~890×626) and Galaxy Z Fold open (near square): iPad-style
//    sidebar on the left taking 38.2% of the width (golden split), the screen on the right 61.8%.
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= 600;
  const short = height < 720;            // iPhone Duo closed, landscape phones: compact Today card
  const sidebar = wide ? Math.min(340, Math.max(260, Math.round(width * 0.382))) : 0;
  const content = width - sidebar;
  // Inside the content area, a list beside its detail when there is room (38 : 62 again).
  const split = content >= 720;
  const listWidth = split ? Math.round(content * 0.382) : content;
  return { width, height, wide, short, sidebar, content, split, listWidth };
}
