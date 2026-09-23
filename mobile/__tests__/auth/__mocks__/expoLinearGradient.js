const React = require("react");
const { View } = require("react-native");

function LinearGradient({ children, ...props }) {
  return React.createElement(View, props, children);
}

module.exports = { LinearGradient };
