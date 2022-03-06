const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');

const User = require('../../models/User');
const Post = require('../../models/Post');


//bassically used for register the user
//and store the information in db
//public route used for register users
router.post('/',
[
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please enter proper email').isEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
],
async (req,res) => {
    //validating
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array()});
    }

    //getting the name email password to register teh user
    //and store in the db
    const { name, email, password } = req.body;

    try{
        let user = await User.findOne({ email });

        if(user){
            return res.status(400).json({ errors: [{ msg: 'User already exists'}]});
        }

        //creating a json object for the user
        user = new User({
            name,
            email,
            password
        });

        const salt = await bcrypt.genSalt(10);

        //setting up the password with bcrypt
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        };

        //getting up the token
        jwt.sign(payload,
             config.get('jwtSecret'),
             { expiresIn: 360000 },
             (err, token) => {
                 if(err) throw err;
                 res.json({ token });
             }
        );
    }catch(err){
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

//public route used for geting the user in form of json
//in fornt-end used to get the information evrytime the user loades
router.get('/user', auth, async (req,res) => {
    try {
        const user = await User.findById(req.user.id);
        const user2 = await User.findById(req.user.id).select('-follow').select('-followi');
        user2.followers = user.follow.length;
        user2.followings = user.followi.length;
        res.json(user2);
    }catch(err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.post('/follow/:id', auth, async (req,res) => {
  try {
    const user = await User.findById(req.params.id);
    const user2 = await User.findById(req.user.id);
    if(req.params.id == req.user.id){
      return res.status(400).json({ msg: 'You cannot follow yourself' });
    }

    //check if the post is liked by the same user
    if(user.follow.filter(like => like.user.toString() === req.user.id).length > 0) {
      return res.status(400).json({ msg: 'User already followed' });
    }

    user.follow.unshift({ user: req.user.id });
    user2.followi.unshift({ user: req.params.id });

    await user.save();
    await user2.save();

    res.json({ msg: "User followed" });
  }catch(err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/unfollow/:id', auth, async (req,res) => {
  try {
    const user = await User.findById(req.params.id);
    const user2 = await User.findById(req.user.id);
    if(req.params.id == req.user.id){
      return res.status(400).json({ msg: 'You cannot unfollow yourself' });
    }

    //check if the post is not liked by the same user
    if(user.follow.filter(like => like.user.toString() === req.user.id).length === 0) {
      return res.status(400).json({ msg: 'User not followed' });
    }

    //get remove index
    const removeIndex = user.follow.map(like => like.user.toString()).indexOf(req.user.id);
    const removeIndex2 = user2.followi.map(like => like.user.toString()).indexOf(req.params.id);

    user.follow.splice(removeIndex, 1);
    user2.followi.splice(removeIndex2, 1);

    await user.save();
    await user2.save();

    res.json({ msg: "User unfollowed" });
  }catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

//private route used for create a post post api/posts
router.post('/posts',
  [
    auth,
      [
        body('title', 'Please enter title').not().isEmpty(),
        body('description', 'Please enter description').not().isEmpty()
      ]
  ],
  async (req,res) => {
  //validating
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {

    //setting the onject
    const newPost = new Post({
      user: req.user.id,
      title: req.body.title,
      description: req.body.description
    });

    const post = await newPost.save();

    res.json(post);
  }catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

//private route used delete a post delete api/posts/:id
router.delete('/posts/:id', auth, async (req,res) => {
  try {
    const post = await Post.findById(req.params.id);

    if(!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    //check user
    //if the post is by the user or not
    if(post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorised' });
    }

    await post.remove();

    res.json({ msg: 'Post removed' });
  }catch(err) {
    console.error(err.message);
    //if the id is wrong
    if(err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Server error');
  }
});

//private route used like a post put api/posts/like/:id
router.post('/like/:id', auth, async (req,res) => {
  try {
    const post = await Post.findById(req.params.id);

    //check if the post is liked by the same user
    if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
      return res.status(400).json({ msg: 'Post is liked' });
    }

    post.likes.unshift({ user: req.user.id });

    await post.save();

    res.json({ msg: "Post Liked" });
  }catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

//private route used like a post put api/posts/unlike/:id
router.post('/unlike/:id', auth, async (req,res) => {
  try {
    const post = await Post.findById(req.params.id);

    //check if the post is not liked by the same user
    if(post.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
      return res.status(400).json({ msg: 'Post is not liked' });
    }

    //get remove index
    const removeIndex = post.likes.map(like => like.user.toString()).indexOf(req.user.id);

    post.likes.splice(removeIndex, 1);

    await post.save();

    res.json({ msg: "Post UnLiked " });
  }catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// //private route used for create a comment post api/posts/comment/:id
router.post('/comment/:id',
  [
    auth,
      [
        body('text', 'Please enter text').not().isEmpty()
      ]
  ],
  async (req,res) => {
  //validating
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const post = await Post.findById(req.params.id);

    //setting up thr object
    const newComment = {
      user: req.user.id,
      text: req.body.text
    };

    post.comments.unshift(newComment);

     await post.save();

     const post2 = await Post.findById(req.params.id);

    res.json(post2.comments[0]._id);
  }catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

//private route used for getting all the posts get api/posts
router.get('/all_posts', async (req,res) => {
  try {
    const posts = await Post.find().sort({ date: -1 }).select('-likes').select('-comments').select('-no_Like').select('-no_Comment');

    res.json(posts);
  }catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

//private route used for getting the particular post from a user get api/posts/:id
router.get('/posts/:id', async (req,res) => {
  try {
    const post = await Post.findById(req.params.id);
    const post2 = await Post.findById(req.params.id).select('-likes');

    if(!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }
    post2.no_Like = post.likes.length;
    post2.no_Comment = post.comments.length;

    res.json(post2);
  }catch(err) {
    console.error(err.message);
    //if the id is wrong
    if(err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;
