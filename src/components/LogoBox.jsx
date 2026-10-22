"use client"; // Ensure it's a Client Component

import { useEffect, useState } from "react";
import Link from 'next/link';
import Image from 'next/image';
import { useLayoutContext } from '@/context/useLayoutContext';
import useBrandingSettings from "@/hooks/useBrandingSettings"; 

const LogoBox = () => {
  const { settings, loading, error } = useBrandingSettings();

  const {
    menu: { size }, // Access the current sidebar size ('default' or 'collapsed')
  } = useLayoutContext();

  const [logoSm, setLogoSm] = useState("");      
  const [logoSmb, setLogoSmb] = useState("");    
  const [logoCol, setLogoCol] = useState("");

  const isCollapsed = size === 'collapsed';

  useEffect(() => {
    if (settings) {
      setLogoSm(settings.logo_url || "");
      setLogoSmb(settings.logo_url_white || "");
      setLogoCol(settings.logo_icon || ""); 
    }
  }, [settings]);

  if (loading) return <p>Loading branding...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <Link href="/welcome_to_client" className="brand">
      <span className="logo">
        
        {/* Full Logo Box (Shows when Sidebar is Expanded) */}
        {!isCollapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '50px' }}>
            <Image
              src="/images/mainlogo.jpeg"
              alt="Logo Icon"
              width={50}
              height={50}
              style={{ objectFit: 'contain', width: 'auto', height: '100%' }}
              priority
            />

            {/* Brand Text */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span 
                style={{ 
                  fontWeight: '900', 
                  fontSize: '20px', 
                  lineHeight: '1', 
                  color: '#E50914', 
                  letterSpacing: '1px',
                  textTransform: 'uppercase'
                }}
              >
                KARUNARATHNE
              </span>
              <span 
                style={{ 
                  fontWeight: '600', 
                  fontSize: '11px', 
                  color: '#FFFFFF', 
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  marginTop: '2px'
                }}
              >
                AUTO ZONE
              </span>
            </div>
          </div>
        ) : (
          /* Small Icon Only (Shows when Sidebar is Collapsed) */
          <Image
            src="/images/mainlogo.jpeg"
            alt="logo-small"
            width={40}
            height={40}
            className="logo-sm"
            style={{ width: 'auto', height: '40px', padding: '2px 8px', objectFit: 'contain' }}
            priority
          />
        )}

      </span>
    </Link>
  );
};

export default LogoBox;