import React from 'react';

export function rootContainer(container) {
  const MobxContainer = require('@@/MobxContainer').default;
  return React.createElement(MobxContainer, null, container);
}
