const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/Users");
const Profile = require("../../models/Profile");
const { check, validationResult } = require("express-validator");

const profileprops = [
  "company",
  "website",
  "location",
  "bio",
  "status",
  "githubusername",
];

const socialprops = ["youtube", "twitter", "facebook", "linkedin", "instagram"];

// @route GET api/profile/me
// @desc Get current user profile
// @access Private
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id,
    }).populate("user", ["name", "avatar"]);
    if (!profile) {
      return res.status(401).json({ msg: "No profile for this user." });
    }
    res.json(profile);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ msg: "Server error" });
  }
});

// @route POST api/profile
// @desc Create/update user profile
// @access Private
router.post(
  "/",
  [
    auth,
    [
      check("status", "Status is required").not().isEmpty(),
      check("skills", "Skills is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    console.log(req.body, Object.keys(req.body));
    const profileFields = Object.keys(req.body)
      .filter((x) => profileprops.includes(x) && !!req.body[x])
      .reduce((acc, x) => {
        acc[x] = req.body[x];
        return acc;
      }, {});

    profileFields.user = req.user.id;
    const { skills } = req.body;
    if (skills) profileFields.skills = skills.split(",").map((x) => x.trim());

    profileFields.social = Object.keys(req.body)
      .filter((x) => socialprops.includes(x) && !!req.body[x])
      .reduce((acc, x) => {
        acc[x] = req.body[x];
        return acc;
      }, {});

    try {
      let profile = await Profile.findOne({ user: req.user.id });
      if (profile) {
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );
        return res.json(profile);
      } else {
        profile = new Profile(profileFields);
        await profile.save();
        res.json(profile);
      }
    } catch (error) {
      console.error(error.message);
      return res.status(500).send("Server Error");
    }
  }
);

module.exports = router;
