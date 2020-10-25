const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

const Offer = require("../models/Offer");
const User = require("../models/User");
const isAuthenticated = require("../middlewares/isAuthenticated");

router.get("/offers", async (req, res) => {
  const { title, priceMax, priceMin, sort, page } = req.query;

  try {
    let filters = {};
    if (title || priceMax || priceMin) {
      filters = {
        product_name: new RegExp(title, "i"),
        product_price: {
          $lte: priceMax ? priceMax : 10000,
          $gte: priceMin ? priceMin : 0,
        },
      };
    }

    let sortByPrice = {};
    if (sort) {
      sortByPrice = { product_price: sort };
    }

    let skip = 0;
    const limit = 2;
    if (page > 1) {
      skip = page * limit - limit;
    }

    const count = await Offer.countDocuments(filters);

    const result = await Offer.find(filters)
      .populate({
        path: "owner",
        select: "account email",
      })
      .select(
        "product_name product_details product_description product_price product_image.secure_url"
      )
      .sort(sortByPrice)
      .limit(limit)
      .skip(skip);

    res.status(200).json({ count: count, offers: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  const {
    product_name,
    product_description,
    product_price,
    condition,
    city,
    brand,
    size,
    color,
  } = req.fields;
  const photo = req.files.photo.path;

  try {
    if (
      product_name.length > 50 ||
      product_description.length > 500 ||
      product_price > 10000
    ) {
      res.status(400).json({
        message:
          "We can't proceed because your title or description may be too long (50 and 500 characters) or your price is too expensive (10000$ max)",
      });
    } else {
      const newOffer = new Offer({
        product_name,
        product_description,
        product_price,
        product_details: [
          { MARQUE: brand },
          { TAILLE: size },
          { ETAT: condition },
          { COULEUR: color },
          { EMPLACEMENT: city },
        ],
        owner: req.user,
      });

      const photoCloudinary = await cloudinary.uploader.upload(photo, {
        folder: `/vinted/offers/${newOffer._id}`,
        preview: "AJ1",
      });

      newOffer.product_image = photoCloudinary;

      await newOffer.save();

      res.status(200).json(newOffer);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/offer/update", isAuthenticated, async (req, res) => {
  const { id, color } = req.fields;

  try {
    const offer = await Offer.findById(id);

    for (let i = 0; i < offer.product_details.length; i++) {
      if (offer.product_details[i].COULEUR) {
        offer.product_details.splice(i, 1, { COULEUR: color });
      }
    }

    await offer.save();

    res.status(200).json(offer);
  } catch (err) {
    console.log("CATCH");
    res.status(400).json({ error: err.message });
  }
});

router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  const id = req.query.id;

  try {
    const offer = await Offer.findById(id);

    await cloudinary.uploader.destroy(offer.product_image.public_id);
    // cloudinary.api.delete_folder

    await offer.deleteOne();
    res.status(200).json({ message: "Offer deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/offer", async (req, res) => {
  const idOffer = req.query.id;

  try {
    const offer = await Offer.findById(idOffer).populate({
      path: "owner",
      select: "account email",
    });

    res.status(200).json(offer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
