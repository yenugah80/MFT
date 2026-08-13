// @expo/vector-icons renders via native font glyphs, which don't exist in
// the Jest environment. A plain View standing in for the icon is enough to
// let the tree render without crashing; tests here assert on visible text.
const React = require("react");
const { View } = require("react-native");

function Ionicons(props) {
  return React.createElement(View, { testID: `icon-${props.name}`, ...props });
}

module.exports = { Ionicons };
