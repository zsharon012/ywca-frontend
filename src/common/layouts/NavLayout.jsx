import { Outlet } from 'react-router-dom';

import styled from 'styled-components';

import NavBar from '@/common/components/navigation/NavBar';
import Footer from '@/common/components/navigation/Footer';

const Layout = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

export default function NavLayout() {
  return (
    <Layout>
      <NavBar />
      <Outlet />
      <Footer />
    </Layout>
  );
}
