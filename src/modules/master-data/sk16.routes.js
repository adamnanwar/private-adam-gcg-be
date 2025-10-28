const express = require('express');
const router = express.Router();
const sk16Controller = require('./sk16.controller');
const { authenticateToken } = require('../../middlewares/auth');

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/master-data/sk16
 * @desc    Get all SK16 assessments
 * @access  Private
 */
router.get('/', sk16Controller.getAllSK16Assessments.bind(sk16Controller));

/**
 * @route   GET /api/master-data/sk16/:id
 * @desc    Get single SK16 assessment by ID
 * @access  Private
 */
router.get('/:id', sk16Controller.getSK16AssessmentById.bind(sk16Controller));

/**
 * @route   POST /api/master-data/sk16
 * @desc    Create new SK16 assessment
 * @access  Private
 */
router.post('/', sk16Controller.createSK16Assessment.bind(sk16Controller));

/**
 * @route   PUT /api/master-data/sk16/:id
 * @desc    Update SK16 assessment
 * @access  Private
 */
router.put('/:id', sk16Controller.updateSK16Assessment.bind(sk16Controller));

/**
 * @route   DELETE /api/master-data/sk16/:id
 * @desc    Delete SK16 assessment
 * @access  Private
 */
router.delete('/:id', sk16Controller.deleteSK16Assessment.bind(sk16Controller));

module.exports = router;
