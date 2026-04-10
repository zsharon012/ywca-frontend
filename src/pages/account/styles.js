import styled from 'styled-components';

import { Button } from '@/common/components/atoms/Button';

export const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 1000px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 20px;
  margin-top: 40px;
  align-items: center;
  box-sizing: border-box;
`;

export const StyledPage = styled.div`
  flex: 1 0 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

export const StyledButton = styled(Button.Primary)`
  font-size: 1.1rem;
  width: content;
  padding-left: 30px;
  padding-right: 30px;
  margin-left: auto;
  margin-right: auto;
`;

export const Header = styled.h1`
  font-size: 58px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 8px;
`;

export const SubHeader = styled.p`
  font-weight: 400;
  font-size: 18px;
  line-height: 150%;
  text-align: center;
  max-width: 500px;
  width: 100%;
  margin: 0 auto 24px auto;
`;

export const LinkWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 600px;
`;

export const LinkContainer = styled.div`
  display: flex;
  align-items: center;
  border-radius: 8px;
  width: 100%;
  box-sizing: border-box;
`;

export const LinkText = styled.div`
  flex: 1;
  background-color: #d9d9d9;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #333;
`;

export const CopyButton = styled.button`
  background-color: #f5f5f5;
  border: none;
  padding: 0 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  transition: background-color 0.2s;
  &:hover {
    filter: brightness(0.9);
  }
`;

export const CopiedToast = styled.div`
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  opacity: ${({ $show }) => $show ? 1 : 0};
  transition: opacity 0.3s ease;
  pointer-events: none;
`;

export const GenerateButton = styled.button`
  background-color: #e8611a;
  color: white;
  border: none;
  padding: 14px 24px;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.05em;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background-color: #d05510;
  }
`;

export const ExpiryNote = styled.p`
  font-size: 11px;
  font-weight: 400;
  color: #333;
  text-align: left;
  width: 100%;
  margin-top: 6px;
`;

export const WarningNote = styled.p`
  font-size: 12px;
  font-style: italic;
  text-align: center;
  margin-top: 40px;
`;