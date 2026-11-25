import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/repositories/menuRepository.js', () => ({
  listAvailableMenus: vi.fn(),
  findPublicMenuBySlug: vi.fn(),
  listMenus: vi.fn(),
  findMenuById: vi.fn(),
  insertMenu: vi.fn(),
  updateMenu: vi.fn(),
  softDeleteMenu: vi.fn(),
}));

const { app } = await import('../src/app.js');
const repo = await import('../src/repositories/menuRepository.js');
const { signAccessToken } = await import('../src/services/authService.js');

const MENU_ID = '0b9c5d7e-2f4a-4b6c-9d8e-1f2a3b4c5d6e';
const MENU = {
  id: MENU_ID,
  slug: 'dimsum-mentai',
  name: 'Dimsum Mentai',
  category: 'makanan',
  price: 25000,
  description: null,
  image_url: null,
  is_available: true,
};
const AUTH = `Bearer ${signAccessToken({ id: '7d0f3c1e-1b2a-4c3d-8e9f-0a1b2c3d4e5f', email: 'owner@djajan.id' })}`;

function slugTaken() {
  return Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'menus_slug_key' });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/menus', () => {
  it('lists available menus without a category filter', async () => {
    vi.mocked(repo.listAvailableMenus).mockResolvedValue([MENU]);

    const res = await request(app).get('/api/menus');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'success', data: { menus: [MENU] } });
    expect(repo.listAvailableMenus).toHaveBeenCalledWith({ category: null });
  });

  it('passes a normalized category filter', async () => {
    vi.mocked(repo.listAvailableMenus).mockResolvedValue([]);

    await request(app).get('/api/menus?category=%20Minuman%20');

    expect(repo.listAvailableMenus).toHaveBeenCalledWith({ category: 'minuman' });
  });

  it('returns 400 for a repeated category parameter', async () => {
    const res = await request(app).get('/api/menus?category=a&category=b');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 'fail', message: 'Filter kategori tidak valid' });
  });
});

describe('GET /api/menus/:slug', () => {
  it('returns one menu', async () => {
    vi.mocked(repo.findPublicMenuBySlug).mockResolvedValue(MENU);

    const res = await request(app).get('/api/menus/dimsum-mentai');

    expect(res.status).toBe(200);
    expect(res.body.data.menu).toEqual(MENU);
  });

  it('returns 404 for an unknown slug', async () => {
    vi.mocked(repo.findPublicMenuBySlug).mockResolvedValue(null);

    const res = await request(app).get('/api/menus/tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ status: 'fail', message: 'Menu tidak ditemukan' });
  });

  it('returns 404 without querying for a malformed slug', async () => {
    const res = await request(app).get('/api/menus/Bukan%20Slug');

    expect(res.status).toBe(404);
    expect(repo.findPublicMenuBySlug).not.toHaveBeenCalled();
  });
});

describe('/api/admin/menus requires login', () => {
  it.each([
    ['get', '/api/admin/menus'],
    ['get', `/api/admin/menus/${MENU_ID}`],
    ['post', '/api/admin/menus'],
    ['put', `/api/admin/menus/${MENU_ID}`],
    ['delete', `/api/admin/menus/${MENU_ID}`],
  ])('%s %s returns 401 without a token', async (method, path) => {
    const res = await request(app)[method](path);

    expect(res.status).toBe(401);
    expect(repo.listMenus).not.toHaveBeenCalled();
    expect(repo.insertMenu).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/menus', () => {
  it('lists all menus including unavailable ones', async () => {
    const soldOut = { ...MENU, id: 'x', is_available: false, cost_price: 13000 };
    vi.mocked(repo.listMenus).mockResolvedValue([soldOut]);

    const res = await request(app).get('/api/admin/menus').set('Authorization', AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.menus).toEqual([soldOut]);
  });

  it('returns one menu by id', async () => {
    vi.mocked(repo.findMenuById).mockResolvedValue(MENU);

    const res = await request(app).get(`/api/admin/menus/${MENU_ID}`).set('Authorization', AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.menu).toEqual(MENU);
  });
});

describe('POST /api/admin/menus', () => {
  const body = { name: 'Dimsum Mentai', category: 'Makanan', price: 25000 };

  it('creates a menu with a slug from its name and defaults', async () => {
    vi.mocked(repo.insertMenu).mockImplementation(async (menu) => ({ id: MENU_ID, ...menu }));

    const res = await request(app).post('/api/admin/menus').set('Authorization', AUTH).send(body);

    expect(res.status).toBe(201);
    expect(repo.insertMenu).toHaveBeenCalledWith({
      slug: 'dimsum-mentai',
      name: 'Dimsum Mentai',
      category: 'makanan',
      price: 25000,
      cost_price: null,
      description: null,
      image_url: null,
      is_available: true,
    });
    expect(res.body.data.menu.slug).toBe('dimsum-mentai');
  });

  it('ignores a slug sent by the client', async () => {
    vi.mocked(repo.insertMenu).mockImplementation(async (menu) => menu);

    await request(app)
      .post('/api/admin/menus')
      .set('Authorization', AUTH)
      .send({ ...body, slug: 'slug-palsu' });

    expect(vi.mocked(repo.insertMenu).mock.calls[0][0].slug).toBe('dimsum-mentai');
  });

  it('adds a numeric suffix when the slug is taken', async () => {
    vi.mocked(repo.insertMenu)
      .mockRejectedValueOnce(slugTaken())
      .mockRejectedValueOnce(slugTaken())
      .mockImplementation(async (menu) => menu);

    const res = await request(app).post('/api/admin/menus').set('Authorization', AUTH).send(body);

    expect(res.status).toBe(201);
    expect(vi.mocked(repo.insertMenu).mock.calls.map(([menu]) => menu.slug)).toEqual([
      'dimsum-mentai',
      'dimsum-mentai-2',
      'dimsum-mentai-3',
    ]);
  });

  it('returns 409 after 20 taken slugs instead of looping forever', async () => {
    vi.mocked(repo.insertMenu).mockRejectedValue(slugTaken());

    const res = await request(app).post('/api/admin/menus').set('Authorization', AUTH).send(body);

    expect(res.status).toBe(409);
    expect(repo.insertMenu).toHaveBeenCalledTimes(20);
  });

  it('returns 500 without retrying for other database errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(repo.insertMenu).mockRejectedValue(Object.assign(new Error('boom'), { code: '08006' }));

    const res = await request(app).post('/api/admin/menus').set('Authorization', AUTH).send(body);

    expect(res.status).toBe(500);
    expect(repo.insertMenu).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid input without touching the database', async () => {
    const res = await request(app)
      .post('/api/admin/menus')
      .set('Authorization', AUTH)
      .send({ ...body, price: 0 });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(repo.insertMenu).not.toHaveBeenCalled();
  });
});

describe('PUT /api/admin/menus/:id', () => {
  it('updates only the fields sent', async () => {
    vi.mocked(repo.updateMenu).mockResolvedValue({ ...MENU, is_available: false });

    const res = await request(app)
      .put(`/api/admin/menus/${MENU_ID}`)
      .set('Authorization', AUTH)
      .send({ is_available: false });

    expect(res.status).toBe(200);
    expect(repo.updateMenu).toHaveBeenCalledWith(MENU_ID, { is_available: false });
    expect(res.body.data.menu.is_available).toBe(false);
  });

  it('returns 400 for an empty body', async () => {
    const res = await request(app)
      .put(`/api/admin/menus/${MENU_ID}`)
      .set('Authorization', AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Tidak ada data menu yang diubah');
  });

  it('returns 404 for a deleted or unknown menu', async () => {
    vi.mocked(repo.updateMenu).mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/admin/menus/${MENU_ID}`)
      .set('Authorization', AUTH)
      .send({ price: 30000 });

    expect(res.status).toBe(404);
  });

  it('returns 404 for a malformed id without querying', async () => {
    const res = await request(app)
      .put('/api/admin/menus/123')
      .set('Authorization', AUTH)
      .send({ price: 30000 });

    expect(res.status).toBe(404);
    expect(repo.updateMenu).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/admin/menus/:id', () => {
  it('soft deletes the menu', async () => {
    vi.mocked(repo.softDeleteMenu).mockResolvedValue(true);

    const res = await request(app).delete(`/api/admin/menus/${MENU_ID}`).set('Authorization', AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'success', data: { id: MENU_ID } });
    expect(repo.softDeleteMenu).toHaveBeenCalledWith(MENU_ID);
  });

  it('returns 404 when the menu is already deleted', async () => {
    vi.mocked(repo.softDeleteMenu).mockResolvedValue(false);

    const res = await request(app).delete(`/api/admin/menus/${MENU_ID}`).set('Authorization', AUTH);

    expect(res.status).toBe(404);
  });
});
