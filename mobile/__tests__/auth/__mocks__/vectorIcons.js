// @expo/vector-icons renders via native font glyphs, which don't exist in
// the Jest environment. The auth tests never assert on which icon glyph is
// showing, only on text/labels/handlers, so a plain View standing in for
// the icon is enough to let the tree render without crashing.
const React = require("react");
const { View } = require("react-native");

function Ionicons(props) {
  return React.createElement(View, { testID: `icon-${props.name}`, ...props });
}

module.exports = { Ionicons };
