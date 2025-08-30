/**
 * @jest-environment node
 */
import { GET, POST } from './route';

// Mock the DPEService
jest.mock('../../../services/dpeService', () => ({
  DPEService: {
    fetchDPEData: jest.fn()
  }
}));

import { DPEService } from '../../../services/dpeService';

describe('/api/dpe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return DPE data successfully', async () => {
      const mockData = {
        success: true,
        data: [
          {
            Adresse_brute: '123 Test Street',
            Classe_energetique: 'C',
            Classe_GES: 'B'
          }
        ],
        total: 1
      };

      DPEService.fetchDPEData.mockResolvedValue(mockData);

      const request = {
        url: 'http://localhost:3000/api/dpe?address=Paris&size=10'
      };

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data).toEqual(mockData.data);
      expect(responseData.total).toBe(1);
      expect(responseData.count).toBe(1);
    });

    it('should handle API errors', async () => {
      const mockError = {
        success: false,
        data: [],
        total: 0,
        error: 'API connection failed'
      };

      DPEService.fetchDPEData.mockResolvedValue(mockError);

      const request = {
        url: 'http://localhost:3000/api/dpe'
      };

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('API connection failed');
    });
  });

  describe('POST', () => {
    it('should handle POST requests with body data', async () => {
      const mockData = {
        success: true,
        data: [{ Adresse_brute: '456 Another Street' }],
        total: 1
      };

      DPEService.fetchDPEData.mockResolvedValue(mockData);

      const request = {
        json: jest.fn().mockResolvedValue({
          address: 'Lyon',
          energyClass: 'B',
          size: 20
        })
      };

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data).toEqual(mockData.data);
      expect(DPEService.fetchDPEData).toHaveBeenCalledWith({
        address: 'Lyon',
        energyClass: 'B',
        ghgClass: undefined,
        size: 20
      });
    });
  });
});
