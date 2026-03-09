import React, { useState } from 'react';


import { Form, FormTitle } from '@/common/components/form/Form';
import { Input } from '@/common/components/form/Input';
import SubmitButton from '@/common/components/form/SubmitButton';
import { RedSpan } from '@/common/components/form/styles';

import { StyledPage } from './styles';

export default function  GenerateUrl() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setInviteLink('');
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/signupLinks`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invite link');
      }
      setInviteLink(data.inviteLink);
    } catch (error) {
      setError(error.message || "Failed to fet?");
    }
    finally {
        setIsLoading(false);
    }
  };


  return (
    <StyledPage>
      <Form>
        <FormTitle>Generate Invite URL</FormTitle>
        {error && <RedSpan>{error}</RedSpan>}
        <SubmitButton onClick={handleGenerate} disabled={isLoading}>
          {isLoading ? 'Generating invite link...' : 'Generate Invite Link'}
        </SubmitButton>
        {inviteLink && <p>{inviteLink}</p>}
      </Form>
    </StyledPage>
  );
}
