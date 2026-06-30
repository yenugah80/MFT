// Web stub for @react-native-firebase — Firebase native modules are not available in browsers.
// All methods are no-ops that return safe defaults so fcmService.js handles gracefully.

const noopMessaging = {
  setBackgroundMessageHandler: () => {},
  requestPermission: async () => -1,
  getToken: async () => null,
  deleteToken: async () => {},
  subscribeToTopic: async () => {},
  unsubscribeFromTopic: async () => {},
  onMessage: () => () => {},
  onNotificationOpenedApp: () => () => {},
  getInitialNotification: async () => null,
  hasPermission: async () => -1,
  isDeviceRegisteredForRemoteMessages: false,
};

const messaging = () => noopMessaging;
messaging.default = noopMessaging;

export default messaging;
