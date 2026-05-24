import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import styled from 'styled-components';

import { Button } from '@/common/components/atoms/Button';
import { useUser } from '@/common/contexts/UserContext';
import logo from '@/assets/logo.png';
import { Icon } from '@/assets/icons/icons';

import LogoutModal from './LogoutModal';

const StyledNav = styled.nav`
  display: flex;
  gap: 10px;
  padding: 10px 20px;
  font-size: 20px;
  font-family: 'Avenir', sans-serif;
`;

const LeftAligned = styled.div`
  flex: 1;
  display: flex;
  gap: 10px;
`;

const RightAligned = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const LogoImage = styled.img`
  height: 60px;
  cursor: pointer;
  object-fit: contain;
`;

const NavLink = styled.button`
  background: none;
  border: none;
  color: inherit;
  font-size: 16px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
  text-decoration: ${({ $isActive }) => $isActive ? 'underline' : 'none'};
  text-underline-offset: 5px;
  font-weight: ${({ $isActive }) => $isActive ? 'bold' : 'normal'};

  &:hover {
    background-color: #f0f0f0;
  }
`;

const IconButton = styled.button`
  background: none;
  border: none;
  padding: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background-color: #f0f0f0;
  }
`;

export default function NavBar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();

  const handleLogoutClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      setIsModalOpen(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <StyledNav>
      <LeftAligned>
        <LogoImage
          src={logo}
          alt="YWCA Logo"
          onClick={() => navigate('/')}
        />
        {user && (
          <>
            <NavLink
              $isActive={location.pathname === '/dashboard'}
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </NavLink>
            <NavLink
              $isActive={location.pathname === '/scheduledsends'}
              onClick={() => navigate('/scheduledsends')}
            >
              Scheduled Sends
            </NavLink>
            <NavLink
              $isActive={location.pathname === '/templates'}
              onClick={() => navigate('/templates')}
            >
              Templates
            </NavLink>
            <NavLink
              $isActive={location.pathname === '/contacts'}
              onClick={() => navigate('/contacts')}
            >
              Contacts
            </NavLink>
            <NavLink
              $isActive={location.pathname === '/ImageGallery'}
              onClick={() => navigate('/ImageGallery')}
            >
              Image Gallery
            </NavLink>
          </>
        )}
      </LeftAligned>
      {user ? (
        <RightAligned>
          <IconButton
            aria-label="Create Sign Up Link"
            title="Create Sign Up Link"
            onClick={() => navigate('/signuplinks')}
          >
            <Icon.link />
          </IconButton>
          <Button.Secondary onClick={handleLogoutClick}>Log Out</Button.Secondary>
        </RightAligned>
      ) : (
        <>
          
          <Button.Primary onClick={() => navigate('/login')}>
            Login
          </Button.Primary>
        </>
      )}
      {user && (
      <NavLink
              $isActive={location.pathname === '/signuplinks'}
              onClick={() => navigate('/signuplinks')}
            >
              Create Sign Up Link
      </NavLink>
      )}
      <LogoutModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onLogout={handleLogoutConfirm}
      />
    </StyledNav>
  );
}
