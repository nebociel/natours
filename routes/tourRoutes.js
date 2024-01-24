import express from 'express';
import { protect, restrictTo } from '../controllers/authController.js';
import {
  aliasTopTours,
  createTour,
  deleteTour,
  getAllTours,
  getDistances,
  getMonthlyPlan,
  getTour,
  getTourStats,
  getToursWithin,
  resizeTourImages,
  updateTour,
  uploadTourImages,
} from '../controllers/tourController.js';
import reviewRouter from './reviewRoutes.js';

const router = express.Router();

// MIDDLEWARES
// router.param('id', checkID);

// ROUTES
router.route('/top-5-cheap').get(aliasTopTours, getAllTours);
router.route('/tour-stats').get(getTourStats);
router
  .route('/monthly-plan/:year')
  .get(protect, restrictTo('admin', 'lead-guide', 'guide'), getMonthlyPlan);

router
  .route('/')
  .get(getAllTours)
  .post(protect, restrictTo('admin', 'lead-guide'), createTour);

router
  .route('/:id')
  .get(getTour)
  .patch(
    protect,
    restrictTo('admin', 'lead-guide'),
    uploadTourImages,
    resizeTourImages,
    updateTour,
  )
  .delete(protect, restrictTo('admin', 'lead-guide'), deleteTour);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(getDistances);

// Nested routes for reviews
// POST /tour/234fad4/reviews
// GET /tour/234fad4/reviews
// GET /tour/234fad4/reviews/98d8f9d
router.use('/:tourId/reviews', reviewRouter);

export default router;
