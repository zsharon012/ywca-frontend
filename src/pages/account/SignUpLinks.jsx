import React, { useState } from 'react';


import { Form, FormTitle } from '@/common/components/form/Form';
import { Input } from '@/common/components/form/Input';
import SubmitButton from '@/common/components/form/SubmitButton';
import { RedSpan } from '@/common/components/form/styles';
import { Button } from '@/components/ui/button';


import { StyledPage } from './styles';

export default function  SignUpLinks() {
  const [error, setError] = useState('');
  // const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false)

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
  };


  return (
    <StyledPage>
      <Form>
        <FormTitle>Generate Sign Up Link</FormTitle>
        {error && <RedSpan>{error}</RedSpan>}
        <Button type='button' variant='outline' onClick={getLink}>
          Generate
        </Button>
        {inviteLink && (
            <div>
            <p>{inviteLink}</p>
            <Button type='button' variant='outline' onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        )}
      </Form>
    </StyledPage>
  );
}
