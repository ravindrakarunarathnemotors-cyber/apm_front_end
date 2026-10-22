// src/app/(other)/auth/login/useSignIn.js
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNotificationContext } from '@/context/useNotificationContext';
import useQueryParams from '@/hooks/useQueryParams';
import { useLoginMutation } from '@/store/features/apiSlice';

const useSignIn = () => {
  const [loading, setLoading] = useState(false);
  const { push } = useRouter();
  const { showNotification } = useNotificationContext();
  const queryParams = useQueryParams();
  
  const [loginMutation] = useLoginMutation();

  const loginFormSchema = yup.object({
    email: yup.string().required('Please enter your email'),
    password: yup.string().required('Please enter your password')
  });

  const { control, handleSubmit } = useForm({
    resolver: yupResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const login = handleSubmit(async (values) => {
    setLoading(true);

    try {
      const result = await loginMutation({
        email: values.email,
        password: values.password
      }).unwrap();

      // Store non-sensitive user data (tokens are in HttpOnly cookies)
      if (result.user_id) {
        sessionStorage.setItem("user_id", result.user_id);
        sessionStorage.setItem("role_id", result.role_id);
        sessionStorage.setItem("branch_id", result.branch_id);

        if (result.user_id) sessionStorage.setItem("user_id", result.user_id);
        if (result.branch_id) sessionStorage.setItem("hub_id", result.branch_id);
        if (result.hacc) sessionStorage.setItem("hacc", result.hacc);
      }

      // Redirect
      const redirectPath = queryParams["redirectTo"] ?? "/welcome_to_client";
      push(redirectPath);

      showNotification({
        message: "Successfully logged in. Redirecting....",
        variant: "success"
      });

    } catch (error) {
      console.error('Login error:', error);
      showNotification({
        message: error?.data?.message || error.message || "Login failed",
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  });

  return {
    loading,
    login,
    control
  };
};

export default useSignIn;