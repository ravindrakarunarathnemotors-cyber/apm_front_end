'use client';

import React from 'react';
import Image from 'next/image';
import withAuthorization from '@/hoc/withAuthorization';

const Welcome = () => {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Image
                alt="Admin Welcome"
                src="/images/www.jpg"
                width={1300}
                height={700}
                priority
                unoptimized 
                style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: '10px' }}
            />
        </div>
    );
};

export default withAuthorization(Welcome);