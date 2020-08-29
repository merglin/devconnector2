const express = require("express");
const { check, validationResult } = require("express-validator");
const router = express.Router();
const Post = require("../../models/Post");
const Profile = require("../../models/Profile");
const User = require("../../models/Users");
const auth = require("../../middleware/auth");

// @route POST api/posts
// @desc Add a post
// @access Private
router.post(
  "/",
  [auth, [check("text", "Text is required").not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(errors);
    }
    try {
      const user = await User.findById(req.user.id).select("-password");
      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      });
      const post = await newPost.save();
      res.json(post);
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ msg: "Server Error" });
    }
  }
);

// @route GET api/posts
// @desc Get all posts
// @access Private
router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ msg: "Server error" });
  }
});

// @route GET api/posts/:post_id
// @desc Get a post by id
// @access Private
router.get("/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(400).json({ msg: "Post not found" });
    }
    res.json(post);
  } catch (error) {
    console.error(error.message);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ msg: "Post not found" });
    }

    return res.status(500).json({ msg: "Server error" });
  }
});

// @route DELETE api/posts/:post_id
// @desc Delete post by id
// @access Private
router.delete("/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(400).json({ msg: "Post not found" });
    }
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized" });
    }
    await post.remove();
    res.json({ msg: "post deleted" });
  } catch (error) {
    console.error(error.message);
    if (error.kind === "ObjectId") {
      return res.status(400).json({ msg: "Post not found" });
    }
    return res.status(500).json({ msg: "Server error" });
  }
});

// @route PUT api/posts/like/:post_id
// @desc Like a post
// @access Private
router.put("/like/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(400).json({ msg: "Post not found." });
    }
    if (post.likes.some((like) => like.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: "Post is already liked" });
    }
    post.likes.push({ user: req.user.id });
    await post.save();
    res.json(post.likes);
  } catch (error) {
    console.error(error.message);
    if (error.kind === "ObjectId") {
      return res.status(400).status({ msg: "Post not found" });
    }
    res.status(500).json({ msg: "Server Error" });
  }
});

// @route PUT api/posts/unlike/:post_id
// @desc Unlike a post
// @access Private
router.put("/unlike/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(400).json({ msg: "Post not found." });
    }
    post.likes = post.likes.filter(
      (like) => like.user.toString() != req.user.id
    );
    await post.save();
    res.json(post.likes);
  } catch (error) {
    console.error(error.message);
    if (error.kind === "ObjectId") {
      return res.status(400).status({ msg: "Post not found" });
    }
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
