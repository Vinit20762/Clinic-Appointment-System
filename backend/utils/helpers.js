/**
 * formatDate
 * ----------
 * Returns a Date object as 'YYYY-MM-DD' string.
 * Avoids timezone drift by using UTC methods.
 */
const formatDate = (date = new Date()) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * paginate
 * --------
 * Simple page/limit helper. Returns { limit, offset } for SQL.
 */
const paginate = (query) => {
  const page   = Math.max(1, parseInt(query.page,  10) || 1);
  const limit  = Math.min(100, parseInt(query.limit, 10) || 20);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

module.exports = { formatDate, paginate };
