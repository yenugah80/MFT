// Shared by jest.setup.js and jest.setup.components.js.
//
// jest-expo installs these globals as lazy getters that require() Expo's
// winter runtime on first access. Under Jest 30 that first access can land
// after a suite's module registry is torn down, failing the whole suite
// with "import a file outside of the scope of the test code". Plain values
// backed by Node's own implementations keep the lookups inert.
const { TextDecoder } = require('util');
const { TextDecoderStream, TextEncoderStream } = require('stream/web');
const v8 = require('v8');
const winterGlobals = {
  __ExpoImportMetaRegistry: { url: null },
  structuredClone: (value) => v8.deserialize(v8.serialize(value)),
  TextDecoder,
  TextDecoderStream,
  TextEncoderStream,
  URL: require('url').URL,
  URLSearchParams: require('url').URLSearchParams,
};
for (const [name, value] of Object.entries(winterGlobals)) {
  Object.defineProperty(global, name, { value, configurable: true, writable: true });
}
