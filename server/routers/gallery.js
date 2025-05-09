const router = require('express').Router();
const {
  addGalleryImage,
  updateGalleryImg,
  getGalleryImages,
  deleteImg,
} = require('../controllers/gallery');
const adminValidate = require('../middlewares/adminTokenVerify');
const upload = require('../middlewares/uploadFile');

router.get('/', getGalleryImages);
router.post('/addImage', adminValidate, upload.single('gallery'), addGalleryImage);
router.patch('/update/:id', adminValidate, updateGalleryImg);
router.delete('/delete/:id', adminValidate, deleteImg);

module.exports = router;
