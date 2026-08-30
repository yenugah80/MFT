import { compareBinaryGroups, MIN_PATTERN_GROUP_SIZE } from '../src/utils/patternEvidence.js';

describe('pattern evidence groups', () => {
  it('withholds comparisons when either side is too small', () => {
    const records = [
      { selected: true, value: 4 },
      { selected: true, value: 6 },
      { selected: false, value: 8 },
      { selected: false, value: 7 },
      { selected: false, value: 9 },
    ];

    expect(compareBinaryGroups(
      records,
      (record) => record.selected,
      (record) => record.value
    )).toBeNull();
    expect(MIN_PATTERN_GROUP_SIZE).toBe(3);
  });

  it('returns transparent sample sizes and group averages', () => {
    const records = [
      { selected: true, value: 4 },
      { selected: true, value: 5 },
      { selected: true, value: 6 },
      { selected: false, value: 7 },
      { selected: false, value: 8 },
      { selected: false, value: 9 },
    ];

    expect(compareBinaryGroups(
      records,
      (record) => record.selected,
      (record) => record.value
    )).toEqual({
      countWith: 3,
      countWithout: 3,
      averageWith: 5,
      averageWithout: 8,
      difference: -3,
    });
  });

  it('excludes missing values instead of treating them as zero', () => {
    const records = [
      { selected: true, value: 4 },
      { selected: true, value: 5 },
      { selected: true, value: 6 },
      { selected: false, value: 7 },
      { selected: false, value: 8 },
      { selected: false, value: 9 },
      { selected: false, value: null },
    ];

    expect(compareBinaryGroups(
      records,
      (record) => record.selected,
      (record) => record.value
    )?.countWithout).toBe(3);
  });
});
