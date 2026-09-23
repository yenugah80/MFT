// canvas.jsx's decorative background (AuthCanvas -> WelcomeBackground) is
// pure SVG geometry with no test-relevant behavior — it's covered visually,
// not by these interaction tests. Every primitive it imports is stubbed to
// a plain View/Fragment so the auth screens can mount without pulling in
// react-native-svg's native view manager, which doesn't exist in Jest.
const React = require("react");
const { View } = require("react-native");

function passthrough(name) {
  return function Stub({ children, ...props }) {
    return React.createElement(View, { testID: `svg-${name}`, ...props }, children);
  };
}

module.exports = {
  __esModule: true,
  default: passthrough("Svg"),
  Svg: passthrough("Svg"),
  Path: passthrough("Path"),
  Circle: passthrough("Circle"),
  Ellipse: passthrough("Ellipse"),
  Rect: passthrough("Rect"),
  Defs: passthrough("Defs"),
  Stop: passthrough("Stop"),
  RadialGradient: passthrough("RadialGradient"),
  LinearGradient: passthrough("LinearGradient"),
};
