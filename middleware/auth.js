// Auth middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect('/admin/login');
}

function requireUser(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.redirect('/login');
}

module.exports = { requireAdmin, requireUser };
