process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:5173';

const request = require('supertest');
const app = require('../index');

describe('API smoke tests', () => {
  test('GET /health returns ok status', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  test('GET /api/auth/profile without token returns 401', async () => {
    const response = await request(app).get('/api/auth/profile');

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  test('GET /api/projects without token returns 401', async () => {
    const response = await request(app).get('/api/projects');

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  test('CORS allows configured origin on preflight', async () => {
    const response = await request(app)
      .options('/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  test('CORS blocks disallowed origin on preflight', async () => {
    const response = await request(app)
      .options('/health')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty('error', 'CORS origin denied');
  });
});
