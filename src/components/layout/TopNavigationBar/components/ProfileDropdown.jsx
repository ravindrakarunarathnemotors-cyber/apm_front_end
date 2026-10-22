

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import { Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import avatar1 from '@/assets/images/users/avatar-1.png';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useGetUserDetailsQuery } from "../../../../store/features/apiSlice";

const ProfileDropdown = () => {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [profileImage, setProfileImage] = useState(avatar1);

  // Read user ID from sessionStorage immediately
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserId = sessionStorage.getItem("user_id");
      if (storedUserId) {
        setUserId(storedUserId);
      }
    }
  }, []);

  // Fetch user details only when userId is available
  const { data: user, error, isLoading } = useGetUserDetailsQuery(userId, { skip: !userId });

  // Update profile image when user data is loaded
  useEffect(() => {
    if (user?.profile_image) {
      setProfileImage(user.profile_image);
    }
  }, [user]);

  const handleLogout = () => {
    // Clear sessionStorage and localStorage
    sessionStorage.clear();
    localStorage.clear();
    // Redirect to login page
    router.push('/auth/login');
  };

  // Show loading state
  if (isLoading) {
    return (
      <Dropdown className="topbar-item">
        <DropdownToggle className="nav-link arrow-none nav-icon" role="button">
          <Image src={avatar1} alt="user" className="thumb-lg rounded-circle" />
        </DropdownToggle>
      </Dropdown>
    );
  }

  // Handle error state
  if (error) {
    console.error('Error fetching user details:', error);
  }

  return (
    <Dropdown className="topbar-item">
      <DropdownToggle className="nav-link arrow-none nav-icon" role="button" aria-haspopup="false" aria-expanded="false">
        <Image 
          src={profileImage || avatar1} 
          alt="user" 
          className="thumb-lg rounded-circle" 
          width={40}
          height={40}
          style={{ objectFit: 'cover' }}
        />
      </DropdownToggle>
      <DropdownMenu align={'end'} className="py-0">
        <div className="d-flex align-items-center dropdown-item py-2 bg-secondary-subtle">
          <div className="flex-shrink-0">
            <Image 
              src={profileImage || avatar1} 
              alt="avatar" 
              className="thumb-md rounded-circle" 
              width={32}
              height={32}
              style={{ objectFit: 'cover' }}
            />
          </div>
          <div className="flex-grow-1 ms-2 text-truncate align-self-center">
            <h6 className="my-0 fw-medium text-dark fs-13">{user?.first_name} {user?.last_name}</h6>
            <small className="text-muted mb-0">{user?.role_name || 'User'}</small>
          </div>
        </div>
        <DropdownDivider className="mt-0" />
        <small className="text-muted px-2 pb-1 d-block">Account</small>
        <DropdownItem href="/profile">
          <IconifyIcon icon="la:user" className="fs-18 me-1 align-text-bottom" /> Profile
        </DropdownItem>
        <small className="text-muted px-2 py-1 d-block">Settings</small>
        <DropdownDivider className="mb-0" />
        <DropdownItem className="text-danger" onClick={handleLogout}>
          <IconifyIcon icon="la:power-off" className="fs-18 me-1 align-text-bottom" /> Logout
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

export default ProfileDropdown;