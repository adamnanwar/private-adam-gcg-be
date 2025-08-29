const AOIService = require('../aoi.service');
const AOIRepository = require('../aoi.repository');

// Mock the repository
jest.mock('../aoi.repository');

describe('AOIService', () => {
  let aoiService;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      createAOI: jest.fn(),
      findAOIById: jest.fn(),
      updateAOI: jest.fn(),
      deleteAOI: jest.fn(),
      findAllAOI: jest.fn(),
      findAOIByAssessment: jest.fn(),
      validateTargetId: jest.fn(),
      getAOIStats: jest.fn(),
      getAOIWithTargetDetails: jest.fn()
    };

    aoiService = new AOIService({});
    // Mock the repository methods directly
    aoiService.repository = mockRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAOI', () => {
    it('should create AOI successfully', async () => {
      const aoiData = {
        assessment_id: 'test-assessment',
        target_type: 'assessment_factor',
        target_id: 'test-factor',
        recommendation: 'Improve performance',
        due_date: '2024-12-31',
        status: 'open',
        created_by: '11111111-1111-1111-1111-111111111111'
      };
      const expectedAOI = {
        id: 'aoi-id',
        ...aoiData
      };

      mockRepository.validateTargetId.mockResolvedValue(true);
      mockRepository.createAOI.mockResolvedValue(expectedAOI);

      const result = await aoiService.createAOI(aoiData);

      expect(mockRepository.validateTargetId).toHaveBeenCalledWith(
        aoiData.assessment_id,
        aoiData.target_type,
        aoiData.target_id
      );
      expect(mockRepository.createAOI).toHaveBeenCalledWith(expect.objectContaining({
        assessment_id: aoiData.assessment_id,
        target_type: aoiData.target_type,
        target_id: aoiData.target_id,
        recommendation: aoiData.recommendation,
        due_date: aoiData.due_date,
        status: aoiData.status,
        created_by: aoiData.created_by
      }));
      expect(result).toEqual(expectedAOI);
    });

    it('should throw error if target validation fails', async () => {
      const aoiData = {
        assessment_id: 'test-assessment',
        target_type: 'assessment_factor',
        target_id: 'invalid-factor',
        recommendation: 'Improve performance',
        created_by: '11111111-1111-1111-1111-111111111111'
      };

      mockRepository.validateTargetId.mockResolvedValue(false);

      await expect(aoiService.createAOI(aoiData)).rejects.toThrow(
        'Failed to create AOI: Target ID does not exist in the specified assessment'
      );
    });

    it('should throw error for invalid target type', async () => {
      const aoiData = {
        assessment_id: 'test-assessment',
        target_type: 'invalid_type',
        target_id: 'test-target',
        recommendation: 'Improve performance',
        created_by: '11111111-1111-1111-1111-111111111111'
      };

      await expect(aoiService.createAOI(aoiData)).rejects.toThrow(
        'Failed to create AOI: Invalid target type. Must be one of: assessment_aspect, assessment_parameter, assessment_factor'
      );
    });
  });

  describe('updateAOI', () => {
    it('should update AOI successfully', async () => {
      const aoiId = 'test-aoi';
      const updateData = {
        recommendation: 'Updated recommendation',
        status: 'in_progress'
      };
      const existingAOI = {
        id: aoiId,
        assessment_id: 'test-assessment',
        target_type: 'assessment_factor',
        target_id: 'test-factor'
      };
      const expectedAOI = {
        id: aoiId,
        ...existingAOI,
        ...updateData
      };

      mockRepository.findAOIById.mockResolvedValue(existingAOI);
      mockRepository.validateTargetId.mockResolvedValue(true);
      mockRepository.updateAOI.mockResolvedValue(expectedAOI);

      const result = await aoiService.updateAOI(aoiId, updateData);

      expect(mockRepository.updateAOI).toHaveBeenCalledWith(aoiId, updateData);
      expect(result).toEqual(expectedAOI);
    });

    it('should throw error if AOI not found', async () => {
      const aoiId = 'test-aoi';
      const updateData = { recommendation: 'Updated' };

      mockRepository.findAOIById.mockResolvedValue(null);

      await expect(aoiService.updateAOI(aoiId, updateData)).rejects.toThrow(
        'AOI not found'
      );
    });

    it('should validate target if target_type or target_id is updated', async () => {
      const aoiId = 'test-aoi';
      const updateData = {
        target_type: 'assessment_parameter',
        target_id: 'new-parameter'
      };
      const existingAOI = {
        id: aoiId,
        assessment_id: 'test-assessment',
        target_type: 'assessment_factor',
        target_id: 'test-factor'
      };

      mockRepository.findAOIById.mockResolvedValue(existingAOI);
      mockRepository.validateTargetId.mockResolvedValue(true);
      mockRepository.updateAOI.mockResolvedValue({ ...existingAOI, ...updateData });

      await aoiService.updateAOI(aoiId, updateData);

      expect(mockRepository.validateTargetId).toHaveBeenCalledWith(
        existingAOI.assessment_id,
        updateData.target_type,
        updateData.target_id
      );
    });
  });

  describe('deleteAOI', () => {
    it('should delete AOI successfully', async () => {
      const aoiId = 'test-aoi';
      const existingAOI = {
        id: aoiId,
        assessment_id: 'test-assessment'
      };

      mockRepository.findAOIById.mockResolvedValue(existingAOI);
      mockRepository.deleteAOI.mockResolvedValue(true);

      const result = await aoiService.deleteAOI(aoiId);

      expect(mockRepository.deleteAOI).toHaveBeenCalledWith(aoiId);
      expect(result).toBe(true);
    });

    it('should throw error if AOI not found', async () => {
      const aoiId = 'test-aoi';

      mockRepository.findAOIById.mockResolvedValue(null);

      await expect(aoiService.deleteAOI(aoiId)).rejects.toThrow(
        'AOI not found'
      );
    });
  });

  describe('getAOIById', () => {
    it('should get AOI by ID successfully', async () => {
      const aoiId = 'test-aoi';
      const expectedAOI = {
        id: aoiId,
        assessment_id: 'test-assessment',
        target_type: 'assessment_factor',
        target_id: 'test-factor',
        recommendation: 'Improve performance'
      };

      mockRepository.findAOIById.mockResolvedValue(expectedAOI);

      const result = await aoiService.getAOIById(aoiId);

      expect(mockRepository.findAOIById).toHaveBeenCalledWith(aoiId);
      expect(result).toEqual(expectedAOI);
    });

    it('should throw error if AOI not found', async () => {
      const aoiId = 'test-aoi';

      mockRepository.findAOIById.mockResolvedValue(null);

      await expect(aoiService.getAOIById(aoiId)).rejects.toThrow(
        'Failed to get AOI: AOI not found'
      );
    });
  });

  describe('getAllAOI', () => {
    it('should get all AOIs with pagination', async () => {
      const options = {
        page: 1,
        limit: 10,
        search: 'test',
        status: 'open',
        assessment_id: 'test-assessment'
      };
      const expectedResult = {
        data: [
          {
            id: 'aoi-1',
            recommendation: 'Test recommendation 1'
          },
          {
            id: 'aoi-2',
            recommendation: 'Test recommendation 2'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      };

      mockRepository.findAllAOI.mockResolvedValue(expectedResult);

      const result = await aoiService.getAllAOI(options);

      expect(mockRepository.findAllAOI).toHaveBeenCalledWith(options);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAOIByAssessment', () => {
    it('should get AOIs by assessment ID', async () => {
      const assessmentId = 'test-assessment';
      const expectedAOIs = [
        {
          id: 'aoi-1',
          assessment_id: assessmentId,
          recommendation: 'Test recommendation 1'
        }
      ];

      mockRepository.findAOIByAssessment.mockResolvedValue(expectedAOIs);

      const result = await aoiService.getAOIByAssessment(assessmentId);

      expect(mockRepository.findAOIByAssessment).toHaveBeenCalledWith(assessmentId);
      expect(result).toEqual(expectedAOIs);
    });
  });

  describe('getAOIStats', () => {
    it('should get AOI statistics', async () => {
      const expectedStats = {
        byStatus: {
          open: 5,
          in_progress: 3,
          completed: 2
        },
        total: 10
      };

      mockRepository.getAOIStats.mockResolvedValue(expectedStats);

      const result = await aoiService.getAOIStats();

      expect(mockRepository.getAOIStats).toHaveBeenCalled();
      expect(result).toEqual(expectedStats);
    });
  });

  describe('getAOIWithTargetDetails', () => {
    it('should get AOI with target details', async () => {
      const aoiId = 'test-aoi';
      const expectedAOI = {
        id: aoiId,
        target_type: 'assessment_factor',
        target_id: 'test-factor',
        targetDetails: {
          kode: 'FACTOR-001',
          nama: 'Test Factor'
        }
      };

      mockRepository.getAOIWithTargetDetails.mockResolvedValue(expectedAOI);

      const result = await aoiService.getAOIWithTargetDetails(aoiId);

      expect(mockRepository.getAOIWithTargetDetails).toHaveBeenCalledWith(aoiId);
      expect(result).toEqual(expectedAOI);
    });
  });
});
