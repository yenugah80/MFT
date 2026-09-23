import { Text, View } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

function Smoke() {
  return (
    <View>
      <Text>hello world</Text>
    </View>
  );
}

test("component project can render and query real react-native primitives", () => {
  render(<Smoke />);
  expect(screen.getByText("hello world")).toBeOnTheScreen();
});

test("fireEvent works", () => {
  const onPress = jest.fn();
  const { getByText } = render(
    <Text onPress={onPress}>tap me</Text>
  );
  fireEvent.press(getByText("tap me"));
  expect(onPress).toHaveBeenCalledTimes(1);
});
