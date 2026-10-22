'use client';

import React, { useEffect, useState } from 'react';
import ComponentContainerCard from '@/components/ComponentContainerCard';

const RedCard=()=>{
    return(
        <div
    style={{
      backgroundColor: '#f8d7da', // Light red background
      color: '#842029',          // Dark red text
      padding: '10px',
      border: '1px solid #f5c2c7',
      borderRadius: '5px',
      textAlign: 'center',
      fontSize: '14px',
      margin: '10px 0',
    }}
  >
    No Records Found
  </div>
    )
}

export default RedCard