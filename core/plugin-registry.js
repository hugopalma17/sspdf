const _plugins = new Map();

const BUILT_IN_TYPES = new Set([
  "text", "row", "bullet", "divider", "spacer", "hiddenText",
  "block", "section", "group", "quote",
]);

function registerPlugin(type, handler) {
  if (!type || typeof type !== "string") {
    throw new Error("registerPlugin: type must be a non-empty string");
  }
  if (typeof handler === "function") {
    handler = { render: handler };
  }
  if (!handler || typeof handler.render !== "function") {
    throw new Error(`registerPlugin: handler for "${type}" must have a render function`);
  }
  if (BUILT_IN_TYPES.has(type)) {
    throw new Error(`registerPlugin: cannot override built-in type "${type}"`);
  }
  _plugins.set(type, handler);
}

function getPlugin(type) {
  return _plugins.get(type) || null;
}

function hasPlugin(type) {
  return _plugins.has(type);
}

function unregisterPlugin(type) {
  _plugins.delete(type);
}

function clearPlugins() {
  _plugins.clear();
}

module.exports = {
  registerPlugin,
  getPlugin,
  hasPlugin,
  unregisterPlugin,
  clearPlugins,
};
