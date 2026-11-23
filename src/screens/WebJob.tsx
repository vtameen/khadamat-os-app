import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SITE } from '../api';
import { C } from '../theme';
import { Empty } from '../ui';

// Opens a Khadamat OS page inside the app, on the same sign-in. Used for the jobs whose
// working screens already exist on the site (signing a PDF, camp rounds, handover forms…).
// Links that leave khadamatos.com are not followed inside the app.
export function WebJob({ path, title, onClose }: { path: string; title: string; onClose?: () => void }) {
  const ref = useRef<WebView<{}>>(null);
  const [failed, setFailed] = useState(false);
  const uri = path.startsWith('http') ? path : SITE + path;
  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <View style={s.bar}>
        {onClose ? <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onClose} style={s.back}><Text style={s.backText}>‹ Back</Text></Pressable> : null}
        <Text style={s.barTitle} numberOfLines={1}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Reload" onPress={() => { setFailed(false); ref.current?.reload(); }} style={s.back}><Text style={s.backText}>Reload</Text></Pressable>
      </View>
      {Platform.OS === 'web' ? (
        <Empty title={title} body={'Opens ' + uri + ' inside the app on a phone.'} />
      ) : failed ? (
        <Empty title="Could not open this page" body="Check your signal, then tap Reload." />
      ) : (
        <WebView<{}> ref={ref} source={{ uri }} sharedCookiesEnabled thirdPartyCookiesEnabled={false}
          originWhitelist={['https://khadamatos.com', 'https://*.khadamatos.com']}
          onShouldStartLoadWithRequest={(r: { url: string }) => r.url.startsWith(SITE) || r.url.startsWith('about:') || r.url.startsWith('blob:') || r.url.startsWith('data:')}
          setSupportMultipleWindows={false} allowsInlineMediaPlayback mediaCapturePermissionGrantType="grant"
          onError={() => setFailed(true)} pullToRefreshEnabled startInLoadingState />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  bar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line },
  back: { minHeight: 44, minWidth: 64, justifyContent: 'center', paddingHorizontal: 8 },
  backText: { color: C.teal, fontSize: 15, fontWeight: '600' },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: C.ink },
});
