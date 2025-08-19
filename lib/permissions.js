// lib/permissions.js
// RBAC + abilities centralizados

export const ROLE_TO_ABILITIES = {
  admin: [
    "scene.view","scene.edit","runtime.control","chat.use",
    "schedule.view","schedule.assign","schedule.clearDay","schedule.copyFromPrev","schedule.export",
    "driver.view","driver.upload","driver.delete","driver.share",
    "admin.panel","admin.manageUsers","admin.audit","danger.deleteAll",
  ],
  editor: [
    "scene.view","scene.edit","runtime.control","chat.use",
    "schedule.view","schedule.assign","schedule.clearDay","schedule.copyFromPrev",
  ],
  organizador: ["scene.view","chat.use"],
  cronograma: ["schedule.view","schedule.assign","schedule.copyFromPrev","chat.use"],
  driver: ["driver.view","driver.upload","chat.use"],
  viewer: ["scene.view","schedule.view","driver.view","chat.use"],
  operador: ["runtime.control","scene.view","chat.use"],
};

export function deriveAbilities(roles = {}) {
  const set = new Set();
  Object.entries(roles || {}).forEach(([role, enabled]) => {
    if (enabled && ROLE_TO_ABILITIES[role]) {
      ROLE_TO_ABILITIES[role].forEach((a) => set.add(a));
    }
  });
  return set;
}

export function can(roles, ability) {
  const abs = deriveAbilities(roles);
  return abs.has(ability);
}
