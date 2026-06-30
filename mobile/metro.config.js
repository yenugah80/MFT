const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Stub native-only modules on web
const WEB_STUBS = {
  'lottie-react-native': path.join(__dirname, 'polyfills.lottie-stub.js'),
  'expo-sqlite': path.join(__dirname, 'polyfills.sqlite-stub.js'),
  '@react-native-firebase/messaging': path.join(__dirname, 'polyfills.firebase-stub.js'),
  '@react-native-firebase/app': path.join(__dirname, 'polyfills.firebase-app-stub.js'),
};

const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_STUBS[moduleName] };
  }
  if (originalResolver) return originalResolver(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

// Load WeakRef polyfill before the bundle (fixes @react-navigation/core v7.17+ on hermes-stable)
config.serializer = {
  ...config.serializer,
  getPolyfills: () => {
    const defaults = require('react-native/rn-get-polyfills')();
    return [...defaults, path.join(__dirname, 'polyfills.js')];
  },
};

// Fix: BundleDownloader sends Accept: multipart/mixed which causes Metro to respond
// with a chunked multipart response that OkHttp fails to parse.
// Strip multipart/mixed from Accept header so Metro responds with plain JS instead.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.headers && req.headers['accept'] && req.headers['accept'].includes('multipart/mixed')) {
        req.headers['accept'] = req.headers['accept']
          .split(',')
          .filter((t) => !t.trim().startsWith('multipart/mixed'))
          .join(',') || 'application/javascript';
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
