/**
 * Stand-in for the optional `firebase/messaging` web SDK. The app uses native FCM on iOS/Android;
 * in a desktop browser (development) push is disabled, so the web implementation is never called.
 */
const unsupported = () => {
  throw new Error('Web push is not used by ThePrivate');
};
export const isSupported = async () => false;
export const getMessaging = unsupported;
export const getToken = unsupported;
export const deleteToken = unsupported;
export const onMessage = unsupported;
