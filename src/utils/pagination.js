export const paginate = async (model, queryOptions = {}, req) => {
  const page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 10;

  // Restrict limit to allowed values
  const allowedLimits = [10, 20, 30, 40, 50];
  limit = allowedLimits.includes(limit) ? limit : 10;

  const skip = (page - 1) * limit;

  // Count total records (with filters if any)
  const total = await model.count(queryOptions.where || {});

  // Fetch paginated data
  const data = await model.findMany({
    ...queryOptions,
    skip,
    take: limit,
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};