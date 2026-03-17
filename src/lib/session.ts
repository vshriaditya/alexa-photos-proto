export const createSessionId = () =>
  `session-${Math.random().toString(36).slice(2, 10)}`;
