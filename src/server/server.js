const _ = require('lodash');
const axios = require('axios');
const _uuidv4 = require('uuid').v4;
const OKARGO_PLATFORMS = require('./OKARGO_PLATFORMS.json');

function ConfigurationErrorException() {}
function InvalidTokenException() {}
function TooManyRequestsException() {}

function Server({ configuration = {}, serverUri = 'https://app.okargo.com/api/Export/v2/GetOnlineCarrierOffers', uuidv4 = _uuidv4, verbose = false } = {}) {
    const { token, platforms } = configuration;

    if (!token || !platforms) {
        throw new ConfigurationErrorException();
    }

    async function run({ sourcePort, destinationPort, products, dateBegin, dateEnd, platform }) {
        let result = null;

        const jointProducts = products.map(p => CONVERT_PRODUCT_TYPE[p.type]).reduce((acc, val) => {
            acc[val.containerType] = acc[val.containerType] || [];
            acc[val.containerType] = acc[val.containerType].concat(val.sizeTypes);
            return acc;
        }, {});

        try {
            result = await Promise.all(_.flatten(_.map(jointProducts, async (sizeTypes, containerType) => {
                const body = {
                    containerType, sizeTypes,
                    chargeCriterias: _.some(products, p => p.dangerous) ? ['Hazardous'] : null, //see Criteria
                    OriginShippingType: sourcePort.type === 'unlocode' ? 'door' : 'Cy',
                    DestinationShippingType: destinationPort.type === 'unlocode' ? 'door' : 'Cy',
                    origin: { code: sourcePort.id },
                    destination: { code: destinationPort.id },
                    dateBegin: new Date(dateBegin).toISOString(),
                    dateEnd: new Date(dateEnd).toISOString(),
                    ratesFetcher: OKARGO_PLATFORMS[platform].code,
                };

                if (verbose) {
                    console.log('OKargo request:', serverUri, body);
                }

                const result = await axios.post(serverUri, body, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (!_.isEmpty(result?.data?.errorByFetcherCode)) {
                    throw new Error(_.values(result.data.errorByFetcherCode)[0]);
                }

                const _products = products.filter( p => CONVERT_PRODUCT_TYPE[p.type].containerType === containerType );
                return ((result.data || {}).carrierOffers || []).map(offer => ({ products: _products, ...offer }));
            })));
        } catch (e) {
            if (e.response?.status === 429) {
                throw new TooManyRequestsException();
            } else if (e.response?.status === 401) {
                throw new InvalidTokenException();
            } else {
                throw e;
            }
        }

        const offers = _.flatten(result);

        // Create monada rate structure from return values
        const ret = _.flatten(_.flatten(offers.map(({ products, carrier, offers }) => products.map(product => offers.map(offer => {
            const productId = uuidv4();
            const creationDate = offer.chargeSet.creationDate;
            const ratesPriceType = offer.chargeSet.ratesPriceType;
            const dateBegin = new Date(offer.chargeSet.dateBegin);
            const quotValidity = new Date(offer.chargeSet.quotValidity || offer.chargeSet.dateEnd);
            const departs = _.get(offer, 'routes[0].departs', []);
            const transShipments = _.get(offer, 'routes[0].transShipments', []);
            const transitTime = _.get(offer, 'routes[0].transitTime', []);
            const availability = (offer.ratesAvailabilitys || [])[0] || null;
            const moreInfo = _.get(offer, 'offerInformations', []); 
            const charges = offer.chargeSet.charges
                .filter(charge => charge.chargeType !== 'Source' || charge.type !== 'Incl')
                .filter(charge => charge.sizeTypeId === null || charge.sizeTypeId === CONVERT_PRODUCT_TYPE[product.type].sizeTypes[0].sizeTypeId);

            const fields = charges.map(charge => {
                const isPerUnit = ['SPECIFIC', 'CTR', 'TEU'].includes((charge.unit || '').toUpperCase());
                return { 
                    id: uuidv4(),
                    title: charge.chargeName, 
                    type: isPerUnit ? 'per-unit' : 'flat', 
                    sectionTitle: charge.application, 
                    values: {
                        [isPerUnit ? productId : 'flat']: { value: charge.amount || 0, currency: charge.currency || 'USD' }
                    }
                }
            });

            const fieldsGrouped = _.groupBy(fields, f => f.sectionTitle);

            const sections = _(fieldsGrouped).mapValues(v => ({ id: uuidv4(), title: v[0].sectionTitle, offers: [{ id: uuidv4(), fields: v.map(vv => _.pick(vv, ['id', 'title', 'type', 'values' ])) }] })).values().value();

            return {
                id: `okargo-${offer.chargeSet.chargeSetId}-${product.type}-${uuidv4()}`,
                type: ratesPriceType === 'Contract' ? 'contract' : ratesPriceType === 'Spot' ? 'spot' : null,
                created: new Date(creationDate).getTime(),
                transportationMethod: 'sea',
                source: sourcePort,
                destination: destinationPort,
                supplier: {
                    organization: carrier.name,
                    uniqueId: carrier.code,
                },
                attributes: {
                    okargoOffer: offer,
                },
                product: {
                    ...product,
                    id: productId,
                    quantity: 1,
                },
                offer: {
                    validFrom: `${dateBegin.getFullYear()}-${dateBegin.getMonth() + 1}-${dateBegin.getDate()}`,
                    validUntil: `${quotValidity.getFullYear()}-${quotValidity.getMonth() + 1}-${quotValidity.getDate()}`,
                    transitTime,
                    transitDates: departs.filter(d => d.source !== 'SchedulesApi').map(d => ({
                        etd: d.etd.replace(/T\d\d:\d\d:\d\dZ/, ''),
                        eta: d.eta.replace(/T\d\d:\d\d:\d\dZ/, ''),
                    })),
                    availability: availability === null ? null : {
                        available: availability.status === 'Available',
                        count: availability.containerLeft || null,
                    },
                    transshipment: transShipments.map(t => t.unLocode).join(', '),
                    sections
                },
                notes: moreInfo.map(o => o.content).join(','),
            }
        })))));

        return ret.filter(r => r.offer.transitDates.length > 0);
    }

    this.run = run;
}

// Consts needed to convert from Monada types to OKargo types
const CONVERT_PRODUCT_TYPE = {
    '20\' Dry': { containerType: 'Dry', sizeTypes: [ { sizeTypeId: 1, name: '20DRY' } ] },
    '20\' Flat': { containerType: 'Fl', sizeTypes: [ { sizeTypeId: 11, name: '20FL' } ] },
    '20\' Open Top': { containerType: 'Ot', sizeTypes: [ { sizeTypeId: 9, name: '20OT' } ] },
    '20\' Reefer': { containerType: 'Rf', sizeTypes: [ { sizeTypeId: 4, name: '20RF' } ] },
    '40\' Dry': { containerType: 'Dry', sizeTypes: [ { sizeTypeId: 2, name: '40DRY' } ] },
    '40\' Flat': { containerType: 'Fl', sizeTypes: [ { sizeTypeId: 12, name: '40FL' } ] },
    '40\' Open Top': { containerType: 'Ot', sizeTypes: [ { sizeTypeId: 10, name: '40OT' } ] },
    '40\' Reefer': { containerType: 'Rf', sizeTypes: [ { sizeTypeId: 5, name: '40RF' } ] },
    '40\' HC Dry': { containerType: 'Dry', sizeTypes: [ { sizeTypeId: 3, name: '40HC' } ] },
    '40\' HC Flat': { containerType: 'Fl', sizeTypes: [ { sizeTypeId: 15, name: '40HF' } ] },
    '40\' HC Open Top': { containerType: 'Ot', sizeTypes: [ { sizeTypeId: 14, name: '40HO' } ] },
    '40\' HC Reefer': { containerType: 'Rf', sizeTypes: [ { sizeTypeId: 6, name: '40RF' } ] },
    '45\' HC Dry': { containerType: 'Dry', sizeTypes: [ { sizeTypeId: 7, name: '45HC' } ] },
    '45\' HC Reefer': { containerType: 'Rf', sizeTypes: [ { sizeTypeId: 8, name: '45HR' } ] },
}

module.exports = { Server, ConfigurationErrorException, InvalidTokenException, TooManyRequestsException };
