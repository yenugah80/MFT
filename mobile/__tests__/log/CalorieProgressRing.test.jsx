/**
 * CalorieProgressRing (inside MealLoggedCard.jsx) — the "Meal Logged" ring
 * reported as showing text overlapping the ring's stroke. Root cause: three
 * stacked lines ("Calories" label + 64px value + "kcal" unit) were centered
 * inside a 168px-diameter ring, but at the label/unit's vertical offset from
 * center the circle has already narrowed well below the label's own text
 * width — the label collided with the stroke instead of clearing it. Fixed
 * by moving the "Calories" label above the ring entirely, leaving only the
 * two-line value+unit stack (which does clear the same narrowing) inside it.
 *
 * These tests assert the structural fix — label outside, value+unit inside —
 * rather than pixel positions, since RNTL's test renderer doesn't do layout.
 */
import React from "react";
import { render, screen } from "@testing-library/react-native";
import { CalorieProgressRing } from "../../components/log/MealLoggedCard";

describe("CalorieProgressRing", () => {
  test("renders the calorie value and unit", () => {
    render(<CalorieProgressRing consumed={553} goal={1320} />);
    expect(screen.getByText("553")).toBeOnTheScreen();
    expect(screen.getByText("kcal")).toBeOnTheScreen();
  });

  test("renders the percent-of-goal badge", () => {
    render(<CalorieProgressRing consumed={553} goal={1320} />);
    // 553/1320 = 41.9% -> rounds to 42%
    expect(screen.getByText("42% of daily goal")).toBeOnTheScreen();
  });

  test("switches wording once consumption passes the goal", () => {
    render(<CalorieProgressRing consumed={1500} goal={1320} />);
    expect(screen.getByText("114% of goal")).toBeOnTheScreen();
    expect(screen.queryByText(/of daily goal/)).not.toBeOnTheScreen();
  });

  test("a zero goal doesn't divide by zero into NaN% (any consumption reads as trivially over a 0 goal)", () => {
    render(<CalorieProgressRing consumed={553} goal={0} />);
    expect(screen.getByText("0% of goal")).toBeOnTheScreen();
  });

  test("'Calories' label exists exactly once — not duplicated between the fixed and ring layouts", () => {
    render(<CalorieProgressRing consumed={553} goal={1320} />);
    expect(screen.getAllByText("Calories")).toHaveLength(1);
  });

  test("the label is a sibling of the ring, not nested inside its center readout", () => {
    // Regression guard for the exact bug reported: previously "Calories" was
    // the first child inside ringCenter, stacked with the value and unit —
    // this asserts the component's top-level output is [label, ringWrapper],
    // i.e. two siblings, rather than one wrapper containing all three lines.
    const { toJSON } = render(<CalorieProgressRing consumed={553} goal={1320} />);
    const tree = toJSON();
    expect(Array.isArray(tree)).toBe(true);
    expect(tree).toHaveLength(2);
    const [labelNode] = tree;
    const flatten = (node) =>
      typeof node === "string"
        ? node
        : (Array.isArray(node?.children) ? node.children.map(flatten).join("") : "");
    expect(flatten(labelNode)).toBe("Calories");
  });
});
