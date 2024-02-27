const { setupServer } = require('msw/node');
const { http, HttpResponse } = require('msw');
const { Server: OkargoServer, ConfigurationErrorException, InvalidTokenException } = require('../src/server/index.js');
const OKARGO_RESPONSE = require('./OKARGO_RESPONSE.json');
const OKARGO_MULTIPLE_RESPONSE = require('./OKARGO_MULTIPLE_RESPONSE.json');
const EXPECTED_RESPONSE = require('./EXPECTED_RESPONSE.json');
const EXPECTED_MULTIPLE_RESPONSE = require('./EXPECTED_MULTIPLE_RESPONSE.json');

let id = 100;
function uuidv4() { return '' + id++ };

// Increase jest timeout to 10 seconds
jest.setTimeout(120000);

const server = setupServer(
    http.post('http://localhost:9999/api/Export/v2/GetOnlineCarrierOffers', ({ request }) => {
        if (request.headers.get('authorization') !== 'Bearer TOKEN') {
            return HttpResponse.json({}, { status: 401 });
        }
        return HttpResponse.json(OKARGO_RESPONSE);
    }),
    http.post('http://localhost:9998/api/Export/v2/GetOnlineCarrierOffers', ({ request }) => {
        if (request.headers.get('authorization') !== 'Bearer TOKEN') {
            return HttpResponse.json({}, { status: 401 });
        }
        return HttpResponse.json(OKARGO_MULTIPLE_RESPONSE);
    })
);

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('[Constructor] Throws error on bad configuration, success on good parameters', () => {
    expect(() => new OkargoServer()).toThrow(ConfigurationErrorException);
    expect(() => new OkargoServer({ configuration: {} })).toThrow(ConfigurationErrorException);
    expect(() => new OkargoServer({ configuration: { token: null, platforms: null } })).toThrow(ConfigurationErrorException);
    expect(() => new OkargoServer({ configuration: { token: 'asdsadas', platforms: null } })).toThrow(ConfigurationErrorException);
    expect(() => new OkargoServer({ configuration: { token: null, platforms: [] } })).toThrow(ConfigurationErrorException);
    expect(() => new OkargoServer({ configuration: { token: 'dsadasdas', platforms: [] } })).not.toThrow(ConfigurationErrorException);
});

test('[Task] Main task returns exception if invalid token', async () => {
    const server = new OkargoServer({ configuration: { token: 'TOKEN1', platforms: [] }, serverUri: 'http://localhost:9999/api/Export/v2/GetOnlineCarrierOffers' });
    await expect(run(server)).rejects.toBeInstanceOf(InvalidTokenException);
});

test('[Task] Main task works', async () => {
    id = 100;
    const server = new OkargoServer({ configuration: { token: 'TOKEN', platforms: [] }, serverUri: 'http://localhost:9999/api/Export/v2/GetOnlineCarrierOffers', uuidv4, now: () => 101010 });
    const response = await run(server);
    expect(response).toEqual(EXPECTED_RESPONSE);
});


test('[Task] Main works with multiple products', async () => {
    id = 100;
    const server = new OkargoServer({ configuration: { token: 'TOKEN', platforms: [] }, serverUri: 'http://localhost:9998/api/Export/v2/GetOnlineCarrierOffers', uuidv4, now: () => 101010 });
    const response = await runMultipleProducts(server);
    expect(response).toEqual(EXPECTED_MULTIPLE_RESPONSE);
});

async function run(server) {
    return server.run({
        sourcePort: { id: 'PTLEI' },
        destinationPort: { id: 'BRNVT' },
        products: [{ type: '20\' Dry', quantity: 1, dangerous: false }],
        dateBegin: '2024-01-01',
        dateEnd: '2024-02-01',
        platform: '5'
    });
}

async function runMultipleProducts(server) {
    return server.run({
        sourcePort: { id: 'PTSIE' },
        destinationPort: { id: 'BRVIX' },
        products: [
            { type: '20\' Dry', quantity: 1, dangerous: false },
            { type: '40\' Dry', quantity: 1, dangerous: false },
        ],
        dateBegin: '2024-02-01',
        dateEnd: '2024-03-01',
        platform: '5'
    });
}
