import { PrismaClient } from '../generated/prisma/index.js';
const prisma = new PrismaClient();

export const requireAdmin = async (req, res, next) => {
  try {
    // Expect the client to send current user email in header 'x-user-email'
    const email = req.headers['x-user-email'] || req.body?.email || req.query?.email;
    if (!email) return res.status(401).json({ error: 'Admin email header required' });

    const user = await prisma.user.findUnique({ where: { email: String(email) } });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }

    // attach user to request for downstream handlers
    req.user = user;
    next();
  } catch (err) {
    console.error('requireAdmin error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export default requireAdmin;
