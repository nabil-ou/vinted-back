const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.headers.authorization.replace("Bearer ", "");
    const checkToken = await User.findOne({ token }).select("account _id");

    if (checkToken) {
      req.user = checkToken;
      return next();
    } else {
      return res.status(401).json("Unauthorized");
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = isAuthenticated;
