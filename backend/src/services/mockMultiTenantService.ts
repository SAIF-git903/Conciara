// Mock service with file-based persistence for development
import type { CustomerType, Website, Skin, ABVariation } from './multiTenantService.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const MOCK_DATA_FILE = join(process.cwd(), 'mock-data.json');

interface MockData {
  customerTypes: CustomerType[];
  websites: Website[];
  skins: Skin[];
  abVariations: ABVariation[];
}

function loadMockData(): MockData {
  if (existsSync(MOCK_DATA_FILE)) {
    try {
      const data = readFileSync(MOCK_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // Convert date strings back to Date objects
      return {
        customerTypes: parsed.customerTypes?.map((ct: any) => ({
          ...ct,
          created_at: new Date(ct.created_at),
          updated_at: new Date(ct.updated_at),
        })) || [],
        websites: parsed.websites?.map((w: any) => ({
          ...w,
          created_at: new Date(w.created_at),
          updated_at: new Date(w.updated_at),
        })) || [],
        skins: parsed.skins?.map((s: any) => ({
          ...s,
          created_at: new Date(s.created_at),
          updated_at: new Date(s.updated_at),
        })) || [],
        abVariations: parsed.abVariations?.map((v: any) => ({
          ...v,
          created_at: new Date(v.created_at),
          updated_at: new Date(v.updated_at),
        })) || [],
      };
    } catch (error) {
      console.error('Error loading mock data:', error);
    }
  }
  
  // Initialize with default data
  const defaultData: MockData = {
    customerTypes: [
      { id: 1, name: 'Winery', description: 'Wine producers and vineyards', created_at: new Date(), updated_at: new Date() }
    ],
    websites: [
      { id: 1, customer_type_id: 1, name: 'Domaine Carneros', description: null, created_at: new Date(), updated_at: new Date() }
    ],
    skins: [],
    abVariations: [],
  };
  
  saveMockData(defaultData);
  return defaultData;
}

function saveMockData(data: MockData): void {
  try {
    writeFileSync(MOCK_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving mock data:', error);
  }
}

let mockData = loadMockData();
let nextId = {
  customerType: Math.max(0, ...mockData.customerTypes.map(ct => ct.id)) + 1,
  website: Math.max(0, ...mockData.websites.map(w => w.id)) + 1,
  skin: Math.max(0, ...mockData.skins.map(s => s.id)) + 1,
  abVariation: Math.max(0, ...mockData.abVariations.map(v => v.id)) + 1,
};

export const mockMultiTenantService = {
  getAllCustomerTypes: async (): Promise<CustomerType[]> => {
    mockData = loadMockData();
    return [...mockData.customerTypes];
  },

  getCustomerTypeById: async (id: number): Promise<CustomerType | null> => {
    mockData = loadMockData();
    return mockData.customerTypes.find(ct => ct.id === id) || null;
  },

  createCustomerType: async (name: string, description?: string): Promise<CustomerType> => {
    mockData = loadMockData();
    const customerType: CustomerType = {
      id: nextId.customerType++,
      name,
      description: description || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockData.customerTypes.push(customerType);
    saveMockData(mockData);
    return customerType;
  },

  updateCustomerType: async (id: number, name: string, description?: string): Promise<CustomerType | null> => {
    mockData = loadMockData();
    const customerType = mockData.customerTypes.find(ct => ct.id === id);
    if (!customerType) return null;
    customerType.name = name;
    customerType.description = description || null;
    customerType.updated_at = new Date();
    saveMockData(mockData);
    return customerType;
  },

  deleteCustomerType: async (id: number): Promise<void> => {
    mockData = loadMockData();
    mockData.customerTypes = mockData.customerTypes.filter(ct => ct.id !== id);
    mockData.websites = mockData.websites.filter(w => w.customer_type_id !== id);
    saveMockData(mockData);
  },

  getWebsitesByCustomerType: async (customerTypeId: number): Promise<Website[]> => {
    mockData = loadMockData();
    return mockData.websites.filter(w => w.customer_type_id === customerTypeId);
  },

  getWebsiteById: async (id: number): Promise<Website | null> => {
    mockData = loadMockData();
    return mockData.websites.find(w => w.id === id) || null;
  },

  createWebsite: async (customerTypeId: number, name: string, description?: string): Promise<Website> => {
    mockData = loadMockData();
    const website: Website = {
      id: nextId.website++,
      customer_type_id: customerTypeId,
      name,
      description: description || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockData.websites.push(website);
    saveMockData(mockData);
    return website;
  },

  updateWebsite: async (id: number, name: string, description?: string): Promise<Website | null> => {
    mockData = loadMockData();
    const website = mockData.websites.find(w => w.id === id);
    if (!website) return null;
    website.name = name;
    website.description = description || null;
    website.updated_at = new Date();
    saveMockData(mockData);
    return website;
  },

  deleteWebsite: async (id: number): Promise<void> => {
    mockData = loadMockData();
    mockData.websites = mockData.websites.filter(w => w.id !== id);
    mockData.skins = mockData.skins.filter(s => s.website_id !== id);
    saveMockData(mockData);
  },

  getSkinsByWebsite: async (websiteId: number): Promise<Skin[]> => {
    mockData = loadMockData();
    return mockData.skins.filter(s => s.website_id === websiteId);
  },

  getSkinById: async (id: number): Promise<Skin | null> => {
    mockData = loadMockData();
    return mockData.skins.find(s => s.id === id) || null;
  },

  createSkin: async (websiteId: number, name: string, description?: string, themeConfig?: any): Promise<Skin> => {
    mockData = loadMockData();
    const skin: Skin = {
      id: nextId.skin++,
      website_id: websiteId,
      name,
      description: description || null,
      theme_config: themeConfig || null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockData.skins.push(skin);
    saveMockData(mockData);
    return skin;
  },

  updateSkin: async (id: number, name: string, description?: string, themeConfig?: any): Promise<Skin | null> => {
    mockData = loadMockData();
    const skin = mockData.skins.find(s => s.id === id);
    if (!skin) return null;
    skin.name = name;
    skin.description = description || null;
    skin.theme_config = themeConfig || null;
    skin.updated_at = new Date();
    saveMockData(mockData);
    return skin;
  },

  deleteSkin: async (id: number): Promise<void> => {
    mockData = loadMockData();
    mockData.skins = mockData.skins.filter(s => s.id !== id);
    mockData.abVariations = mockData.abVariations.filter(v => v.skin_id !== id);
    saveMockData(mockData);
  },

  getABVariationsBySkin: async (skinId: number): Promise<ABVariation[]> => {
    mockData = loadMockData();
    return mockData.abVariations.filter(v => v.skin_id === skinId);
  },

  getABVariationById: async (id: number): Promise<ABVariation | null> => {
    mockData = loadMockData();
    return mockData.abVariations.find(v => v.id === id) || null;
  },

  createABVariation: async (
    skinId: number,
    name: string,
    description?: string,
    variationConfig?: any,
    isActive: boolean = true
  ): Promise<ABVariation> => {
    mockData = loadMockData();
    const variation: ABVariation = {
      id: nextId.abVariation++,
      skin_id: skinId,
      name,
      description: description || null,
      variation_config: variationConfig || null,
      is_active: isActive,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockData.abVariations.push(variation);
    saveMockData(mockData);
    return variation;
  },

  updateABVariation: async (
    id: number,
    name: string,
    description?: string,
    variationConfig?: any,
    isActive?: boolean
  ): Promise<ABVariation | null> => {
    mockData = loadMockData();
    const variation = mockData.abVariations.find(v => v.id === id);
    if (!variation) return null;
    variation.name = name;
    variation.description = description || null;
    variation.variation_config = variationConfig || null;
    if (isActive !== undefined) variation.is_active = isActive;
    variation.updated_at = new Date();
    saveMockData(mockData);
    return variation;
  },

  deleteABVariation: async (id: number): Promise<void> => {
    mockData = loadMockData();
    mockData.abVariations = mockData.abVariations.filter(v => v.id !== id);
    saveMockData(mockData);
  },
};

