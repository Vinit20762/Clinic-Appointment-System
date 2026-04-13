import React from 'react';

const map = {
  booked:      'badge-blue',
  completed:   'badge-green',
  cancelled:   'badge-red',
  rescheduled: 'badge-yellow',
};

const StatusBadge = ({ status }) => (
  <span className={map[status] || 'badge-gray'}>
    {status?.charAt(0).toUpperCase() + status?.slice(1)}
  </span>
);

export default StatusBadge;
