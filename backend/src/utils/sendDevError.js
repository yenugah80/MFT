// backend/src/utils/sendDevError.js
export function sendDevError(res, error) {
  res.status(500).json({
    error: process.env.NODE_ENV === "development"
      ? error.message
      : "Something went wrong",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
}
