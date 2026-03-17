import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Package } from 'lucide-react-native';
import { Typography } from '../constants/theme';
import { Config } from '../constants/config';

interface BoxCardThumbnailProps {
    primaryImageUrl: string | null;
    boxId: string;
}

export default function BoxCardThumbnail({ primaryImageUrl, boxId }: BoxCardThumbnailProps) {
    const [imageError, setImageError] = useState(false);

    if (!primaryImageUrl || imageError) {
        return (
            <View style={styles.cardPlaceholder}>
                <Package size={28} color="#374151" strokeWidth={2} />
                <Text style={styles.placeholderText}>Görsel yok</Text>
            </View>
        );
    }

    const imageUrl = primaryImageUrl.startsWith('http') 
        ? primaryImageUrl 
        : `${Config.API_BASE_URL}${primaryImageUrl}`;

    return (
        <Image
            key={`thumb-${boxId}`}
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
        />
    );
}

const styles = StyleSheet.create({
    cardImage: {
        width: '100%',
        aspectRatio: 4 / 3,
        borderRadius: 0,
    },
    cardPlaceholder: {
        width: '100%',
        aspectRatio: 4 / 3,
        backgroundColor: '#0A1929',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    placeholderText: {
        fontFamily: Typography.fonts.data,
        fontSize: 9,
        color: '#374151',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
