'use client';

import React, { useEffect, useState } from 'react';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import ThemeModeToggle from './components/ThemeModeToggle';
import Notifications from './components/Notifications';
import ProfileDropdown from './components/ProfileDropdown';
import LeftSideBarToggle from './components/LeftSideBarToggle';
import clsx from 'clsx';
import useScrollEvent from '@/hooks/useScrollEvent';
import Swal from 'sweetalert2';

const TopNavigationBar = () => {
  const { scrollY } = useScrollEvent();
  const [searchQuery, setSearchQuery] = useState('');
  const [showParcelTimeline, setShowParcelTimeline] = useState(false);

  /* ---------- Full screen ---------- */
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsSupported, setFsSupported] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    setFsSupported(!!(el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen));

    const onChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement));
    };
    onChange();
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    const el = document.documentElement;
    try {
      if (!isFullscreen) {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) el.msRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const logoutUser = () => {
    if (typeof window !== "undefined") {
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = "/auth/login";
    }
  };

  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      e.preventDefault();

      try {
        const user_id = sessionStorage.getItem("user_id");
        setShowParcelTimeline(true);
      } catch (err) {
        console.error("Error:", err);

        Swal.fire({
          icon: 'error',
          title: 'Parcel Not Found',
          text: 'The parcel ID you entered does not exist. Please check and try again.',
          confirmButtonText: 'OK',
          customClass: {
            popup: 'bg-dark text-white rounded-4 border border-danger'
          }
        });
      }
    }
  };

  return (
    <>
      <div className="topbar kz-topbar d-print-none sticky-top">
        <div className="container-fluid kz-topbar-container">
          <nav
            className={clsx(
              'topbar-custom kz-topbar-nav d-flex justify-content-between align-items-center transition-all duration-300',
              {
                'shadow-lg': scrollY >= 50,
              }
            )}
            id="topbar-custom"
            style={{
              /* Bold Red to Deep Black Gradient */
              background: 'linear-gradient(135deg, #8B0000 0%, #3B0000 40%, #0B0B0B 100%)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: scrollY >= 50
                ? '0 8px 20px rgba(139, 0, 0, 0.3)'
                : '0 4px 12px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Left Section */}
            <div className="d-flex align-items-center gap-2 kz-topbar-left">
              <div className="p-1 rounded hover-red-bg cursor-pointer d-flex align-items-center">
                <LeftSideBarToggle />
              </div>
              <div className="welcome-text d-none d-md-block ms-1">
                <span className="text-white-50 fs-12">Welcome, </span>
                <span className="text-white fs-13 fw-bold">Dashboard</span>
              </div>
            </div>

            {/* Right Section */}
            <div className="d-flex align-items-center gap-2 kz-topbar-right">
              {/* Search Box */}
              <div className="hide-phone app-search d-none d-lg-block">
                <form role="search" action="#" method="get" className="position-relative">
                  <input
                    type="search"
                    name="search"
                    className="form-control text-white border-0 ps-3 pe-4 rounded-pill"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    style={{
                      height: '30px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      fontSize: '12px',
                      width: '180px',
                      color: '#fff',
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '1px solid rgba(239, 68, 68, 0.8)';
                      e.target.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    className="border-0 bg-transparent text-white-50 position-absolute end-0 top-50 translate-middle-y pe-2 d-flex align-items-center"
                  >
                    <IconifyIcon icon="iconoir:search" className="fs-15 text-white-50" />
                  </button>
                </form>
              </div>

              {/* Action Icons */}
              <div className="d-flex align-items-center gap-1 ps-2 border-start border-white-20 kz-topbar-actions">
                {fsSupported && (
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="kz-fs-btn kz-icon-btn border-0 bg-transparent p-0"
                    title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                    aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                  >
                    <IconifyIcon
                      icon={isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'}
                      className="text-white"
                      style={{ fontSize: 26 }}
                    />
                  </button>
                )}
                <div className="kz-icon-btn">
                  <ThemeModeToggle />
                </div>
                <div className="kz-icon-btn kz-bell">
                  <Notifications />
                </div>
                <div className="ms-1 d-flex align-items-center">
                  <ProfileDropdown />
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Global CSS */}
      <style jsx global>{`
        .border-white-20 {
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
        .hover-red-bg {
          transition: background 0.2s ease;
        }
        .hover-red-bg:hover {
          background: rgba(239, 68, 68, 0.25);
        }
        /* Every icon in the top bar = the same 40px circle, the hover highlight is a perfect circle */
        .kz-icon-btn {
          width: 40px; height: 40px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; cursor: pointer;
          transition: background .2s ease;
        }
        .kz-icon-btn:hover { background: rgba(255, 255, 255, 0.14); }
        .kz-icon-btn > button { width: 100% !important; height: 100% !important; border-radius: 50%; }
        .kz-icon-btn .dropdown, .kz-icon-btn .topbar-item {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        }
        .kz-icon-btn .nav-link, .kz-icon-btn .nav-icon {
          width: 100%; height: 100%; padding: 0 !important; margin: 0 !important;
          display: flex !important; align-items: center; justify-content: center;
          line-height: 1; border-radius: 50% !important; background: transparent !important;
        }
        .kz-icon-btn .nav-link i, .kz-icon-btn .nav-icon i { font-size: 22px; line-height: 1; }
        /* main notification bell: white circle, dark icon */
        .kz-icon-btn.kz-bell { background: #ffffff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35); }
        .kz-icon-btn.kz-bell:hover { background: #f1f1f3; }
        .kz-icon-btn.kz-bell .nav-link, .kz-icon-btn.kz-bell .nav-link i { color: #111111 !important; }
        .kz-icon-btn .badge { font-size: 10px; padding: 3px 5px; }
        .kz-fs-btn:focus-visible { outline: 2px solid rgba(239, 68, 68, 0.8); outline-offset: 2px; }
        input::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }

        /* ---------- Desktop (kalin thibba widihatama) ---------- */
        .kz-topbar { padding: 4px 16px; }
        .kz-topbar-container { padding-left: 8px; padding-right: 8px; }
        .kz-topbar-nav {
          height: 100px;
          padding: 0 16px;
          border-radius: 0.5rem;
        }

        /* ---------- Tablet + Mobile: full width ---------- */
        @media (max-width: 991.98px) {
          .topbar.kz-topbar {
            padding: 0 !important;
            margin: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .kz-topbar-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .kz-topbar-nav {
            width: 100%;
            height: calc(64px + env(safe-area-inset-top));
            padding: env(safe-area-inset-top) 12px 0 !important;
            border-radius: 0 !important;
          }
          .kz-topbar-right { gap: 4px !important; }
          .kz-topbar-actions { padding-left: 6px !important; }
        }

        @media (max-width: 380px) {
          .kz-topbar-nav { padding-left: 8px !important; padding-right: 8px !important; }
          .kz-topbar-actions { border-left: 0 !important; padding-left: 0 !important; }
        }
      `}</style>
    </>
  );
};

export default TopNavigationBar;