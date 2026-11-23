// src/interface/notificationFields.js
exports.notificationFields = {
  id: { type: 'string', required: false },
  userId: { type: 'string', required: false },
  userIds: { type: 'array', required: false },
  token: { type: 'string', required: false },
  tokens: { type: 'array', required: false },
  type: { type: 'string', required: true },
  title: { type: 'string', required: true },
  body: { type: 'string', required: true },
  data: { type: 'object', required: false },
  createdAt: { type: 'string', required: false },
  isRead: { type: 'array', required: false },
};
