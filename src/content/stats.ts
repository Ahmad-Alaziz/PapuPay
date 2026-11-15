/**
 * Figures and chart data for the Benefits section.
 *
 * ⚠️  PLACEHOLDER: these are example values for illustration, not measured
 * results. Replace them with real data (e.g. from pilot venues) and update
 * or remove `benefits.footnote` in the copy files accordingly.
 */

export type Stat = {
  value: number;
  prefix: "+" | "−" | "";
  suffix: string;
};

export const benefitStats = {
  loyalty: {
    value: 24, // PLACEHOLDER
    prefix: "+",
    suffix: "%",
    /** Return visits over time, indexed to 100 before PapuPay. */
    series: [100, 101, 99, 106, 110, 115, 119, 124], // PLACEHOLDER
    /** How many leading points of `series` are "before". */
    beforeCount: 3,
  },
  reviews: {
    value: 3, // PLACEHOLDER
    prefix: "",
    suffix: "×",
    /** Google reviews per month; the first `beforeCount` bars are "before". */
    bars: [4, 5, 4, 10, 13, 14], // PLACEHOLDER
    beforeCount: 3,
  },
  menus: {
    value: 90, // PLACEHOLDER
    prefix: "−",
    suffix: "%",
  },
} satisfies Record<string, Stat & Record<string, unknown>>;
