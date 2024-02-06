import React, { useState } from 'react';

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
    const { rate, toggleFavorite, isFavorite, emphasize, routeIndex = 0, departIndex = 0 } = props;
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

    let moreInfoJoined = moreInfo.map(o => o.content).join(',');
    if (moreInfoJoined.length > 20 && !expandText) {
        moreInfoJoined = moreInfoJoined.substr(0, 20) + '...';
    } else {
        moreInfoJoined += '. (please note that the Free time information may include inaccurate information, we are working on upgrading this)';
    }

    return (
        <Box>
            {rate.offer.sections.map(section => {
                return (
                    <Box key={section.title} sx={{ marginBottom: '20px' }}>
                        <Box sx={{ fontWeight: 400, fontSize: '13px', textTransform: 'uppercase', marginBottom: '32px' }}>
                            {section.title}
                        </Box>
                        <Box sx={{ display: 'flex', marginTop: '12px', flexWrap: 'wrap' }}>
                            {section.offers[0].fields.map(field => {
                                const value = _.values(field.values)[0];
                                return (
                                    <OkargoSingleFieldDetails key={field.id} rate={rate} field={field} value={value} emphasize={!!(emphasize || []).find(e => e.rateId === rate.id && e.fieldId === field.id)}/>
                                )
                            })}
                        </Box>
                    </Box>
                );
            })}
            <Box sx={{ width: '100%', paddingBottom: '20px', borderTop: '1px solid #D9D9D9' }} />
            <Box sx={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                {new Date(rate.offer.validFrom).getTime() > new Date().getTime() ? <><b>Valid from:</b>{` ${new Date(rate.offer.validFrom).toLocaleDateString('en-GB')}`}</> : ''}
                {new Date(rate.offer.validFrom).getTime() <= new Date().getTime() ? <><b>Valid until:</b>{` ${new Date(rate.offer.validUntil).toLocaleDateString('en-GB')}`}</> : ''}
                {' · '}
                <b>Shipping window:</b> {new Date(dateStart).toLocaleDateString('en-GB')} - {new Date(dateEnd).toLocaleDateString('en-GB')}
                {vesselName && <>{` · `}<b>Vessel:</b>{` ${vesselName}-${vesselUid}${vesselImo ? ' ' + vesselImo + '-IMO' : ''}${vesselService ? ' ' + vesselService : ''}`}</>}
                {` · `}<b>Rate type:</b>{` ${ratesPriceType}`}
                {ratesPriceType && ratesPriceType === 'Contract' && carrierReference && <>{` · `}<b>Quotation number on carrier's portal:</b>{` ${carrierReference}`}</>}
                {` · `}<b>More info:</b>{` ${moreInfoJoined}`}
                {moreInfoJoined.endsWith('...') && !expandText && (
                    <span style={{ cursor: 'pointer', textDecoration: 'underline', color: blue[500] }} onClick={() => setExpandText(true)}>Show more</span>
                )}
                {link && <>{' · '}<a href={link} target={'_blank'}>{source ? <><b>Book this rate:</b>{` ${source}`}</> : 'Book this rate'}</a>.</>}
            </Box>
        </Box>
    )
}

function OkargoSingleFieldDetails(props) {
    const { rate, field, value, emphasize } = props;

    const [, drag] = useDrag(() => ({
        type: 'RateCardSingleRate',
        item: {
            rate,
            field,
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging()
        })
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
