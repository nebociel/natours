import express from 'express';
import { protect, restrictTo } from '../controllers/authController.js';
import {
  createBooking,
  deleteBooking,
  getAllBookings,
  getBooking,
  getCheckoutSession,
  updateBooking,
} from '../controllers/bookingController.js';

const router = express.Router();

router.use(protect);

router.get('/checkout-session/:tourId', getCheckoutSession);

router.use(restrictTo('admin', 'lead-guide'));

router.route('/').get(getAllBookings).post(createBooking);

// user booking routes
router.route('/:id').get(getBooking).patch(updateBooking).delete(deleteBooking);

export default router;
