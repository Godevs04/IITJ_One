/**
 * OpenAPI 3.1 document for IITJ One API — consumed by Scalar at /api/v1/docs
 */
export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'IITJ One API',
    version: '1.0.0',
    description:
      'Campus data API for the IITJ One mobile app and admin console. Public routes are open; `/admin/*` requires a Bearer access token from `POST /admin/login`.',
    contact: { name: 'IITJ One', email: 'godevsteam@gmail.com' },
  },
  servers: [
    { url: 'http://localhost:6002/api/v1', description: 'Local' },
    { url: '/api/v1', description: 'Same origin / reverse proxy' },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Sync' },
    { name: 'Public modules' },
    { name: 'Suggestions' },
    { name: 'Auth' },
    { name: 'Admin — content' },
    { name: 'Admin — campus data' },
    { name: 'Admin — ops' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token from POST /admin/login',
      },
    },
    parameters: {
      CampusQuery: {
        name: 'campus',
        in: 'query',
        required: false,
        schema: { type: 'string', default: 'iitj' },
        description: 'Campus id (default iitj)',
      },
      CategoryQuery: {
        name: 'category',
        in: 'query',
        required: false,
        schema: { type: 'string' },
      },
      NoticeId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Mongo ObjectId or fallback id',
      },
      SuggestionId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
        required: ['error'],
      },
      Success: {
        type: 'object',
        properties: { success: { type: 'boolean' } },
        required: ['success'],
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded'] },
          service: { type: 'string' },
          storage: { type: 'string', enum: ['mongodb', 'fallback'] },
          writableAdmin: { type: 'boolean' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      Manifest: {
        type: 'object',
        properties: {
          campusId: { type: 'string' },
          versions: { type: 'object', additionalProperties: { type: 'integer' } },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AdminUser: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          admin: { $ref: '#/components/schemas/AdminUser' },
        },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
      CampusIdBody: {
        type: 'object',
        required: ['campusId'],
        properties: { campusId: { type: 'string', example: 'iitj' } },
      },
      MealItems: {
        type: 'object',
        properties: {
          veg: { type: 'string' },
          nonVeg: { type: 'string' },
        },
      },
      MenuDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            required: ['month', 'days'],
            properties: {
              month: { type: 'string', example: '2026-07' },
              days: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    dayName: { type: 'string' },
                    breakfast: { $ref: '#/components/schemas/MealItems' },
                    lunch: { $ref: '#/components/schemas/MealItems' },
                    snacks: { $ref: '#/components/schemas/MealItems' },
                    dinner: { $ref: '#/components/schemas/MealItems' },
                    specialNote: { type: 'string' },
                  },
                },
              },
            },
          },
        ],
      },
      MenuImport: {
        type: 'object',
        required: ['campusId', 'month', 'vegCsv', 'nonVegCsv'],
        properties: {
          campusId: { type: 'string' },
          month: { type: 'string' },
          vegCsv: { type: 'string' },
          nonVegCsv: { type: 'string' },
        },
      },
      Notice: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          campusId: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          category: { type: 'string' },
          isImportant: { type: 'boolean' },
          link: { type: 'string' },
          imageUrl: { type: 'string' },
          startDate: { type: 'string' },
          expiryDate: { type: 'string' },
          publishedAt: { type: 'string' },
          deletedAt: { type: 'string', nullable: true },
        },
      },
      NoticeCreate: {
        type: 'object',
        required: ['campusId', 'title', 'body', 'category', 'startDate', 'expiryDate'],
        properties: {
          campusId: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          category: { type: 'string' },
          isImportant: { type: 'boolean', default: false },
          link: { type: 'string' },
          imageUrl: { type: 'string' },
          startDate: { type: 'string' },
          expiryDate: { type: 'string' },
        },
      },
      TransportDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              routes: { type: 'array', items: { type: 'object', additionalProperties: true } },
              shuttle: { type: 'array', items: {} },
              liveTrackingUrl: { type: 'string', nullable: true },
              scheduleOverrides: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        ],
      },
      CalendarDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              semester: { type: 'string' },
              events: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        ],
      },
      PortalsDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              links: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        ],
      },
      AppsDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              apps: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        ],
      },
      MapDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              locations: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        ],
      },
      ServicesDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              entries: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        ],
      },
      EmergencyDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              contacts: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        ],
      },
      AboutDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              sections: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        ],
      },
      LaundryDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              schedules: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        ],
      },
      WifiDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              providers: { type: 'array', items: { type: 'string' } },
              guides: { type: 'array', items: { type: 'object', additionalProperties: true } },
              notes: { type: 'string' },
            },
          },
        ],
      },
      ErickshawDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              service: { type: 'object', additionalProperties: true },
              drivers: { type: 'array', items: { type: 'object', additionalProperties: true } },
              fares: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        ],
      },
      MealWindowsDoc: {
        allOf: [
          { $ref: '#/components/schemas/CampusIdBody' },
          {
            type: 'object',
            properties: {
              windows: {
                type: 'object',
                properties: {
                  breakfast: { type: 'object', additionalProperties: true },
                  lunch: { type: 'object', additionalProperties: true },
                  snacks: { type: 'object', additionalProperties: true },
                  dinner: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        ],
      },
      SuggestionCreate: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', minLength: 1, maxLength: 2000 },
        },
      },
      SuggestionStatus: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['new', 'read', 'archived'] },
        },
      },
      PushBody: {
        type: 'object',
        required: ['topic', 'title', 'body'],
        properties: {
          topic: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          data: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Service status',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
          },
        },
      },
    },
    '/sync/manifest': {
      get: {
        tags: ['Sync'],
        summary: 'Sync version manifest',
        operationId: 'getSyncManifest',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: {
          '200': {
            description: 'Module versions',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Manifest' } } },
          },
        },
      },
    },
    '/home': {
      get: {
        tags: ['Public modules'],
        summary: 'Home dashboard bundle',
        operationId: 'getHome',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: { '200': { description: 'Home bundle JSON' } },
      },
    },
    '/menu': {
      get: {
        tags: ['Public modules'],
        summary: 'Mess menu',
        operationId: 'getMenu',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: {
          '200': {
            description: 'Menu document',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MenuDoc' } } },
          },
          '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/notices': {
      get: {
        tags: ['Public modules'],
        summary: 'Published notices (active window, not deleted)',
        operationId: 'getNotices',
        parameters: [
          { $ref: '#/components/parameters/CampusQuery' },
          { $ref: '#/components/parameters/CategoryQuery' },
        ],
        responses: { '200': { description: 'Notices list wrapper' } },
      },
    },
    '/transport': {
      get: {
        tags: ['Public modules'],
        summary: 'Transport schedules',
        operationId: 'getTransport',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: {
          '200': {
            description: 'Transport doc',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TransportDoc' } } },
          },
          '404': { description: 'Not found' },
        },
      },
    },
    '/calendar': {
      get: {
        tags: ['Public modules'],
        summary: 'Academic calendar',
        operationId: 'getCalendar',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: { '200': { description: 'Calendar doc' }, '404': { description: 'Not found' } },
      },
    },
    '/portals': {
      get: {
        tags: ['Public modules'],
        summary: 'Portal links',
        operationId: 'getPortals',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: { '200': { description: 'Portals doc' }, '404': { description: 'Not found' } },
      },
    },
    '/apps': {
      get: {
        tags: ['Public modules'],
        summary: 'Campus apps directory',
        operationId: 'getApps',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: { '200': { description: 'Apps doc' }, '404': { description: 'Not found' } },
      },
    },
    '/map': {
      get: {
        tags: ['Public modules'],
        summary: 'Map locations',
        operationId: 'getMap',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: { '200': { description: 'Map locations doc' }, '404': { description: 'Not found' } },
      },
    },
    '/services': {
      get: {
        tags: ['Public modules'],
        summary: 'Campus services directory',
        operationId: 'getServices',
        parameters: [
          { $ref: '#/components/parameters/CampusQuery' },
          { $ref: '#/components/parameters/CategoryQuery' },
          {
            name: 'q',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Search query',
          },
        ],
        responses: { '200': { description: 'Services doc' }, '404': { description: 'Not found' } },
      },
    },
    '/emergency': {
      get: {
        tags: ['Public modules'],
        summary: 'Emergency contacts',
        operationId: 'getEmergency',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: { '200': { description: 'Emergency doc' }, '404': { description: 'Not found' } },
      },
    },
    '/about': {
      get: {
        tags: ['Public modules'],
        summary: 'About sections',
        operationId: 'getAbout',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: { '200': { description: 'About doc' }, '404': { description: 'Not found' } },
      },
    },
    '/laundry': {
      get: {
        tags: ['Public modules'],
        summary: 'Laundry schedules',
        operationId: 'getLaundry',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: { '200': { description: 'Laundry doc' }, '404': { description: 'Not found' } },
      },
    },
    '/wifi': {
      get: {
        tags: ['Public modules'],
        summary: 'Wi-Fi guides',
        operationId: 'getWifi',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: { '200': { description: 'Wi-Fi doc' }, '404': { description: 'Not found' } },
      },
    },
    '/erickshaw': {
      get: {
        tags: ['Public modules'],
        summary: 'E-rickshaw service',
        operationId: 'getErickshaw',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: { '200': { description: 'E-rickshaw doc' }, '404': { description: 'Not found' } },
      },
    },
    '/mealWindows': {
      get: {
        tags: ['Public modules'],
        summary: 'Meal serving windows',
        operationId: 'getMealWindows',
        parameters: [{ $ref: '#/components/parameters/CampusQuery' }],
        responses: { '200': { description: 'Meal windows doc' }, '404': { description: 'Not found' } },
      },
    },
    '/suggestions': {
      post: {
        tags: ['Suggestions'],
        summary: 'Submit anonymous suggestion',
        operationId: 'postSuggestion',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SuggestionCreate' } },
          },
        },
        responses: {
          '200': { description: 'Accepted' },
          '201': { description: 'Created' },
        },
      },
    },

    '/admin/login': {
      post: {
        tags: ['Auth'],
        summary: 'Admin login',
        operationId: 'adminLogin',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Tokens',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
            },
          },
          '401': { description: 'Invalid credentials' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/admin/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        operationId: 'adminRefresh',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'New tokens',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
            },
          },
          '401': { description: 'Invalid refresh token' },
        },
      },
    },
    '/admin/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current admin profile',
        operationId: 'adminMe',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Admin user',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AdminUser' } },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },

    '/admin/menu': {
      put: {
        tags: ['Admin — content'],
        summary: 'Publish mess menu',
        operationId: 'putMenu',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MenuDoc' } } },
        },
        responses: {
          '200': { description: 'Published', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/admin/menu/import': {
      post: {
        tags: ['Admin — content'],
        summary: 'Import menu from veg + non-veg CSV',
        operationId: 'importMenu',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MenuImport' } } },
        },
        responses: { '200': { description: 'Import result' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/admin/notices': {
      get: {
        tags: ['Admin — content'],
        summary: 'List all notices (incl. scheduled / expired / trash)',
        operationId: 'adminListNotices',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/CampusQuery' },
          { $ref: '#/components/parameters/CategoryQuery' },
        ],
        responses: { '200': { description: 'Notices wrapper' } },
      },
      post: {
        tags: ['Admin — content'],
        summary: 'Create notice',
        operationId: 'createNotice',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NoticeCreate' } } },
        },
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Notice' } } },
          },
        },
      },
    },
    '/admin/notices/{id}': {
      patch: {
        tags: ['Admin — content'],
        summary: 'Update notice',
        operationId: 'patchNotice',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/NoticeId' }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NoticeCreate' } } },
        },
        responses: {
          '200': { description: 'Updated' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Admin — content'],
        summary: 'Soft-delete notice (trash)',
        operationId: 'deleteNotice',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/NoticeId' }],
        responses: {
          '200': { description: 'Trashed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
          '404': { description: 'Not found' },
        },
      },
    },
    '/admin/notices/{id}/restore': {
      post: {
        tags: ['Admin — content'],
        summary: 'Restore soft-deleted notice',
        operationId: 'restoreNotice',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/NoticeId' }],
        responses: {
          '200': { description: 'Restored notice' },
          '404': { description: 'Not found or not deleted' },
        },
      },
    },

    '/admin/transport': modulePut('Admin — campus data', 'putTransport', 'TransportDoc', 'Publish transport'),
    '/admin/calendar': modulePut('Admin — campus data', 'putCalendar', 'CalendarDoc', 'Publish calendar'),
    '/admin/portals': modulePut('Admin — campus data', 'putPortals', 'PortalsDoc', 'Publish portals'),
    '/admin/apps': modulePut('Admin — campus data', 'putApps', 'AppsDoc', 'Publish apps'),
    '/admin/map': modulePut('Admin — campus data', 'putMap', 'MapDoc', 'Publish map locations'),
    '/admin/services': modulePut('Admin — campus data', 'putServices', 'ServicesDoc', 'Publish services'),
    '/admin/emergency': modulePut('Admin — campus data', 'putEmergency', 'EmergencyDoc', 'Publish emergency contacts'),
    '/admin/about': modulePut('Admin — campus data', 'putAbout', 'AboutDoc', 'Publish about'),
    '/admin/laundry': modulePut('Admin — campus data', 'putLaundry', 'LaundryDoc', 'Publish laundry'),
    '/admin/wifi': modulePut('Admin — campus data', 'putWifi', 'WifiDoc', 'Publish Wi-Fi'),
    '/admin/erickshaw': modulePut('Admin — campus data', 'putErickshaw', 'ErickshawDoc', 'Publish e-rickshaw'),
    '/admin/mealWindows': modulePut('Admin — campus data', 'putMealWindows', 'MealWindowsDoc', 'Publish meal windows'),

    '/admin/push': {
      post: {
        tags: ['Admin — ops'],
        summary: 'Send FCM topic push',
        operationId: 'sendPush',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PushBody' } } },
        },
        responses: {
          '200': { description: 'Sent' },
          '502': { description: 'FCM failure' },
          '503': { description: 'FCM not configured' },
        },
      },
    },
    '/admin/uploads/sign': {
      post: {
        tags: ['Admin — ops'],
        summary: 'Cloudinary signed upload params',
        operationId: 'signUpload',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Signature payload' },
          '503': { description: 'Cloudinary not configured' },
        },
      },
    },
    '/admin/suggestions': {
      get: {
        tags: ['Admin — ops'],
        summary: 'List suggestions inbox',
        operationId: 'listSuggestions',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Suggestions list' } },
      },
    },
    '/admin/suggestions/{id}': {
      patch: {
        tags: ['Admin — ops'],
        summary: 'Update suggestion status',
        operationId: 'patchSuggestion',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/SuggestionId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SuggestionStatus' } },
          },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
    },
    '/admin/audit': {
      get: {
        tags: ['Admin — ops'],
        summary: 'Audit log',
        operationId: 'getAudit',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 100 },
          },
        ],
        responses: { '200': { description: 'Audit entries' } },
      },
    },
  },
} as const;

function modulePut(
  tag: string,
  operationId: string,
  schemaName: string,
  summary: string,
) {
  return {
    put: {
      tags: [tag],
      summary,
      operationId,
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } },
        },
      },
      responses: {
        '200': {
          description: 'Published',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Success' } },
          },
        },
        '401': { description: 'Unauthorized' },
      },
    },
  };
}
