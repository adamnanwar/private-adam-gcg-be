const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDIiLCJlbWFpbCI6ImFzc2Vzc29yQHRlc3QuY29tIiwicm9sZSI6ImFzc2Vzc29yIiwiaWF0IjoxNzU2MDM5MjA2LCJleHAiOjE3NTYxMjU2MDZ9.0d4xm9AjnC22mfKooCet9-hgFxesMggEJ3DCN5EPqAM';

async function testAssessmentEndpoints() {
  try {
    console.log('Testing Assessment Endpoints...\n');

    // Test 1: Get all assessments
    console.log('1. Testing GET /assessments...');
    try {
      const response = await axios.get(`${API_BASE_URL}/assessments`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ GET /assessments success:', response.data);
    } catch (error) {
      console.log('❌ GET /assessments failed:', error.response?.data || error.message);
    }

    // Test 2: Create assessment
    console.log('\n2. Testing POST /assessments...');
    try {
      const assessmentData = {
        organization_name: 'PT Test Indonesia',
        assessment_date: '2025-01-21',
        notes: 'Test assessment from script'
      };
      
      const response = await axios.post(`${API_BASE_URL}/assessments`, assessmentData, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ POST /assessments success:', response.data);
      
      // Test 3: Create manual assessment with KKA structure
      console.log('\n3. Testing POST /assessments with KKA structure...');
      const manualAssessmentData = {
        organization_name: 'PT Manual Test Indonesia',
        assessment_date: '2025-01-21',
        notes: 'Manual test assessment from script',
        kkas: [
          {
            id: 'kka-test-1',
            kode: 'KKA-TEST-001',
            nama: 'Test KKA',
            deskripsi: 'Test KKA description',
            weight: 1.0,
            aspects: [
              {
                id: 'aspect-test-1',
                kode: 'ASP-TEST-001',
                nama: 'Test Aspect',
                weight: 1.0,
                sort: 0,
                parameters: [
                  {
                    id: 'param-test-1',
                    kode: 'PAR-TEST-001',
                    nama: 'Test Parameter',
                    weight: 1.0,
                    sort: 0,
                    factors: [
                      {
                        id: 'factor-test-1',
                        kode: 'FAK-TEST-001',
                        nama: 'Test Factor',
                        deskripsi: 'Test factor description',
                        max_score: 1,
                        sort: 0
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };
      
      const manualResponse = await axios.post(`${API_BASE_URL}/assessments`, manualAssessmentData, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ POST /assessments with KKA success:', manualResponse.data);
      
    } catch (error) {
      console.log('❌ POST /assessments failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAssessmentEndpoints();



