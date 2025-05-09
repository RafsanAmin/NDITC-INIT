const router = require('express').Router();
const {
  qrAdminReg,
  qrAdminLogin,
  getQRUser,
  deleteQrUser,
  allQRUsers,
  qrLogOut,
  scanQr,
  updateEventInfo,
  qrSearchText,
  scanQrEmail,
  setCheckIn,
} = require('../controllers/qrScanner');
const adminValidate = require('../middlewares/adminTokenVerify');
const { qrValidate } = require('../middlewares/qrValidations');

router.get('/all', adminValidate, allQRUsers);
router.post('/reg', adminValidate, qrAdminReg);
router.post('/login', qrAdminLogin);
router.post('/logOut', qrValidate, qrLogOut);
router.get('/qrAdmin', qrValidate, getQRUser);
router.get('/search/:text', qrValidate, qrSearchText);
router.delete('/delete/:id', adminValidate, deleteQrUser);

//scanning functionality
router.post('/scan/', qrValidate, scanQrEmail);
router.post('/scan/:code', qrValidate, scanQr);
router.post('/updateEvent/:code', qrValidate, updateEventInfo);
router.post('/checkIn/:id', qrValidate, setCheckIn);

module.exports = router;
