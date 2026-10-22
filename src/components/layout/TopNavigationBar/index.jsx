'use client';

import React, { useState } from 'react';
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
      <div className="topbar d-print-none sticky-top py-1 px-3">
        <div className="container-fluid px-2">
          <nav
            className={clsx(
              'topbar-custom d-flex justify-content-between align-items-center px-3 rounded-3 transition-all duration-300',
              {
                'shadow-lg': scrollY >= 50,
              }
            )}
            id="topbar-custom"
            style={{
              height: '100px',
              /* Bold Red to Deep Black Gradient */
              background: 'linear-gradient(135deg, #8B0000 0%, #3B0000 40%, #0B0B0B 100%)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: scrollY >= 50
                ? '0 8px 20px rgba(139, 0, 0, 0.3)'
                : '0 4px 12px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Left Section */}
            <div className="d-flex align-items-center gap-2">
              <div className="p-1 rounded hover-red-bg cursor-pointer d-flex align-items-center">
                <LeftSideBarToggle />
              </div>
              <div className="welcome-text d-none d-md-block ms-1">
                <span className="text-white-50 fs-12">Welcome, </span>
                <span className="text-white fs-13 fw-bold">Dashboard</span>
              </div>
            </div>

            {/* Right Section */}
            <div className="d-flex align-items-center gap-2">
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
              <div className="d-flex align-items-center gap-1 ps-2 border-start border-white-20">
                <div className="p-1 rounded-circle hover-red-bg d-flex align-items-center">
                  <ThemeModeToggle />
                </div>
                <div className="p-1 rounded-circle hover-red-bg d-flex align-items-center">
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
        input::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }
      `}</style>
    </>
  );
};

export default TopNavigationBar;