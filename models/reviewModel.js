import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    // parent referencing
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour!'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user!'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// STATIC METHODS
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // this points to the current model
  const stats = await this.aggregate([
    // 1. Match all reviews for the current tour
    {
      $match: { tour: tourId },
    },
    // 2. Calculate the average rating
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  // 3. Update the tour with the new average rating
  if (stats.length > 0) {
    await this.model('Tour').findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRatings,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await this.model('Tour').findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// INDEXES
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// DOCUMENT MIDDLEWARE
reviewSchema.post('save', function () {
  // this points to the current review
  this.constructor.calcAverageRatings(this.tour);
});

// QUERY MIDDLEWARE
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

// REVIEW MODEL
const Review = mongoose.model('Review', reviewSchema);

export default Review;
