import React, { useState, useRef } from 'react';

// MUI imports
import Box from '@mui/material/Box';
import { grey, blue } from '@mui/material/colors';

// Font Awesome import
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGripDotsVertical } from '@fortawesome/pro-solid-svg-icons';

// Generic imports
import _ from 'lodash';
import { useDrag } from 'react-dnd'
import CurrencyList from 'currency-list';

function DetailsCard(props) {
    const { rate, toggleFavorite, isFavorite, emphasize, routeIndex = 0, departIndex = 0, onStartDragging, onEndDragging } = props;
    const [ expandText, setExpandText ] = useState(false);

    const attributes = _.get(rate, 'attributes.okargoOffer');
    const originPort = _.get(attributes, `routes[${routeIndex}].originPort`, '');
    const destinationPort = _.get(attributes, `routes[${routeIndex}].destinationPort`, '');
    const transitDays = _.get(attributes, `routes[${routeIndex}].bestTransitTime`);
    const dateStart = _.get(attributes, 'chargeSet.dateBegin').replace(/T00:00:00/, '');
    const dateEnd = (_.get(attributes, 'chargeSet.dateEnd') || '').replace(/T00:00:00/, '');
    const expiration = (_.get(attributes, 'chargeSet.quotValidity') || '').replace(/T00:00:00/, '');
    const routes = _.get(attributes, 'routes');
    const vesselName = _.get(attributes, `routes[${routeIndex}].departs[${departIndex}].vessel.name`, null);
    const vesselUid = _.get(attributes, `routes[${routeIndex}].departs[${departIndex}].uid`, 'unknown'); 
    const vesselImo = _.get(attributes, `routes[${routeIndex}].departs[${departIndex}].vessel.imo`, null);
    const vesselService = _.get(attributes, `routes[${routeIndex}].serviceCode`, null);
    const ratesPriceType = _.get(attributes, 'chargeSet.ratesPriceType', null); 
    const carrierReference = _.get(attributes, 'chargeSet.carrierReference', null); 
    const moreInfo = _.get(attributes, 'offerInformations', []); 
    const source = _.get(attributes, 'ratesOffer.shortName', '');
    const link = _.get(attributes, 'chargeSet.deepLink', '');
    const ddSetCharges = _.get(attributes, 'ddSet.charges', []);

    let moreInfoJoined = moreInfo.map(o => o.content).join(',');
    if (moreInfoJoined.length > 20 && !expandText) {
        moreInfoJoined = moreInfoJoined.substr(0, 20) + '...';
    } else {
        moreInfoJoined += '. (please note that the Free time information may include inaccurate information, we are working on upgrading this)';
    }

    return (
        <Box>
            {rate.offer.sections.map(section => (
                <SectionDetails
                    key={`${section.title}-${section.id}`}
                    section={section}
                    rate={rate}
                    emphasize={emphasize}
                    onStartDragging={onStartDragging}
                    onEndDragging={onEndDragging}
                />
            ))}
            <Box sx={{ width: '100%', paddingBottom: '20px', borderTop: '1px solid #D9D9D9' }} />
            <Box sx={{ fontSize: '13px', whiteSpace: 'pre-wrap', fontWeight: 800 }}>
                Detention & Demurrage:
            </Box>
            {(() => {
                const sizeBasedCharges = ddSetCharges.filter(charge => !charge.sizeTypeId || CONVERT_PRODUCT_TYPE[rate.product.type] === charge.sizeTypeId);
                const applications = _.uniq(sizeBasedCharges.map(charge => charge.application));
                return _.flatten(applications.map(application => {
                    const applicationCharges = sizeBasedCharges.filter(charge => charge.application === application);
                    const ddChargeNameIds = _.uniq(applicationCharges.map(charge => charge.ddChargeNameId));
                    return ddChargeNameIds.map(ddChargeNameId => (
                        <Box key={`${application}-${ddChargeNameId}`} sx={{ fontSize: '12px', whiteSpace: 'pre-wrap', fontWeight: 800, marginBottom: '12px' }}>
                            {application} {DDChargeIdToName[('' + ddChargeNameId).toLowerCase()] || ddChargeNameId}:
                            {applicationCharges.filter(a => a.ddChargeNameId === ddChargeNameId).map(charge => (
                                <Box key={charge.fromDay} sx={{ fontSize: '12px', whiteSpace: 'pre-wrap', fontWeight: 400 }}>
                                    {charge.fromDay}{charge.untilDay ? ` - ${charge.untilDay}` : '+'}: {charge.amount === 0 ? 'Free' : `${charge.currencyId && CURRENCY_ID_TO_SYMBOL[charge.currencyId] && CurrencyList.get(CURRENCY_ID_TO_SYMBOL[charge.currencyId]).symbol}${charge.amount.toLocaleString(undefined, {minimumFractionDigits: 2})} per ${DDSET_UNIT[(charge.unit || '').toLowerCase()] || charge.unit} per ${DDSET_DAYCOUNT[(charge.dayCountCategory || '').toLowerCase()] || charge.dayCountCategory}`}
                                </Box>
                            ))}
                        </Box>
                    ));
                }))
            })()}
            <Box sx={{ width: '100%', paddingBottom: '20px', borderTop: '1px solid #D9D9D9' }} />
            <Box sx={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                {rate.type !== 'spot' && <><b>Shipping window:</b> {new Date(dateStart).toLocaleDateString('en-GB')} - {new Date(dateEnd).toLocaleDateString('en-GB')}</>}
                {rate.type !== 'spot' ? ' · ' : ''}
                {vesselName && <><b>Vessel:</b>{` ${vesselName}-${vesselUid}${vesselImo ? ' ' + vesselImo + '-IMO' : ''}${vesselService ? ' ' + vesselService : ''}`}</>}
                {vesselName ? ' · ' : ''}
                {rate.type === 'contract' && carrierReference && <><b>Quotation number on carrier's portal:</b>{` ${carrierReference} · `}</>}
                <b>More info:</b>{` ${moreInfoJoined} · `}
                {moreInfoJoined.endsWith('...') && !expandText && (
                    <span style={{ cursor: 'pointer', textDecoration: 'underline', color: blue[500] }} onClick={() => setExpandText(true)}>Show more</span>
                )}
                {link && <>{moreInfoJoined.endsWith('...') && !expandText ? ' · ' : ''}<a href={link} target={'_blank'}>{source ? <><b>Book this rate:</b>{` ${source}`}</> : 'Book this rate'}</a>.</>}
            </Box>
        </Box>
    )
}

function OkargoSingleFieldDetails(props) {
    const { rate, field, value, emphasize, onStartDragging, onEndDragging } = props;

    const [, drag] = useDrag(() => ({
        type: 'RateCardSingleRate',
        item: () => {
            onStartDragging();
            return { rate, field };
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging()
        }),
        end: () => {
            onEndDragging();
        }
    }))

    if ((field.type !== 'per-unit') && (field.type !== 'per-unit-type') && (field.type !== 'flat') && (field.type !== 'custom')) return null;

    return (
        <Box
            sx={{ 
                cursor: 'move', 
                padding: '10px',
                width: '100%', 
                minWidth: '100%', 
                marginBottom: '12px',
                border: '1px solid #E0E0E0'
            }}
        >
            <Box
                ref={drag} 
                sx={{ 
                    background: 'white',
                    padding: '10px',
                    cursor: 'move', 
                    fontWeight: emphasize ? '800' : '400', 
                    display: 'flex', 
                    alignItems: 'center',
                    width: '100%', 
                    minWidth: '100%', 
                }}
            >
                <Box sx={{ fontWeight: emphasize ? '800' : '400', fontSize: '18px' }}>
                    <FontAwesomeIcon icon={faGripDotsVertical} />
                </Box>
                <Box sx={{ padding: '0px 22px' }}>
                |
                </Box>
                <Box sx={{ fontSize: '10px', fontWeight: emphasize ? '800' : '400' }}>
                    {rate.product.type}
                </Box>
                <Box sx={{ padding: '0px 22px' }}>
                |
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ fontSize: '12px', fontWeight: emphasize ? '800' : '400', marginBottom: '6px' }}>
                        {CurrencyList.get(value.currency).symbol}{value.value.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        {field.type === 'per-unit' || field.type === 'per-unit-type' ? ' / product' : ''}
                        {field.type === 'flat' ? ' / shipment' : ''}
                        {field.type === 'custom' ? ` / ${field.multiplierText}` : ''}
                    </Box>
                    <Box sx={{ fontSize: '12px', color: grey[600] }}>
                        {field.title}
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}

export default DetailsCard;

function SectionDetails(props) {
    const { section, rate, onStartDragging, onEndDragging, emphasize } = props;

    const _rate = useRef(rate);
    _rate.current = rate;

    const [, drag] = useDrag(() => ({
        type: 'RateCardSingleSection',
        item: () => {
            onStartDragging();
            const noZeroFieldsRate = _.cloneDeep(_rate.current);
            noZeroFieldsRate.offer.sections = noZeroFieldsRate.offer.sections.map(section => {
                section.offers = section.offers.map(offer => {
                    offer.fields = offer.fields.filter(f => {
                        if (f.type === 'flat') {
                            return !!f.values.flat.value || !!f.values.flat.formula;
                        } if (f.type === 'string') {
                            return !!f.values.string.value;
                        } else {
                            return f.values[rate.product.id].value || f.values[rate.product.id].formula;
                        }
                        return f;
                    })
                    return offer;
                })
                return section;
            });

            return { rate: noZeroFieldsRate, section };
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging()
        }),
        end: () => {
            onEndDragging();
        }
    }))

    return (
        <Box key={section.title} sx={{ marginBottom: '20px', background: 'white', padding: '12px' }} ref={drag}>
            <Box sx={{ fontWeight: 400, fontSize: '13px', textTransform: 'uppercase', marginBottom: '32px', display: 'flex', alignItems: 'center', cursor: 'move' }}>
                <Box sx={{ fontSize: '18px', marginRight: '12px' }}>
                    <FontAwesomeIcon icon={faGripDotsVertical} />
                </Box>
                <Box>
                    {section.title}
                </Box>
            </Box>
            <Box sx={{ display: 'flex', marginTop: '12px', flexWrap: 'wrap' }}>
                {section.offers[0].fields.map(field => {
                    const value = _.values(field.values)[0];
                    return (
                        <OkargoSingleFieldDetails
                            key={field.id}
                            rate={rate}
                            field={field}
                            value={value}
                            emphasize={!!(emphasize || []).find(e => e.rateId === rate.id && e.fieldId === field.id)}
                            onStartDragging={onStartDragging}
                            onEndDragging={onEndDragging}
                        />
                    )
                })}
            </Box>
        </Box>
    );
}

const CURRENCY_ID_TO_SYMBOL = {
    1: 'EUR',
    2: 'USD',
    3: 'AUD',
    4: 'BRL',
    5: 'MYR',
    6: 'GBP',
    7: 'INR',
    8: 'CNY',
    9: 'HKD',
    10: 'TWD',
    11: 'NZD',
    12: 'CAD',
    13: 'KRW',
    14: 'KWD',
    15: 'NOK',
    16: 'THB',
    17: 'AED',
    18: 'MUR',
    19: 'MAD',
    20: 'JOD',
    21: 'XAF',
    22: 'GNF',
    23: 'TND',
    24: 'SEK',
    25: 'ZAR',
    26: 'OMR',
    27: 'QAR',
    28: 'JPY',
    29: 'PHP',
    30: 'SGD',
    31: 'VND',
    32: 'XOF',
    33: 'BND',
    34: 'XPF',
    35: 'FJD',
    36: 'SAR',
    37: 'IDR',
    38: 'BHD',
    39: 'CVE',
    40: 'MMK',
    41: 'NGN',
    42: 'SDG',
    43: 'DZD',
    44: 'EGP',
    45: 'LKR',
    46: 'DKK',
    47: 'MXN',
    48: 'AOA',
    49: 'PKR',
    50: 'CHF',
    51: 'PGK',
    52: 'TOP',
    53: 'DJF',
    54: 'MRU',
    55: 'ALL',
    56: 'ANG',
    57: 'ARS',
    58: 'AWG',
    59: 'AZN',
    60: 'BBD',
    61: 'BDT',
    62: 'BGN',
    63: 'BMD',
    64: 'BOB',
    65: 'BSD',
    66: 'BZD',
    67: 'CDF',
    68: 'CLP',
    69: 'COP',
    70: 'CRC',
    71: 'CUP',
    72: 'CZK',
    73: 'DOP',
    74: 'ERN',
    75: 'GEL',
    76: 'GHS',
    77: 'GMD',
    78: 'GTQ',
    79: 'GYD',
    80: 'HNL',
    81: 'HRK',
    82: 'HTG',
    83: 'ILS',
    84: 'IQD',
    85: 'IRR',
    86: 'ISK',
    87: 'JMD',
    88: 'KES',
    89: 'KHR',
    90: 'KMF',
    91: 'KPW',
    92: 'KYD',
    93: 'LBP',
    94: 'LRD',
    95: 'LSL',
    96: 'LYD',
    97: 'MDL',
    98: 'MGA',
    99: 'MNT',
    100: 'MOP',
    101: 'MRO',
    102: 'MVR',
    103: 'MZN',
    104: 'NIO',
    105: 'PAB',
    106: 'PEN',
    107: 'PLN',
    108: 'PYG',
    109: 'RON',
    110: 'RUB',
    111: 'RWF',
    112: 'SBD',
    113: 'SCR',
    114: 'SLL',
    115: 'SOS',
    116: 'SRD',
    117: 'STD',
    118: 'SYP',
    119: 'TRY',
    120: 'TTD',
    121: 'TZS',
    122: 'UAH',
    123: 'UYU',
    124: 'VEF',
    125: 'VUV',
    126: 'WST',
    127: 'XCD',
    128: 'YER',
    129: 'BWP',
    130: 'MWK',
    131: 'UGX',
    132: 'ZMW',
    133: 'ZWL',
    134: 'BIF',
    135: 'NAD',
    136: 'HUF',
    137: 'LAK',
    138: 'NPR',
    139: 'RSD',
    140: 'SZL',
    141: 'MKD',
    142: 'KGS',
    143: 'BYN',
    144: 'UZS',
    145: 'ETB',
    146: 'AMD',
    147: 'KZT',
    148: 'BAM',
    149: 'RMB',
};

const DDSET_UNIT = {
    ctr: 'container',
    specific: 'container',
    teu: 'TEU',
    bl: 'bill of Lading',
    cbm: 'cubic meter',
    ton: 'ton',
    wm: 'weight or measurement',
    decl: 'declared value',
    trans: 'transshipment',
};

const DDSET_DAYCOUNT = {
    wrk: 'business day',
    cal: 'calendar day',
};

const CONVERT_PRODUCT_TYPE = {
    '20\' Dry':  1,
    '20\' Flat':  11,
    '20\' Open Top': 9,
    '20\' Reefer':  4,
    '40\' Dry':  2,
    '40\' Flat':  12,
    '40\' Open Top':  10,
    '40\' Reefer':  5,
    '40\' HC Dry':  3,
    '40\' HC Flat':  15,
    '40\' HC Open Top':  14,
    '40\' HC Reefer':  6,
    '45\' HC Dry':  7,
    '45\' HC Reefer':  8,
}

const DDChargeIdToName = {
    detention: 'Detention',
    demurage: 'Demurrage',
    detanddemcomplete: 'Detention & Demurrage',
    plugin: 'PlugIn',
    bt: 'BT (Berth Throughput)',
    chassis: 'Chassis',
    1: 'Detention',
    2: 'Demurrage',
    3: 'Detention & Demurrage',
    4: 'PlugIn',
    5: 'BT (Berth Throughput)',
    6: 'Chassis',
};
