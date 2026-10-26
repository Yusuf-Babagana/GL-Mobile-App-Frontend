import { MAX_CONTENT_WIDTH } from '@/lib/layout';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

const APP_BG = '#F8FAFC';
const SIDE_BG = '#E2E8F0';

/**
 * Keeps the whole app at phone width and centred on wide windows (tablets,
 * unfolded foldables, landscape). On phones it adds nothing.
 */
export function ResponsiveFrame({ children }: { children: React.ReactNode }) {
    const { width } = useWindowDimensions();
    const wide = width > MAX_CONTENT_WIDTH;

    return (
        <View style={{ flex: 1, backgroundColor: wide ? SIDE_BG : APP_BG, alignItems: 'center' }}>
            <View
                style={{
                    flex: 1,
                    width: '100%',
                    maxWidth: MAX_CONTENT_WIDTH,
                    backgroundColor: APP_BG,
                    overflow: 'hidden',
                }}
            >
                {children}
            </View>
        </View>
    );
}
