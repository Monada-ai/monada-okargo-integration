import { useState } from 'react';
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import DetailsCard from '../../src/client/DetailsCard.js';
import EXPECTED_RESPONSE from '../EXPECTED_RESPONSE.json';

export default {
  title: 'Client/DetailsCard',
  component: DetailsCard,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
};

export const Primary = {
    name: 'Primary',
    render: () => {
        const [ favorites, setFavorites ] = useState(false);
        const [ emphasize, setEmphasize ] = useState([]);

        return (
            <DndProvider backend={HTML5Backend}>
                <DetailsCard rate={EXPECTED_RESPONSE[0]} toggleFavorite={() => setFavorites(!favorites)} isFavorite={favorites} emphasize={emphasize} setEmphasize={setEmphasize} />
            </DndProvider>
        )
    }
}
