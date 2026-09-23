const React = require("react");
const { View } = require("react-native");

function Image(props) {
  return React.createElement(View, { testID: "expo-image", ...props });
}

module.exports = { Image };
