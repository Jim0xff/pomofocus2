function serializeMeta(meta) {
  if (meta == null) {
    return '';
  }

  if (meta instanceof Error) {
    return JSON.stringify({
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    });
  }

  return JSON.stringify(meta, (_key, value) => {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    return value;
  });
}

function createLogger({ sink = console, bindings = {} } = {}) {
  function write(method, message, meta) {
    const line = [message, serializeMeta({ ...bindings, ...meta })].filter(Boolean).join(' ');
    sink[method](line);
  }

  return {
    child(childBindings = {}) {
      return createLogger({
        sink,
        bindings: { ...bindings, ...childBindings },
      });
    },
    info(message, meta) {
      write('log', message, meta);
    },
    warn(message, meta) {
      write('warn', message, meta);
    },
    error(message, meta) {
      write('error', message, meta);
    },
  };
}

module.exports = {
  createLogger,
};
