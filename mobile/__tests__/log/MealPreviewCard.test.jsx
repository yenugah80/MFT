/**
 * MealPreviewCard — the compact confirmation card shown after a photo or
 * barcode scan in log.js, now wired back in after being a dead import (see
 * conversation history: imported and referenced in comments, never rendered).
 *
 * These tests exist because reading the code once already produced a wrong
 * assumption: the confidence badge reads `item.confidence`, but neither
 * useFoodAnalysis.js's photo path (analyzePhoto's aiItem) nor its barcode
 * path (mapBackendProductToItem / the backend BFF mapping) ever sets that
 * field — the real value lives at `item.sourceEvidence[0].confidence`. Every
 * shape below is copied from the actual object literals those two functions
 * build, not invented, so a shape drift there would break these too.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import MealPreviewCard from "../../components/log/MealPreviewCard";

jest.mock("@expo/vector-icons", () => require("./__mocks__/mealPreviewVectorIcons"));
jest.mock("expo-linear-gradient", () => require("./__mocks__/mealPreviewLinearGradient"));

// Shape matches the `aiItem` object built in useFoodAnalysis.js's
// analyzePhoto (hooks/useFoodAnalysis.js) — one item per photo, macros keyed
// `*_kcal`/`*_g`, confidence only under sourceEvidence[0].
function photoItem(overrides = {}) {
  return {
    itemId: "grilled-chicken-123",
    name: "Grilled Chicken Breast",
    portion: { amount: 150, unit: "g", gramsEquivalent: 150, servingText: "150g" },
    macros: {
      calories_kcal: 280,
      protein_g: 42,
      carbs_g: 2,
      fat_g: 11,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 380,
    },
    micros: {},
    sourceEvidence: [{ source: "Image AI", confidence: 0.62, data: {} }],
    isEditing: false,
    editedPortion: null,
    ...overrides,
  };
}

// Shape matches mapBackendProductToItem in useFoodAnalysis.js's barcode path.
function barcodeItem(overrides = {}) {
  return {
    itemId: "0012345678905",
    name: "Greek Yogurt, Plain",
    portion: { amount: 170, unit: "g", gramsEquivalent: 170, servingText: "170g" },
    macros: {
      calories_kcal: 100,
      protein_g: 17,
      carbs_g: 6,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 6,
      sodium_mg: 65,
    },
    micros: {},
    sourceEvidence: [{ source: "openfoodfacts", confidence: 0.9, data: {} }],
    ...overrides,
  };
}

// Matches calculateTotals()'s real output shape in useFoodAnalysis.js —
// `analysisResult.totals?.macros` is truthy-checked by the component, so an
// empty placeholder object there (rather than omitting totals) would silently
// short-circuit its own reduce-based fallback and render NaN.
// The confidence badge is drawn as an overlay on the thumbnail image, so it
// only renders when imageUri is truthy (see "no imageUri" tests below) —
// tests that check its text must supply one.
const PHOTO_URI = "file:///test-photo.jpg";

function buildResult(items) {
  const macros = { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  items.forEach((item) => {
    Object.keys(macros).forEach((key) => {
      macros[key] += item.macros?.[key] ?? 0;
    });
  });
  return { items, totals: { macros } };
}

describe("empty/no-result guard", () => {
  test("renders nothing when items is missing or empty", () => {
    const { toJSON: emptyTree } = render(<MealPreviewCard analysisResult={buildResult([])} />);
    expect(emptyTree()).toBeNull();

    const { toJSON: missingTree } = render(<MealPreviewCard analysisResult={{}} />);
    expect(missingTree()).toBeNull();
  });
});

describe("single-item photo result (the real shape from analyzePhoto)", () => {
  test("shows the food name and macro totals", () => {
    render(<MealPreviewCard analysisResult={buildResult([photoItem()])} />);

    expect(screen.getByText("Grilled Chicken Breast")).toBeOnTheScreen();
    expect(screen.getByText("280")).toBeOnTheScreen(); // calories
    expect(screen.getByText("42g")).toBeOnTheScreen(); // protein
    expect(screen.getByText("2g")).toBeOnTheScreen(); // carbs
    expect(screen.getByText("11g")).toBeOnTheScreen(); // fat
  });

  test("confidence badge reads sourceEvidence[0].confidence, not the always-absent item.confidence", () => {
    render(<MealPreviewCard analysisResult={buildResult([photoItem()])} imageUri={PHOTO_URI} />);
    // 0.62 -> 62%. Before the fix this always showed the 75% fallback
    // regardless of what the AI actually returned.
    expect(screen.getByText("ID 62%")).toBeOnTheScreen();
  });

  test("a genuinely low-confidence read still shows its real number, not the fallback", () => {
    render(
      <MealPreviewCard
        analysisResult={buildResult([
          photoItem({ sourceEvidence: [{ source: "Image AI", confidence: 0.31, data: {} }] }),
        ])}
        imageUri={PHOTO_URI}
      />
    );
    expect(screen.getByText("ID 31%")).toBeOnTheScreen();
  });

  test("falls back to 75% only when neither confidence field is present", () => {
    render(
      <MealPreviewCard
        analysisResult={buildResult([photoItem({ sourceEvidence: [] })])}
        imageUri={PHOTO_URI}
      />
    );
    expect(screen.getByText("ID 75%")).toBeOnTheScreen();
  });

  test("no imageUri shows the placeholder icon instead of a broken Image", () => {
    render(<MealPreviewCard analysisResult={buildResult([photoItem()])} imageUri={null} />);
    expect(screen.getByTestId("icon-restaurant")).toBeOnTheScreen();
  });
});

describe("single-item barcode result", () => {
  test("shows the product name and macros", () => {
    render(<MealPreviewCard analysisResult={buildResult([barcodeItem()])} />);

    expect(screen.getByText("Greek Yogurt, Plain")).toBeOnTheScreen();
    expect(screen.getByText("100")).toBeOnTheScreen();
  });

  // log.js never sets selectedImage for a barcode scan (there is no captured
  // photo), so in the real app this branch always takes the placeholder path
  // below — meaning a barcode result's 0.9 exact-match confidence is
  // computed but never actually shown to the user. Not fixed here; worth
  // knowing before treating the badge as "always there for AI results."
  test("without a captured photo, shows the placeholder icon and no confidence badge", () => {
    render(<MealPreviewCard analysisResult={buildResult([barcodeItem()])} />);
    expect(screen.getByTestId("icon-restaurant")).toBeOnTheScreen();
    expect(screen.queryByText(/^ID \d+%$/)).not.toBeOnTheScreen();
  });

  test("if a thumbnail were provided, its own confidence (0.9) would still compute correctly", () => {
    render(<MealPreviewCard analysisResult={buildResult([barcodeItem()])} imageUri={PHOTO_URI} />);
    expect(screen.getByText("ID 90%")).toBeOnTheScreen();
  });
});

describe("multi-item result (component's own branch, even though today's photo/barcode paths never produce >1 item)", () => {
  const items = [photoItem(), barcodeItem()];

  test("combines the name as 'first + N more'", () => {
    render(<MealPreviewCard analysisResult={buildResult(items)} />);
    expect(screen.getByText("Grilled Chicken Breast + 1 more")).toBeOnTheScreen();
  });

  test("lists each item with its own calorie count", () => {
    render(<MealPreviewCard analysisResult={buildResult(items)} />);
    expect(screen.getByText("Greek Yogurt, Plain")).toBeOnTheScreen();
    expect(screen.getByText("100 cal")).toBeOnTheScreen();
    expect(screen.getByText("280 cal")).toBeOnTheScreen();
  });

  test("averages confidence across items rather than using only the first", () => {
    render(<MealPreviewCard analysisResult={buildResult(items)} imageUri={PHOTO_URI} />);
    // (0.62 + 0.9) / 2 = 0.76 -> 76%
    expect(screen.getByText("ID 76%")).toBeOnTheScreen();
  });

  test("shows a '+N more' hint beyond 3 items", () => {
    const many = [photoItem(), barcodeItem(), photoItem({ itemId: "c" }), photoItem({ itemId: "d" })];
    render(<MealPreviewCard analysisResult={buildResult(many)} />);
    expect(screen.getByText("+1 more items")).toBeOnTheScreen();
  });
});

describe("actions", () => {
  test("tapping the card or 'View Full Analysis' both call onTapDetails", () => {
    const onTapDetails = jest.fn();
    render(
      <MealPreviewCard analysisResult={buildResult([photoItem()])} onTapDetails={onTapDetails} />
    );
    fireEvent.press(screen.getByText("View Full Analysis"));
    expect(onTapDetails).toHaveBeenCalledTimes(1);
  });

  test("tapping 'Log' calls onQuickSave", () => {
    const onQuickSave = jest.fn();
    render(
      <MealPreviewCard analysisResult={buildResult([photoItem()])} onQuickSave={onQuickSave} />
    );
    fireEvent.press(screen.getByText("Log"));
    expect(onQuickSave).toHaveBeenCalledTimes(1);
  });

  test("isSaving shows a saving state and does not render the idle Log label", () => {
    const onQuickSave = jest.fn();
    render(
      <MealPreviewCard
        analysisResult={buildResult([photoItem()])}
        onQuickSave={onQuickSave}
        isSaving
      />
    );
    expect(screen.getByText("Saving...")).toBeOnTheScreen();
    expect(screen.queryByText("Log")).not.toBeOnTheScreen();
  });

  test("onEdit is optional — the pencil button only renders when provided", () => {
    const { rerender } = render(
      <MealPreviewCard analysisResult={buildResult([photoItem()])} />
    );
    expect(screen.queryByTestId("icon-pencil")).not.toBeOnTheScreen();

    const onEdit = jest.fn();
    rerender(<MealPreviewCard analysisResult={buildResult([photoItem()])} onEdit={onEdit} />);
    fireEvent.press(screen.getByTestId("icon-pencil"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
