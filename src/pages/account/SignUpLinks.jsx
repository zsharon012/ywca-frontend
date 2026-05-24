import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { getAuth } from 'firebase/auth';

import { 
  StyledForm, StyledPage, Header, SubHeader, LinkContainer, LinkText, CopyButton, GenerateButton, ExpiryNote, WarningNote,
  LinkWrapper, CopiedToast
} from './styles';

export default function SignUpLinks() {
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const getLink = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      // Calculate expiry date (24 hours from now)
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/signuplinks/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            expiryDate: expiryDate.toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate signup link');
      }

      const data = await response.json();
      const signupToken = data.data.signupToken;
      const link = `${import.meta.env.VITE_FRONTEND_URL}/signup?token=${signupToken}`;
      
      setInviteLink(link);
      setCopied(false);
      setSuccessMessage('Signup link generated successfully!');
      
    } catch (error) {
      console.error('Generate link error:', error);
      setError(error.message || 'Unable to generate invite link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (e) => {
    e.preventDefault();
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setSuccessMessage('Link copied to clipboard!');
    setTimeout(() => {
      setCopied(false);
      setSuccessMessage('');
    }, 2000);
  };

  return (
    <StyledPage>
      <StyledForm>
        <Header>Generate Sign Up Link</Header>
        <SubHeader>Use this page to generate a sign up link for a new user to create an account.</SubHeader>
        
        {error && (
          <div style={{ 
            color: '#d32f2f', 
            marginBottom: '15px', 
            padding: '10px', 
            backgroundColor: '#ffebee',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        
        {successMessage && (
          <div style={{ 
            color: '#388e3c', 
            marginBottom: '15px', 
            padding: '10px', 
            backgroundColor: '#e8f5e9',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {successMessage}
          </div>
        )}
        
        <LinkWrapper>
          <LinkContainer>
            <LinkText>{inviteLink || 'HTTPS://YWCA/SAMPLELINKTOSIGNUPPAGE'}</LinkText>
            <CopyButton 
              $copied={copied} 
              onClick={handleCopy}
              disabled={!inviteLink}
            >
              <Copy size={18}/>
            </CopyButton>
            <GenerateButton 
              onClick={getLink}
              disabled={isLoading}
            >
              {isLoading ? 'GENERATING...' : 'GENERATE LINK'}
            </GenerateButton>
          </LinkContainer>
          <ExpiryNote>
            *THIS LINK WILL EXPIRE IN 24 HOURS
          </ExpiryNote>
          <CopiedToast $show={copied}>{copied ? 'Copied!' : ''}</CopiedToast>
        </LinkWrapper>
      </StyledForm>
      <WarningNote>
        WARNING: Make sure that this link is not shared with anyone you do not trust, it will allow them to create an account and use the dashboard
      </WarningNote>
    </StyledPage>
  );
}
