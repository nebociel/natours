import multer from 'multer';
import sharp from 'sharp';
import Tour from '../models/tourModel.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import * as factory from './handlerFactory.js';

// const fileLocation = './dev-data/data/tours-simple.json';
// const tours = JSON.parse(fs.readFileSync(fileLocation));

// MIDDLEWARE FUNCTIONS
// export const checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Missing name or price',
//     });
//   }

//   next();
// };

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  // multerFilter() is a function to control which files should be uploaded and which should be skipped.
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

export const uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

export const resizeTourImages = catchAsync(async (req, res, next) => {
  // resizeTourImages() is a middleware that resizes the tour images.
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) PROCESS THE COVER IMAGE
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) // 2:3 RATIO
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) PROCESS THE OTHER IMAGES
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333) // 2:3 RATIO
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    }),
  );

  // console.log(req.body);

  next();
});

export const aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// ROUTE HANDLERS
export const getAllTours = factory.getAll(Tour);
export const getTour = factory.getOne(Tour, { path: 'reviews' });
export const createTour = factory.createOne(Tour);
export const updateTour = factory.updateOne(Tour);
export const deleteTour = factory.deleteOne(Tour);

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi
export const getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400,
      ),
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});

export const getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400,
      ),
    );
  }

  const distances = await Tour.aggregate([
    {
      // GEO NEAR AGGREGATION
      $geoNear: {
        // NEAR IS THE POINT FROM WHICH TO CALCULATE THE DISTANCES
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        // DISTANCE FIELD IS THE OUTPUT FIELD THAT CONTAINS THE CALCULATED DISTANCE
        distanceField: 'distance',
        // MULTIPLY THE DISTANCE BY THE MULTIPLIER
        distanceMultiplier: multiplier,
      },
    },
    {
      // PROJECT AGGREGATION
      $project: {
        // SHOW THE DISTANCE AND NAME FIELDS
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});

export const getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        // _id: null,
        _id: '$difficulty',
        // _id: { $toUpper: '$difficulty' },
        // _id: '$ratingsAverage',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

export const getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    // UNWIND DECONSTRUCTS AN ARRAY FIELD FROM THE INPUT DOCUMENTS TO OUTPUT A DOCUMENT FOR EACH ELEMENT
    {
      $unwind: '$startDates',
    },
    // MATCH DOCUMENTS
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    // GROUP DOCUMENTS
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        // ADD THE TOURS TO THE ARRAY
        tours: { $push: '$name' },
      },
    },
    // ADD A FIELD
    {
      $addFields: { month: '$_id' },
    },
    // PROJECT FIELDS
    {
      $project: {
        _id: 0,
      },
    },
    // SORT DOCUMENTS
    {
      $sort: { numTourStarts: -1 },
    },
    // LIMIT DOCUMENTS
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// export const getAllTours = async (req, res) => {
//   try {
//     // BUILD QUERY
//     const queryObj = { ...req.query };
//     const excludedFields = ['page', 'sort', 'limit', 'fields'];
//     excludedFields.forEach((el) => delete queryObj[el]);
//     // const query = Tour.find(queryObj);

//     // ADVANCED FILTERING
//     let queryStr = JSON.stringify(queryObj);
//     queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
//     const query = Tour.find(JSON.parse(queryStr));

//     // SORTING
//     if (req.query.sort) {
//       const sortBy = req.query.sort.split(',').join(' ');
//       query.sort(sortBy);
//     } else {
//       query.sort('-createdAt');
//     }

//     // FIELD LIMITING
//     if (req.query.fields) {
//       const fields = req.query.fields.split(',').join(' ');
//       query.select(fields);
//     } else {
//       query.select('-__v');
//     }

//     // PAGINATION
//     const page = req.query.page * 1 || 1;
//     const limit = req.query.limit * 1 || 100;
//     const skip = (page - 1) * limit;
//     query.skip(skip).limit(limit);

//     if (req.query.page) {
//       const numTours = await Tour.countDocuments();
//       if (skip >= numTours) {
//         throw new Error('This page does not exist');
//       }
//     }

//     // EXECUTE QUERY
//     // const tours = await Tour.find(queryObj);
//     const tours = await query;

//     res.status(200).json({
//       status: 'success',
//       results: tours.length,
//       data: {
//         tours,
//       },
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: 'fail',
//       message: err.message,
//     });
//   }
// };

// export const getAllTours = catchAsync(async (req, res, next) => {
//   // EXECUTE QUERY
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//   const tours = await features.query;

//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
// });

// export const getTour = catchAsync(async (req, res, next) => {
//   const id = req.params.id;
//   const tour = await Tour.findById(id).populate('reviews');

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

// export const createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
// });

// export const updateTour = catchAsync(async (req, res, next) => {
//   const id = req.params.id;
//   const update = req.body;
//   const options = {
//     new: true,
//     runValidators: true,
//   };

//   const tour = await Tour.findByIdAndUpdate(id, update, options);

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

// export const deleteTour = catchAsync(async (req, res, next) => {
//   const id = req.params.id;
//   const tour = await Tour.findByIdAndDelete(id);

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });
