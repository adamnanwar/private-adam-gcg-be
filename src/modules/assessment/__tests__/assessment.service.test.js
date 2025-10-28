jest.mock('../assessment.repository');

const AssessmentService = require('../assessment.service');
const AssessmentRepository = require('../assessment.repository');

describe('AssessmentService', () => {
  let assessmentService;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      createAssessment: jest.fn(),
      findAssessmentById: jest.fn(),
      updateAssessment: jest.fn(),
      deleteAssessment: jest.fn(),
      getAllAssessments: jest.fn(),
      getAssessmentResponses: jest.fn(),
      createResponse: jest.fn(),
      updateResponse: jest.fn(),
      deleteResponse: jest.fn(),
      bulkUpsertResponses: jest.fn(),
      getAssessmentResults: jest.fn(),
      getAssessmentWithResults: jest.fn(),
      updateAssessmentStatus: jest.fn(),
      getAssessmentStats: jest.fn(),
      createAssessmentFromTemplate: jest.fn()
    };

    assessmentService = new AssessmentService.constructor();
    assessmentService.repository = mockRepository;
    assessmentService.dictionaryRepository = {
      findFactorById: jest.fn().mockResolvedValue({ id: 'test-factor', nama: 'Test Factor', max_score: 10 })
    };
    assessmentService._hasAdminRole = jest.fn().mockResolvedValue(false);
    assessmentService.repository.findResponseByAssessmentAndFactor = jest.fn().mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAssessment', () => {
    it('should create assessment successfully', async () => {
      const assessmentData = {
        title: 'Test Organization',
        assessment_date: '2024-12-31',
        notes: 'Test notes'
      };
      const userId = '11111111-1111-1111-1111-111111111111';
      const expectedAssessment = {
        id: 'test-id',
        ...assessmentData,
        assessor_id: userId,
        status: 'draft'
      };

      mockRepository.createAssessment.mockResolvedValue(expectedAssessment);

      const result = await assessmentService.createAssessment(assessmentData, userId);

      expect(mockRepository.createAssessment).toHaveBeenCalledWith({
        ...assessmentData,
        assessor_id: userId,
        status: 'draft',
        notes: 'Test notes'
      });
      expect(result).toEqual(expectedAssessment);
    });

    it('should use provided assessor_id if available', async () => {
      const assessmentData = {
        title: 'Test Organization',
        assessment_date: '2024-12-31',
        assessor_id: 'custom-assessor-id'
      };
      const userId = '11111111-1111-1111-1111-111111111111';

      mockRepository.createAssessment.mockResolvedValue({ id: 'test-id' });

      await assessmentService.createAssessment(assessmentData, userId);

      expect(mockRepository.createAssessment).toHaveBeenCalledWith({
        ...assessmentData,
        status: 'draft',
        notes: ''
      });
    });
  });

  describe('updateAssessment', () => {
    it('should update assessment successfully', async () => {
      const assessmentId = 'test-id';
      const updateData = {
        title: 'Updated Organization'
      };
      const userId = '11111111-1111-1111-1111-111111111111';
      const existingAssessment = {
        id: assessmentId,
        assessor_id: userId,
        title: 'Old Organization'
      };

      mockRepository.findAssessmentById.mockResolvedValue(existingAssessment);
      mockRepository.updateAssessment.mockResolvedValue({ id: assessmentId, ...updateData });
      assessmentService._hasAdminRole.mockResolvedValue(true);

      const result = await assessmentService.updateAssessment(assessmentId, updateData, userId);

      expect(mockRepository.updateAssessment).toHaveBeenCalledWith(assessmentId, updateData);
      expect(result).toEqual({ id: assessmentId, ...updateData });
    });

    it('should throw error if assessment not found', async () => {
      const assessmentId = 'test-id';
      const updateData = { title: 'Updated' };
      const userId = '11111111-1111-1111-1111-111111111111';

      mockRepository.findAssessmentById.mockResolvedValue(null);

      await expect(
        assessmentService.updateAssessment(assessmentId, updateData, userId)
      ).rejects.toThrow('Assessment not found');
    });

    it('should throw error if user is not assessor or admin', async () => {
      const assessmentId = 'test-id';
      const updateData = { title: 'Updated' };
      const userId = '11111111-1111-1111-1111-111111111111';
      const existingAssessment = {
        id: assessmentId,
        assessor_id: 'different-user-id'
      };

      mockRepository.findAssessmentById.mockResolvedValue(existingAssessment);

      await expect(
        assessmentService.updateAssessment(assessmentId, updateData, userId)
      ).rejects.toThrow('You can only update your own assessments');
    });
  });

  describe('deleteAssessment', () => {
    it('should delete assessment successfully', async () => {
      const assessmentId = 'test-id';
      const userId = '11111111-1111-1111-1111-111111111111';
      const existingAssessment = {
        id: assessmentId,
        assessor_id: userId
      };

      mockRepository.findAssessmentById.mockResolvedValue(existingAssessment);
      mockRepository.deleteAssessment.mockResolvedValue(true);

      const result = await assessmentService.deleteAssessment(assessmentId, userId);

      expect(mockRepository.deleteAssessment).toHaveBeenCalledWith(assessmentId);
      expect(result).toEqual({ message: "Assessment deleted successfully", success: true });
    });
  });

  describe('getAssessmentResponses', () => {
    it('should get assessment responses successfully', async () => {
      const assessmentId = 'test-id';
      const userId = '11111111-1111-1111-1111-111111111111';
      const assessment = {
        id: assessmentId,
        assessor_id: userId
      };
      const expectedResponses = [
        { id: 'response-1', score: 5, comment: 'Good' }
      ];

      mockRepository.findAssessmentById.mockResolvedValue(assessment);
      mockRepository.findResponsesByAssessment = jest.fn().mockResolvedValue(expectedResponses);
      assessmentService._hasAdminRole.mockResolvedValue(true);

      const result = await assessmentService.getAssessmentResponses(assessmentId, userId);

      expect(mockRepository.findResponsesByAssessment).toHaveBeenCalledWith(assessmentId);
      expect(result).toEqual(expectedResponses);
    });
  });

  describe('createResponse', () => {
    it('should create response successfully', async () => {
      const responseData = {
        assessment_id: 'test-assessment',
        factor_id: 'test-factor',
        score: 5,
        comment: 'Good performance'
      };
      const userId = '11111111-1111-1111-1111-111111111111';
      const assessment = {
        id: 'test-assessment',
        assessor_id: userId
      };
      const expectedResponse = {
        id: 'response-id',
        ...responseData,
        created_by: userId
      };

      mockRepository.findAssessmentById.mockResolvedValue(assessment);
      mockRepository.createResponse.mockResolvedValue(expectedResponse);
      assessmentService._hasAdminRole.mockResolvedValue(true);

      const result = await assessmentService.createResponse(responseData, userId);

      expect(mockRepository.createResponse).toHaveBeenCalledWith({
        ...responseData,
        created_by: userId
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('_hasAdminRole', () => {
    it('should return true for admin user', async () => {
      assessmentService._hasAdminRole.mockResolvedValue(true);
      expect(await assessmentService._hasAdminRole()).toBe(true);
    });

    it('should return false for non-admin user', async () => {
      assessmentService._hasAdminRole.mockResolvedValue(false);
      expect(await assessmentService._hasAdminRole()).toBe(false);
    });
  });
});
