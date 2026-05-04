import React, { useState } from 'react';


//import { Form, FormTitle } from '@/common/components/form/Form';
import { Copy } from 'lucide-react'


import { 
  StyledForm, StyledPage, Header, SubHeader, LinkContainer, LinkText, CopyButton, GenerateButton, ExpiryNote, WarningNote,
  LinkWrapper, CopiedToast
} from './styles';

export default function  SignUpLinks() {
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(true)

  const getLink = async (e) => {
    console.log('clicked');
    e.preventDefault();
    try {
      const token = Math.random().toString(36).substring(2,10);

      // TODO: add token to signuplinks database
      const link = `${import.meta.env.VITE_FRONTEND_URL}/signup?token=${token}`;
      setInviteLink(link)
      setCopied(false)

    } catch (error) {
      setError(error.message || "Unable to generate invite link");
    }
  };

    const handleCopy = (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };


  return (
    <StyledPage>
      <StyledForm>
        <Header>Generate Sign Up Link</Header>
        <SubHeader>Use this page to generate a sign up link for a new user to create an account.</SubHeader>
        <LinkWrapper>
          <LinkContainer>
            <LinkText>{inviteLink || 'HTTPS://YWCA/SAMPLELINKTOSIGNUPPAGE'}</LinkText>
              <CopyButton $copied={copied} onClick={handleCopy}>
                <Copy size={18}/>
              </CopyButton>
            <GenerateButton onClick={getLink}>GENERATE LINK</GenerateButton>
          </LinkContainer>
                    <ExpiryNote>
            *THIS LINK WILL EXPIRE IN 24 HOURS
          </ExpiryNote>
          <CopiedToast $show={copied}>Copied!</CopiedToast>
        </LinkWrapper>
      </StyledForm>
      <WarningNote>
        WARNING: Make sure that this link is not shared with anyone you do not trust, it will allow them to create an account and use the dashboard
      </WarningNote>
    </StyledPage>
  );
}
