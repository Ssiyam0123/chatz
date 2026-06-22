let colors;
import React, { useState } from 'react';
import { Text } from 'react-native';

const ExpandableText = ({ text, style, maxLength = 150 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  if (text.length <= maxLength) {
    return <Text style={style}>{text}</Text>;
  }

  return (
    <Text style={style}>
      {isExpanded ? text : `${text.substring(0, maxLength)}... `}
      <Text 
        style={{ color: '#007bff', fontWeight: 'bold' }} 
        onPress={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? ' See less' : ' See more'}
      </Text>
    </Text>
  );
};

export default ExpandableText;
