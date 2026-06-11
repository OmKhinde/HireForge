import express from 'express';
import jwt     from 'jsonwebtoken';
import User    from '../models/User.js';

const router = express.Router();

const makeToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user  = await User.create({ email, password });
    res.status(201).json({ token: makeToken(user), email: user.email });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: makeToken(user), email: user.email });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;