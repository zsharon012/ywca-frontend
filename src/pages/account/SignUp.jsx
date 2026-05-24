import React, { useState, useEffect } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import GoogleButton from '@/common/components/atoms/GoogleButton';
import { Form, FormTitle } from '@/common/components/form/Form';
import { Input } from '@/common/components/form/Input';
import SubmitButton from '@/common/components/form/SubmitButton';
import { useUser } from '@/common/contexts/UserContext';
import { RedSpan } from '@/common/components/form/styles';

import { StyledPage } from './styles';

export default function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [signupToken, setSignupToken] = useState('');
  const { googleAuth } = useUser();

  const [formState, setFormState] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    username: '',
  });

  // Validate signup token on component mount
  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setError('No signup token provided. Please use a valid signup link.');
        setIsValidatingToken(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/signuplinks/validate/${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Invalid or expired signup token');
        }

        setSignupToken(token);
        setError('');
      } catch (err) {
        console.error('Token validation error:', err);
        setError(err.message || 'Invalid or expired signup token');
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const handleChangeFirstname = (e) => {
    setFormState({ ...formState, firstname: e.target.value });
    setError('');
  };

  const handleChangeLastname = (e) => {
    setFormState({ ...formState, lastname: e.target.value });
    setError('');
  };

  const handleChangeEmail = (e) => {
    setFormState({ ...formState, email: e.target.value });
    setError('');
  };

  const handleChangePassword = (e) => {
    setFormState({ ...formState, password: e.target.value });
    setError('');
  };

  const handleChangeUsername = (e) => {
    setFormState({ ...formState, username: e.target.value });
    setError('');
  };

  const handleGoogleSignup = async () => {
    try {
      await googleAuth();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formState.email,
            password: formState.password,
            username: formState.username || undefined,
            firstname: formState.firstname || undefined,
            lastname: formState.lastname || undefined,
            signupToken: signupToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }
      navigate('/login', {
        state: {
          message:
            'Account created successfully! Please check your email to verify your account.',
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidatingToken) {
    return (
      <StyledPage>
        <Form>
          <FormTitle>Validating signup link...</FormTitle>
        </Form>
      </StyledPage>
    );
  }

  return (
    <StyledPage>
      <Form onSubmit={handleSubmit}>
        <FormTitle>Create an account</FormTitle>
        {error && <RedSpan>{error}</RedSpan>}
        {signupToken && !error && (
          <div style={{ color: 'green', marginBottom: '10px', fontSize: '14px' }}>
            ✓ Signup link verified. You can now create your account.
          </div>
        )}
        <Input.Text
          title='First name'
          placeholder='John'
          value={formState.firstname}
          onChange={handleChangeFirstname}
          disabled={!signupToken || !!error}
        />
        <Input.Text
          title='Last name'
          placeholder='Smith'
          value={formState.lastname}
          onChange={handleChangeLastname}
          disabled={!signupToken || !!error}
        />
        <Input.Text
          title='Email'
          placeholder='j@example.com'
          value={formState.email}
          onChange={handleChangeEmail}
          required
          disabled={!signupToken || !!error}
        />
        <Input.Text
          title='Username'
          placeholder='johnsmith'
          value={formState.username}
          onChange={handleChangeUsername}
          disabled={!signupToken || !!error}
        />
        <Input.Password
          title='Password'
          value={formState.password}
          onChange={handleChangePassword}
          required
          disabled={!signupToken || !!error}
        />
        <SubmitButton onClick={() => {}} disabled={isLoading || !signupToken || !!error}>
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </SubmitButton>
        <GoogleButton
          onClick={handleGoogleSignup}
          isLoading={isLoading || !signupToken || !!error}
          text='Sign up with Google'
        />
      </Form>
    </StyledPage>
  );
}
