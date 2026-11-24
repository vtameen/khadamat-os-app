import React from 'react';
import { Platform, StyleProp, Text, View, ViewStyle } from 'react-native';
import { C, T } from './theme';

// A PDF shown by the phone itself (PDFKit on iPhone, PdfiumAndroid on Android) —
// pinch to zoom, swipe between pages. Never a web page.
type Props = {
  uri: string; style?: StyleProp<ViewStyle>; page?: number; singlePage?: boolean; scrollEnabled?: boolean;
  onLoaded?: (pages: number) => void; onPage?: (page: number, pages: number) => void; onError?: (msg: string) => void;
};

let Pdf: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Pdf = require('react-native-pdf').default;
}

export function PdfView({ uri, style, page, singlePage, scrollEnabled = true, onLoaded, onPage, onError }: Props) {
  if (!Pdf) {
    // Web preview of the app (design checks only): the browser's own viewer.
    return (
      <View style={[{ flex: 1, backgroundColor: C.card }, style]}>
        {React.createElement('iframe' as any, { src: uri, title: 'Document', style: { width: '100%', height: '100%', border: 0 }, onLoad: () => onLoaded?.(1) })}
      </View>
    );
  }
  return (
    <Pdf source={{ uri }} style={[{ flex: 1, backgroundColor: C.ground }, style]} page={page} singlePage={singlePage} scrollEnabled={scrollEnabled}
      fitPolicy={singlePage ? 2 : 0} spacing={8} enablePaging={false} trustAllCerts={false}
      onLoadComplete={(n: number) => onLoaded?.(n)} onPageChanged={(p: number, n: number) => onPage?.(p, n)}
      onError={(e: unknown) => onError?.(String((e as Error)?.message ?? e))}
      renderActivityIndicator={() => <Text style={T.caption}>Opening…</Text>} />
  );
}
