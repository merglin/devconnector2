const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/Users");
const Profile = require("../../models/Profile");
const { check, validationResult } = require("express-validator");
const request = require("request");
const config = require("config");

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

// @route GET api/profile
// @desc Get all user profiles
// @access Public
router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find().populate("user", ["name", "avatar"]);
    res.json(profiles);
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Server Error");
  }
});

// @route GET api/profile/user/:user_id
// @desc Get profile by user id
// @access Public
router.get("/user/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate("user", ["name", "avatar"]);

    if (!profile) return res.status(400).json({ msg: "Profile not found" });
    res.json(profile);
  } catch (error) {
    console.error(error.message);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ msg: "Profile not found" });
    }
    return res.status(500).send("Server Error");
  }
});

// @route DELETE api/profile
// @desc delete profile, user profile & posts
// @access Private
router.delete("/", auth, async (req, res) => {
  try {
    await Profile.findOneAndRemove({
      user: req.user.id,
    });

    await User.findOneAndRemove({
      _id: req.user.id,
    });

    res.json({ msg: "User was deleted" });
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Server Error");
  }
});

// @route PUT api/profile/experience
// @desc Add profile experience
// @access Private
router.put(
  "/experience",
  [
    auth,
    [
      check("title", "Title is required").not().isEmpty(),
      check("company", "Company is required").not().isEmpty(),
      check("from", "From date is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    } = req.body;

    const newExp = {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });
      profile.experience.unshift(newExp);
      await profile.save();
      res.json(profile);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

// @route DELETE api/experience/:exp_id
// @desc delete experience
// @access Private
router.delete("/experience/:exp_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id,
    });

    const removeIndex = profile.experience.findIndex(
      (exp) => exp.id === req.params.exp_id
    );
    profile.experience.splice(removeIndex, 1);
    await profile.save();

    res.json(profile);
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Server Error");
  }
});

// @route PUT api/profile/education
// @desc Add profile education
// @access Private
router.put(
  "/education",
  [
    auth,
    [
      check("school", "School is required").not().isEmpty(),
      check("degree", "Degree is required").not().isEmpty(),
      check("fieldofstudy", "Field of study is required").not().isEmpty(),
      check("from", "From date is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    } = req.body;

    const newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });
      profile.education.unshift(newEdu);
      await profile.save();
      res.json(profile);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

// @route DELETE api/education/:exp_id
// @desc delete education
// @access Private
router.delete("/education/:edu_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id,
    });

    const removeIndex = profile.education.findIndex(
      (edu) => edu.id === req.params.edu_id
    );
    profile.education.splice(removeIndex, 1);
    await profile.save();

    res.json(profile);
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Server Error");
  }
});

// @route GET api/profile/github/:username
// @desc Get user repos from github
// @access Public

router.get("/github/:username", (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${
        req.params.username
      }/repos?per_page=5&sort=created:asc&client_id=${config.get(
        "githubClientId"
      )}&client_secret=${config.get("githubClientSecret")}`,
      method: "GET",
      headers: { "user-agent": "node.js" },
    };
    request(options, (error, response, body) => {
      if (error) console.error(error);
      if (response.statusCode !== 200) {
        return res.status(404).json({ msg: "No github profile found" });
      }
      res.json(JSON.parse(body));
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
