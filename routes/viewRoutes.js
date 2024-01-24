import express from 'express';
import { isLoggedIn, protect } from '../controllers/authController.js';
import {
  alerts,
  getAccount,
  getLoginForm,
  getMyTours,
  getOverview,
  getSingupForm,
  getTour,
  updateUserData,
} from '../controllers/viewsController.js';

const router = express.Router();

router.use(alerts);

router.get('/', isLoggedIn, getOverview);
router.get('/tour/:slug', isLoggedIn, getTour);
router.get('/login', isLoggedIn, getLoginForm);
router.get('/signup', isLoggedIn, getSingupForm);
router.get('/me', protect, getAccount);
router.get('/my-tours', protect, getMyTours);
router.post('/submit-user-data', protect, updateUserData);

export default router;
