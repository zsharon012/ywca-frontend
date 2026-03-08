import styled from 'styled-components';
// import { useNavigate } from 'react-router-dom';

const StyledFooter = styled.footer`
  display: flex;
  justify-content: space-between;
  align-items: left;
  padding: 20px 40px;
  background-color: #f8f8f8;
  border-top: 1px solid #e0e0e0;
  margin-top: auto;
  gap: 20px;
`;

const FooterSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
`;

const FooterTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: #333;
`;

const FooterText = styled.div`
  font-size: 12px;
  color: #999;
  align-items: flex-start;
`;

const ColoredFooterText = styled(FooterText)`
    color: #FA4616;
`;

const Copyright = styled.div`
  font-size: 12px;
  color: #999;
  margin-left: auto;
`;

export default function Footer() {
  // const navigate = useNavigate();

  return (
    <StyledFooter>
      <FooterSection>
        <FooterText> 1215 Church Street, Evanston, IL 60201 </FooterText>
        <FooterText> (847) 864-8445 </FooterText>
        <ColoredFooterText> info@ywca-ens.org </ColoredFooterText>
      </FooterSection>

      <Copyright>
        © {new Date().getFullYear()} YWCA Evansont/North Shore, All Rights Reserved.
      </Copyright>
      <Copyright>
        Established in 1931. Registered 501(c)(3). EIN: 36-2193618
      </Copyright>
    </StyledFooter>
  );
}
