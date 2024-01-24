import Review from '../models/reviewModel.js';
import * as factory from './handlerFactory.js';

// MIDDLEWARES
export const setTourUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

// ROUTE HANDLERS
export const getAllReviews = factory.getAll(Review);
export const getReview = factory.getOne(Review);
export const createReview = factory.createOne(Review);
export const updateReview = factory.updateOne(Review);
export const deleteReview = factory.deleteOne(Review);

// export const getAllReviews = catchAsync(async (req, res, next) => {
//   const filter = {};
//   if (req.params.tourId) filter.tour = req.params.tourId;

//   const reviews = await Review.find(filter);

//   res.status(200).json({
//     status: 'success',
//     data: {
//       reviews,
//     },
//   });
// });
