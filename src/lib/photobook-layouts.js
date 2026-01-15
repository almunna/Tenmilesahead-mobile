// Photobook layout definitions

/**
 * @typedef {Object} LayoutSlot
 * @property {number} x - percentage
 * @property {number} y - percentage
 * @property {number} width - percentage
 * @property {number} height - percentage
 */

/**
 * @typedef {Object} LayoutDefinition
 * @property {string} id
 * @property {string} name
 * @property {LayoutSlot[]} slots
 */

export const LAYOUTS = [
  {
    id: "single-full",
    name: "Single Photo (Full Bleed)",
    slots: [{ x: 0, y: 0, width: 100, height: 100 }],
  },
  {
    id: "two-horizontal",
    name: "Two Photos (Horizontal)",
    slots: [
      { x: 0, y: 0, width: 100, height: 49 },
      { x: 0, y: 51, width: 100, height: 49 },
    ],
  },
  {
    id: "two-vertical",
    name: "Two Photos (Vertical)",
    slots: [
      { x: 0, y: 0, width: 49, height: 100 },
      { x: 51, y: 0, width: 49, height: 100 },
    ],
  },
  {
    id: "three-mixed-left",
    name: "Three Photos (Large Left)",
    slots: [
      { x: 0, y: 0, width: 65, height: 100 },
      { x: 67, y: 0, width: 33, height: 49 },
      { x: 67, y: 51, width: 33, height: 49 },
    ],
  },
  {
    id: "three-mixed-right",
    name: "Three Photos (Large Right)",
    slots: [
      { x: 0, y: 0, width: 33, height: 49 },
      { x: 0, y: 51, width: 33, height: 49 },
      { x: 35, y: 0, width: 65, height: 100 },
    ],
  },
  {
    id: "four-grid",
    name: "Four Photos (Grid)",
    slots: [
      { x: 0, y: 0, width: 49, height: 49 },
      { x: 51, y: 0, width: 49, height: 49 },
      { x: 0, y: 51, width: 49, height: 49 },
      { x: 51, y: 51, width: 49, height: 49 },
    ],
  },
  {
    id: "six-collage",
    name: "Six Photos (Collage)",
    slots: [
      { x: 0, y: 0, width: 33, height: 33 },
      { x: 34, y: 0, width: 33, height: 33 },
      { x: 67, y: 0, width: 33, height: 33 },
      { x: 0, y: 34, width: 33, height: 33 },
      { x: 34, y: 34, width: 33, height: 33 },
      { x: 67, y: 34, width: 33, height: 33 },
    ],
  },
  {
    id: "blank",
    name: "Blank Canvas",
    slots: [],
  },
];

/**
 * Get layout definition by ID
 * @param {string} id - Layout ID
 * @returns {LayoutDefinition|undefined}
 */
export function getLayoutById(id) {
  return LAYOUTS.find((l) => l.id === id);
}
